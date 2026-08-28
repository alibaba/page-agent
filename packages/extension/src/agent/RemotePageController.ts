import type { BrowserState } from '@eb-agent/page-controller'

import type { TabsController } from './TabsController'

const PREFIX = '[RemotePageController]'

const debug = console.debug.bind(console, `\x1b[90m${PREFIX}\x1b[0m`)

function sendMessage(message: {
	type: 'PAGE_CONTROL'
	action: string
	targetTabId: number
	payload?: any
}): Promise<any> {
	return chrome.runtime.sendMessage(message).catch((error) => {
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
		const result = await sendMessage({
			type: 'PAGE_CONTROL',
			action: 'get_last_update_time',
			targetTabId: this.currentTabId,
		})
		// `sendMessage` resolves to null on a dropped connection (e.g. content script not
		// injected yet). Fall back to "now" so callers (e.g. the `wait` tool) treat it as
		// no time having elapsed and wait the full requested duration, rather than doing
		// `Date.now() - null` (coerces to 0) which silently turns `wait` into a no-op.
		return typeof result === 'number' ? result : Date.now()
	}

	async getBrowserState(): Promise<BrowserState> {
		let browserState: BrowserState | null
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
			// `sendMessage` resolves to null on a dropped connection instead of throwing
			// (e.g. "receiving end does not exist" right after a new tab is created, before
			// the content script has injected). Without this fallback the `browserState.header =`
			// write below would throw on null and crash the whole step — ending the entire task
			// over a transient, retryable timing issue instead of just this one observation.
			if (!browserState) {
				browserState = {
					url: currentUrl,
					title: currentTitle,
					header: '',
					content:
						'(failed to read page content — the page may still be loading. Wait a moment and try again.)',
					footer: '',
				}
			}
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

	async clickElement(...args: any[]): Promise<DomActionReturn> {
		const res = await this.remoteCallDomAction('click_element', args)
		// @note may cause page navigation, wait for 1 second to ensure the page loading started
		await new Promise((resolve) => setTimeout(resolve, 1000))
		return res
	}

	async inputText(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('input_text', args)
	}

	async selectOption(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('select_option', args)
	}

	async scroll(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('scroll', args)
	}

	async scrollHorizontally(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('scroll_horizontally', args)
	}

	async sendKeys(...args: any[]): Promise<DomActionReturn> {
		return this.remoteCallDomAction('send_keys', args)
	}

	// ======= WebMCP (via the main-world bridge) =======

	/**
	 * Whether the current tab's page exposes WebMCP.
	 *
	 * @remarks
	 * Answered by the main-world bridge, since `document.modelContext` is invisible
	 * from the isolated content-script world this extension's agent lives in.
	 */
	async webmcpStatus(): Promise<{ supported: boolean; canDiscover: boolean }> {
		if (!this.currentTabId || !isContentScriptAllowed(await this.getCurrentUrl())) {
			return { supported: false, canDiscover: false }
		}

		const result = await sendMessage({
			type: 'PAGE_CONTROL',
			action: 'webmcp_is_supported',
			targetTabId: this.currentTabId,
		})

		return {
			supported: Boolean(result?.supported),
			canDiscover: Boolean(result?.canDiscover),
		}
	}

	/** Tools the current page declared through WebMCP. */
	async webmcpGetTools(): Promise<any[]> {
		if (!this.currentTabId) return []

		const result = await sendMessage({
			type: 'PAGE_CONTROL',
			action: 'webmcp_get_tools',
			targetTabId: this.currentTabId,
		})

		return Array.isArray(result) ? result : []
	}

	/** Call one of the current page's declared tools. */
	async webmcpExecuteTool(name: string, args: unknown): Promise<{ content: string }> {
		if (!this.currentTabId) {
			throw new Error('RemotePageController not initialized.')
		}

		const result = await sendMessage({
			type: 'PAGE_CONTROL',
			action: 'webmcp_execute_tool',
			targetTabId: this.currentTabId,
			payload: [name, args],
		})

		if (!result) {
			throw new Error(
				'Failed to reach the page to run this tool (content script not ready). Retry in a moment.'
			)
		}

		if (!result.success) throw new Error(String(result.error ?? 'WebMCP tool call failed.'))

		return normalizeBridgeResult(result.result)
	}

	// `execute_javascript` is intentionally not implemented: AbortSignal cannot cross context

	/** @note Managed by content script via storage polling. */
	async showMask(): Promise<void> {}
	/** @note Managed by content script via storage polling. */
	async hideMask(): Promise<void> {}
	/** @note Managed by content script via storage polling. */
	dispose(): void {}

	private async remoteCallDomAction(action: string, payload: any[]): Promise<DomActionReturn> {
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

		const res = await sendMessage({
			type: 'PAGE_CONTROL',
			action: action,
			targetTabId: this.currentTabId!,
			payload,
		})
		// See getBrowserState() above: `sendMessage` resolves to null on a dropped connection
		// rather than throwing. Callers (tools/index.ts) read `result.message` unconditionally,
		// so a raw null here would throw a cryptic TypeError instead of a recoverable ActionResult.
		if (!res) {
			return {
				success: false,
				message:
					'❌ Failed to communicate with the page (content script not ready or connection lost). Wait a moment and retry.',
			}
		}
		return res
	}
}

interface DomActionReturn {
	success: boolean
	message: string
}

/**
 * Flatten whatever the page's tool returned into text.
 *
 * WebMCP is mid-flight on the result shape — the spec explainer returns
 * `{ content: [{ type: 'text', text }] }`, Chrome's docs show a bare string — and
 * everything has already survived a structured clone across two contexts by now.
 */
function normalizeBridgeResult(raw: unknown): { content: string } {
	if (raw == null) return { content: '' }
	if (typeof raw === 'string') return { content: raw }

	if (typeof raw === 'object') {
		const navigated = (raw as { navigated?: boolean }).navigated
		if (navigated) return { content: '✅ Tool executed. The page navigated as a result.' }

		const content = (raw as { content?: unknown }).content

		if (Array.isArray(content)) {
			const text = content
				.map((part) =>
					typeof part === 'string'
						? part
						: typeof (part as { text?: unknown })?.text === 'string'
							? (part as { text: string }).text
							: ''
				)
				.filter(Boolean)
				.join('\n')
			return { content: text }
		}

		if (typeof content === 'string') return { content }
	}

	try {
		return { content: JSON.stringify(raw) ?? '' }
	} catch {
		return { content: '' }
	}
}

/**
 * Check if a URL can run content scripts.
 */
export function isContentScriptAllowed(url: string | undefined): boolean {
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
