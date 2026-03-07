import type { BrowserState } from '@page-agent/page-controller'

import type { TabsController } from './TabsController'

const PREFIX = '[RemotePageController]'

interface DomActionReturn {
	success: boolean
	message: string
}

function debug(...messages: unknown[]): void {
	console.debug(`\x1b[90m${PREFIX}\x1b[0m`, ...messages)
}

function sendMessage(message: {
	type: 'PAGE_CONTROL'
	action: string
	targetTabId: number
	payload?: unknown
}): Promise<DomActionReturn | null> {
	return chrome.runtime.sendMessage(message).catch((error: unknown) => {
		console.error(PREFIX, message.action, error)
		return null
	})
}

/**
 * Agent side page controller.
 * - live in the agent env (extension page or content script)
 * - communicates with remote PageController via sw
 */
export class RemotePageController {
	tabsController: TabsController

	constructor(tabsController: TabsController) {
		this.tabsController = tabsController
	}

	get currentTabId(): number | null {
		return this.tabsController.currentTabId
	}

	private async getCurrentUrl(): Promise<string> {
		if (!this.currentTabId) return ''
		const { url } = await this.tabsController.getTabInfo(this.currentTabId)
		return url || ''
	}

	private async getCurrentTitle(): Promise<string> {
		if (!this.currentTabId) return ''
		const { title } = await this.tabsController.getTabInfo(this.currentTabId)
		return title || ''
	}

	async getLastUpdateTime(): Promise<number> {
		if (!this.currentTabId) throw new Error('tabsController not initialized.')
		return sendMessage({
			type: 'PAGE_CONTROL',
			action: 'get_last_update_time',
			targetTabId: this.currentTabId,
		})
	}

	async getBrowserState(): Promise<BrowserState> {
		if (!this.currentTabId) throw new Error('tabsController not initialized.')

		let browserState = {} as BrowserState
		debug('getBrowserState', this.currentTabId)

		const currentUrl = await this.getCurrentUrl()
		const currentTitle = await this.getCurrentTitle()

		if (!this.currentTabId || !isContentScriptAllowed(currentUrl)) {
			browserState = {
				url: currentUrl,
				title: currentTitle,
				header: '',
				content: '(empty page. either current page is not readable or not loaded yet.)',
				footer: '',
			}
		} else {
			browserState = await sendMessage({
				type: 'PAGE_CONTROL',
				action: 'get_browser_state',
				targetTabId: this.currentTabId,
			})
		}

		const sum = await this.tabsController.summarizeTabs()
		browserState.header = sum + '\n\n' + (browserState.header || '')

		debug('getBrowserState: success', this.currentTabId, browserState)

		return browserState
	}

	async updateTree(): Promise<void> {
		if (!this.currentTabId || !isContentScriptAllowed(await this.getCurrentUrl())) {
			return
		}

		await sendMessage({
			type: 'PAGE_CONTROL',
			action: 'update_tree',
			targetTabId: this.currentTabId,
		})
	}

	async cleanUpHighlights(): Promise<void> {
		if (!this.currentTabId || !isContentScriptAllowed(await this.getCurrentUrl())) {
			return
		}

		await sendMessage({
			type: 'PAGE_CONTROL',
			action: 'clean_up_highlights',
			targetTabId: this.currentTabId,
		})
	}

	async clickElement(index: number): Promise<DomActionReturn> {
		const res = await this.remoteCallDomAction('click_element', [index])
		// @note may cause page navigation, wait for 1 second to ensure the page loading started
		await new Promise((resolve) => setTimeout(resolve, 1000))
		return res
	}

	async inputText(index: number, text: string): Promise<DomActionReturn> {
		return this.remoteCallDomAction('input_text', [index, text])
	}

	async selectOption(index: number, optionText: string): Promise<DomActionReturn> {
		return this.remoteCallDomAction('select_option', [index, optionText])
	}

	async scroll(options: {
		down: boolean
		numPages: number
		pixels?: number
		index?: number
	}): Promise<DomActionReturn> {
		return this.remoteCallDomAction('scroll', [options])
	}

	async scrollHorizontally(options: {
		right: boolean
		pixels: number
		index?: number
	}): Promise<DomActionReturn> {
		return this.remoteCallDomAction('scroll_horizontally', [options])
	}

	async executeJavascript(script: string): Promise<DomActionReturn> {
		return this.remoteCallDomAction('execute_javascript', [script])
	}

	/** @note Managed by content script via storage polling. */
	async showMask(): Promise<void> {}
	/** @note Managed by content script via storage polling. */
	async hideMask(): Promise<void> {}
	/** @note Managed by content script via storage polling. */
	dispose(): void {}

	private async remoteCallDomAction(
		action: string,
		payload: unknown[]
	): Promise<DomActionReturn> {
		if (!this.currentTabId) {
			return { success: false, message: 'RemotePageController not initialized.' }
		}

		if (!isContentScriptAllowed(await this.getCurrentUrl())) {
			return {
				success: false,
				message:
					'Operation not allowed on this page. Use open_new_tab to navigate to a web page first.',
			}
		}

		const response = await sendMessage({
			type: 'PAGE_CONTROL',
			action: action,
			targetTabId: this.currentTabId,
			payload,
		})

		if (!response) {
			return { success: false, message: 'No response from content script' }
		}

		return response
	}

/**
 * Check if a URL can run content scripts.
 */
function isContentScriptAllowed(url: string | undefined): boolean {
	if (!url) return false

	const restrictedPatterns = [
		/^chrome:\/\//,
		/^chrome-extension:\/\//,
		/^about:/,
		/^edge:\/\//,
		/^brave:\/\//,
		/^opera:\/\//,
		/^vivaldi:\/\//,
		/^file:\/\//,
		/^view-source:/,
		/^devtools:\/\//,
	]

	return !restrictedPatterns.some((pattern) => pattern.test(url))
}
