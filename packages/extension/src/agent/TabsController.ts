import { isContentScriptAllowed } from './RemotePageController'

const PREFIX = '[TabsController]'

const debug = console.debug.bind(console, `\x1b[90m${PREFIX}\x1b[0m`)

function sendMessage(message: {
	type: 'TAB_CONTROL'
	action: TabAction
	payload?: any
}): Promise<any> {
	return chrome.runtime.sendMessage(message).catch((error) => {
		console.error(PREFIX, message.action, error)
		return null
	})
}

/**
 * Resolve the window hosting this script's own context, when knowable.
 *
 * Extension pages (side panel, hub tab) have `chrome.windows` access and can
 * identify their own window directly via `getCurrent()`.
 * Content scripts have no `chrome.windows` access; they resolve `undefined`
 * here and the background script falls back to `sender.tab` instead.
 */
async function getOwnWindowId(): Promise<number | undefined> {
	if (typeof chrome.windows === 'undefined') return undefined
	const win = await chrome.windows.getCurrent()
	return win.id
}

/**
 * Controller for managing browser tabs.
 * - live in the agent env (extension page or content script)
 * - no chrome apis. call sw for tab operations
 * - store tabs states, pull tabs info and detect changes
 */
export class TabsController {
	currentTabId: number | null = null

	private disposed = false

	private windowId: number | null = null
	private tabs: TabMeta[] = []
	private initialTabId: number | null = null
	private tabGroupId: number | null = null
	private experimentalIncludeAllTabs = false
	private task: string = ''

	async init(task: string, options: TabsInitOptions = {}) {
		const { includeInitialTab = true, experimentalIncludeAllTabs = false } = options
		debug('init', task, options)

		if (this.disposed) {
			throw new Error('TabsController already disposed')
		}

		await this.updateCurrentTabId(null)

		this.windowId = null
		this.tabs = []
		this.tabGroupId = null
		this.initialTabId = null
		this.experimentalIncludeAllTabs = experimentalIncludeAllTabs
		this.task = task

		const activeTabResult = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'get_active_tab',
			payload: { windowId: await getOwnWindowId() },
		})

		this.initialTabId = activeTabResult.tab?.id
		this.windowId = activeTabResult.tab?.windowId

		if (!this.initialTabId || !this.windowId) {
			if (activeTabResult.error) {
				throw new Error(activeTabResult.error)
			} else {
				throw new Error('Failed to get active tab')
			}
		}

		if (experimentalIncludeAllTabs) {
			const allTabs = await sendMessage({
				type: 'TAB_CONTROL',
				action: 'get_window_tabs',
				payload: { windowId: this.windowId },
			})
			for (const tab of allTabs.tabs as chrome.tabs.Tab[]) {
				if (tab.id && !tab.pinned && isContentScriptAllowed(tab.url)) {
					this.addTab({
						id: tab.id,
						isInitial: tab.id === this.initialTabId,
						url: tab.url,
						title: tab.title,
						status: tab.status,
					})
				}
			}
			if (this.tabs.find((t) => t.id === this.initialTabId)) {
				this.currentTabId = this.initialTabId
				await this.createTabGroup([this.initialTabId])
			}
		} else if (includeInitialTab) {
			const info = await sendMessage({
				type: 'TAB_CONTROL',
				action: 'get_tab_info',
				payload: { tabId: this.initialTabId },
			})

			if (isContentScriptAllowed(info.url) && !info.pinned) {
				this.currentTabId = this.initialTabId

				this.addTab({
					id: this.initialTabId,
					isInitial: true,
					url: info.url,
					title: info.title,
					status: info.status,
				})

				await this.createTabGroup([this.initialTabId])
			}
		}

		await this.updateCurrentTabId(this.currentTabId)
	}

	async openNewTab(url: string): Promise<string> {
		debug('openNewTab', url)

		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'open_new_tab',
			payload: { url, windowId: this.windowId },
		})

		if (!result.success) {
			throw new Error(`Failed to open new tab: ${result.error}`)
		}

		const tabId = result.tabId as number

		this.addTab({
			id: tabId,
			isInitial: false,
		})

		await this.switchToTab(tabId)

		if (!this.tabGroupId) {
			await this.createTabGroup([tabId])
		} else {
			await sendMessage({
				type: 'TAB_CONTROL',
				action: 'add_tab_to_group',
				payload: { tabId: result.tabId, groupId: this.tabGroupId },
			})
		}

		await this.waitUntilTabLoaded(tabId)

		return `✅ Opened new tab ID ${tabId} with URL ${url}`
	}

	async switchToTab(tabId: number): Promise<string> {
		debug('switchToTab', tabId)

		const targetTab = this.tabs.find((t) => t.id === tabId)
		if (!targetTab) {
			throw new Error(`Tab ID ${tabId} not found in tab list.`)
		}

		await this.updateCurrentTabId(tabId)

		return `✅ Switched to tab ID ${tabId}.`
	}

	async closeTab(tabId: number): Promise<string> {
		debug('closeTab', tabId)

		const targetTab = this.tabs.find((t) => t.id === tabId)
		if (!targetTab) {
			throw new Error(`Tab ID ${tabId} not found in tab list.`)
		}
		if (targetTab.isInitial) {
			throw new Error(`Cannot close the initial tab ID ${tabId}.`)
		}

		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'close_tab',
			payload: { tabId },
		})

		if (result.success) {
			this.tabs = this.tabs.filter((t) => t.id !== tabId)
			if (this.currentTabId === tabId) {
				const newCurrentTab = this.tabs[this.tabs.length - 1] || null
				if (newCurrentTab) {
					await this.switchToTab(newCurrentTab.id)
				} else {
					await this.updateCurrentTabId(null)
				}
			}

			return `✅ Closed tab ID ${tabId}.`
		} else {
			throw new Error(`Failed to close tab ID ${tabId}: ${result.error}`)
		}
	}

	private async createTabGroup(tabIds: number[]) {
		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'create_tab_group',
			payload: { tabIds, windowId: this.windowId },
		})

		if (!result?.success) {
			throw new Error(`Failed to create tab group: ${result?.error}`)
		}

		this.tabGroupId = result.groupId as number

		await sendMessage({
			type: 'TAB_CONTROL',
			action: 'update_tab_group',
			payload: {
				groupId: this.tabGroupId,
				properties: {
					title: `PageAgent(${this.task})`,
					color: randomColor(),
					collapsed: false,
				},
			},
		})
	}

	private addTab(meta: TabMeta) {
		if (this.tabs.find((t) => t.id === meta.id)) return
		this.tabs.push(meta)
	}

	async updateCurrentTabId(tabId: number | null) {
		debug('updateCurrentTabId', tabId)

		this.currentTabId = tabId
		await chrome.storage.local.set({ currentTabId: tabId })
	}

	async getTabInfo(tabId: number): Promise<{ title: string; url: string }> {
		// use cached tab info if available
		const tabMeta = this.tabs.find((t) => t.id === tabId)
		if (tabMeta && tabMeta.url && tabMeta.title) {
			return { title: tabMeta.title, url: tabMeta.url }
		}

		// otherwise, pull the latest tab info from the background script
		debug('getTabInfo: pulling from background script', tabId)
		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'get_tab_info',
			payload: { tabId },
		})

		if (tabMeta) {
			tabMeta.url = result.url
			tabMeta.title = result.title
		}

		return result
	}

	async summarizeTabs(): Promise<string> {
		const summaries = [`| Tab ID | URL | Title | Current |`, `|-----|-----|-----|-----|`]
		for (const tab of this.tabs) {
			const { title, url } = await this.getTabInfo(tab.id)
			summaries.push(
				`| ${tab.id} | ${url} | ${title} | ${this.currentTabId === tab.id ? '✅' : ''} |`
			)
		}
		if (!this.tabs.length) {
			summaries.push('\nNo tabs available. Open a tab if needed.')
		}

		return summaries.join('\n')
	}

	async waitUntilTabLoaded(tabId: number): Promise<void> {
		const tab = this.tabs.find((t) => t.id === tabId)
		if (!tab) throw new Error(`Tab ID ${tabId} not found in tab list.`)
		if (tab.status === 'complete') return

		// When a tracked tab is closed or untracked.
		// The tab object will be removed from the tab list.
		// Finding the latest tab object is the only way to know if it's closed.

		debug('waitUntilTabLoaded', tabId)
		await waitUntil(async () => {
			await this.syncTabs()
			const latest = this.tabs.find((t) => t.id === tabId)
			return !latest || latest.status !== 'loading'
		}, 4_000)

		const latest = this.tabs.find((t) => t.id === tabId)
		if (latest?.status === 'unloaded') throw new Error(`Tab ID ${tabId} is unloaded.`)
	}

	/**
	 * Pull the window's tabs from the background.
	 * PUSHING IS BAD. Long-lived ports are stateful troublemakers.
	 */
	async syncTabs(): Promise<void> {
		if (this.disposed || this.windowId == null) return

		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'get_window_tabs',
			payload: { windowId: this.windowId },
		})
		// sendMessage already logged the failure; keep the stale mirror
		if (!result?.success) return

		const liveTabs = (result.tabs as chrome.tabs.Tab[]).filter((t) => t.id != null)
		const liveIds = new Set(liveTabs.map((t) => t.id!))

		const closedIds = this.tabs.filter((t) => !liveIds.has(t.id)).map((t) => t.id)
		if (closedIds.length) {
			debug('syncTabs: tabs closed', closedIds)
			this.tabs = this.tabs.filter((t) => liveIds.has(t.id))
		}

		const newTabs: TabMeta[] = []
		for (const live of liveTabs) {
			const tracked = this.tabs.find((t) => t.id === live.id)
			if (tracked) {
				tracked.url = live.url
				tracked.title = live.title
				tracked.status = live.status as TabMeta['status']
			} else if (this.shouldTrack(live)) {
				debug('syncTabs: new tab', live.id, live.url)
				const meta: TabMeta = {
					id: live.id!,
					isInitial: false,
					url: live.url,
					title: live.title,
					status: live.status,
				}
				this.addTab(meta)
				newTabs.push(meta)
			}
		}

		// Follow the page like a user would: focus the newest tab it opened.
		// If the current tab is gone, fall back to the last tracked one.
		if (newTabs.length) {
			await this.switchToTab(newTabs[newTabs.length - 1].id)
		} else if (this.currentTabId != null && !this.tabs.find((t) => t.id === this.currentTabId)) {
			const fallback = this.tabs[this.tabs.length - 1]
			if (fallback) {
				await this.switchToTab(fallback.id)
			} else {
				debug('syncTabs: no fallback tab found, updating current tab to null')
				await this.updateCurrentTabId(null)
			}
		}
	}

	private shouldTrack(tab: chrome.tabs.Tab): boolean {
		if (this.tabGroupId != null && tab.groupId === this.tabGroupId) return true
		return (
			this.experimentalIncludeAllTabs &&
			tab.windowId === this.windowId &&
			!tab.pinned &&
			isContentScriptAllowed(tab.url)
		)
	}

	dispose() {
		debug('dispose')
		this.disposed = true
	}
}

export interface TabsInitOptions {
	includeInitialTab?: boolean
	experimentalIncludeAllTabs?: boolean
}

export type TabAction =
	| 'get_active_tab'
	| 'get_tab_info'
	| 'open_new_tab'
	| 'create_tab_group'
	| 'update_tab_group'
	| 'add_tab_to_group'
	| 'close_tab'
	| 'get_tab_title'
	| 'get_window_tabs'

interface TabMeta {
	id: number
	isInitial: boolean
	url?: string
	title?: string
	status?: 'loading' | 'unloaded' | 'complete'
}

const TAB_GROUP_COLORS = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'] as const

type TabGroupColor = (typeof TAB_GROUP_COLORS)[number]

function randomColor(): TabGroupColor {
	return TAB_GROUP_COLORS[Math.floor(Math.random() * TAB_GROUP_COLORS.length)]
}

/**
 * Wait until condition becomes true
 * @returns Returns when condition becomes true, throws otherwise
 * @param timeoutMS Timeout in milliseconds, default 1 minutes, throws error on timeout
 * @param error Error object to reject on timeout. If not provided, will resolve with false
 */
export async function waitUntil(
	check: () => boolean | Promise<boolean>,
	timeoutMS = 60_000,
	error?: string
): Promise<boolean> {
	if (await check()) return true

	return new Promise((resolve, reject) => {
		const start = Date.now()
		const poll = async () => {
			if (await check()) return resolve(true)
			if (Date.now() - start > timeoutMS) {
				if (error) {
					return reject(new Error(error))
				} else {
					return resolve(false)
				}
			}
			setTimeout(poll, 100)
		}
		setTimeout(poll, 100)
	})
}
