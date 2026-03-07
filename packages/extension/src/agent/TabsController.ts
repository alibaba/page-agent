const PREFIX = '[TabsController]'

function debug(...messages: unknown[]): void {
	console.debug(`\x1b[90m${PREFIX}\x1b[0m`, ...messages)
}

interface TabControlMessage {
	type: 'TAB_CONTROL'
	action: TabAction
	payload?: unknown
}

interface TabControlResponse {
	success?: boolean
	tabId?: number | null
	windowId?: number
	error?: string
	url?: string
	title?: string
	status?: string
	tab?: chrome.tabs.Tab
}

function sendMessage(message: TabControlMessage): Promise<TabControlResponse | null> {
	return chrome.runtime.sendMessage(message).catch((error: unknown) => {
		console.error(PREFIX, message.action, error)
		return null
	})
}

/**
 * Controller for managing browser tabs.
 * - live in the agent env (extension page or content script)
 * - no chrome apis. call sw for tab operations
 */
export class TabsController extends EventTarget {
	currentTabId: number | null = null

	private tabs: TabMeta[] = []
	private initialTabId: number | null = null
	private tabGroupId: number | null = null
	private task: string = ''
	private windowId: number | null = null

	async init(task: string, includeInitialTab: boolean = true) {
		debug('init', task, includeInitialTab)

		this.task = task
		this.tabs = []
		this.currentTabId = null
		this.tabGroupId = null
		this.initialTabId = null
		this.windowId = null

		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'get_active_tab',
		})

		this.initialTabId = result.tabId

		if (!this.initialTabId) {
			throw new Error('Failed to get initial tab ID')
		}

		if (includeInitialTab) {
			this.currentTabId = this.initialTabId

			// update tab status immediately
			const info = await sendMessage({
				type: 'TAB_CONTROL',
				action: 'get_tab_info',
				payload: { tabId: this.initialTabId },
			})

			this.tabs.push({
				id: result.tabId,
				isInitial: true,
				url: info.url,
				title: info.title,
				status: info.status,
			})
		}

		await this.updateCurrentTabId(this.currentTabId)

		const tabChangeHandler = (message: unknown): void => {
			if (typeof message !== 'object' || message === null || !('type' in message)) {
				return
			}

			const msg = message as { type: string; action?: string; payload?: unknown }
			if (msg.type !== 'TAB_CHANGE') {
				// throw new Error(`[TabsController]: Invalid message type: ${msg.type}`)
				return
			}

			const action = msg.action
			const payload = msg.payload as Record<string, unknown> | undefined

			if (action === 'created') {
				const tab = (payload?.tab as chrome.tabs.Tab) || null
				if (tab && tab.groupId === this.tabGroupId && tab.id != null) {
					// Tab created in our controlled group
					if (!this.tabs.find((t) => t.id === tab.id)) {
						this.tabs.push({ id: tab.id, isInitial: false })
					}
					this.switchToTab(tab.id)
				}
			} else if (action === 'removed') {
				const tabId = (payload?.tabId as number) || null
				if (tabId) {
					const targetTab = this.tabs.find((t) => t.id === tabId)
					if (targetTab) {
						this.tabs = this.tabs.filter((t) => t.id !== tabId)
						if (this.currentTabId === tabId) {
							const newCurrentTab = this.tabs[this.tabs.length - 1] || null
							if (newCurrentTab) {
								this.switchToTab(newCurrentTab.id)
							} else {
								this.updateCurrentTabId(null)
							}
						}
					}
				}
			} else if (action === 'updated') {
				const tabId = (payload?.tabId as number) || null
				const tab = (payload?.tab as chrome.tabs.Tab) || null
				if (tabId && tab) {
					const targetTab = this.tabs.find((t) => t.id === tabId)
					if (targetTab) {
						targetTab.url = tab.url
						targetTab.title = tab.title
						targetTab.status = tab.status as 'loading' | 'unloaded' | 'complete'
					}
				}
			}
		}

		chrome.runtime.onMessage.addListener(tabChangeHandler)

		this.addEventListener('dispose', () => {
			chrome.runtime.onMessage.removeListener(tabChangeHandler)
		})
	}

	async openNewTab(url: string): Promise<string> {
		debug('openNewTab', url)

		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'open_new_tab',
			payload: { url },
		})

		if (!result.success) {
			throw new Error(`Failed to open new tab: ${result.error}`)
		}

		const tabId = result.tabId as number
		const windowId = result.windowId as number

		this.windowId = windowId

		this.tabs.push({
			id: tabId,
			isInitial: false,
		})

		await this.switchToTab(tabId)

		if (!this.tabGroupId) {
			const result = await sendMessage({
				type: 'TAB_CONTROL',
				action: 'create_tab_group',
				payload: { tabIds: [tabId], windowId: this.windowId },
			})

			if (!result.success) {
				throw new Error(`Failed to create tab group: ${result.error}`)
			}

			const groupId = result.groupId as number

			this.tabGroupId = groupId

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

		if (tab.status === 'unloaded') throw new Error(`Tab ID ${tabId} is unloaded.`)
		if (tab.status === 'complete') return

		debug('waitUntilTabLoaded', tabId)
		await waitUntil(() => tab.status === 'complete', 4_000)
	}

	dispose() {
		this.dispatchEvent(new Event('dispose'))
	}
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

interface TabMeta {
	id: number
	isInitial: boolean
	url?: string
	title?: string
	status?: 'loading' | 'unloaded' | 'complete'
}

const TAB_GROUP_COLORS = [
	'grey',
	'blue',
	'red',
	'yellow',
	'green',
	'pink',
	'purple',
	'cyan',
] as const

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
