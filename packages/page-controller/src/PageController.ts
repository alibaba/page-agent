/**
 * Copyright (C) 2025 EqualByte
 * All rights reserved.
 *
 * PageController - Manages DOM operations and element interactions.
 * Designed to be independent of LLM and can be tested in unit tests.
 * All public methods are async for potential remote calling support.
 */
import {
	type SendableKey,
	clickElement,
	getElementByIndex,
	inputTextElement,
	scrollHorizontally,
	scrollVertically,
	selectOptionElement,
	sendKeys,
} from './actions'
import { type ApiExecutionResult, executeApiCapability } from './capabilities/apiExecutor'
import {
	type ApiCapabilityDescriptor,
	clearApiCalls,
	getApiCalls,
	inferApiCapabilities,
	observeApiCalls,
} from './capabilities/apiObserver'
import { type DomExecutionResult, executeDomCapability } from './capabilities/domExecutor'
import { type DomCapabilityDescriptor, scanDomCapabilities } from './capabilities/domScanner'
import { isResolvable } from './capabilities/locator'
import * as dom from './dom'
import type { FlatDomTree, InteractiveElementDomNode } from './dom/dom_tree/type'
import { getPageInfo } from './dom/getPageInfo'
import { patchReact } from './patches/react'
import { isAnchorElement } from './utils'

/**
 * Configuration for PageController
 */
export interface PageControllerConfig extends dom.DomConfig {
	/** Enable visual mask overlay during operations (default: false) */
	enableMask?: boolean
}

/**
 * Structured browser state for LLM consumption
 */
export interface BrowserState {
	url: string
	title: string
	/** Page info + scroll position hint (e.g. "Page info: 1920x1080px...\n[Start of page]") */
	header: string
	/** Simplified HTML of interactive elements */
	content: string
	/** Page footer hint (e.g. "... 300 pixels below ..." or "[End of page]") */
	footer: string
}

interface ActionResult {
	success: boolean
	message: string
}

/**
 * PageController manages DOM state and element interactions.
 * It provides async methods for all DOM operations, keeping state isolated.
 *
 * @lifecycle
 * - beforeUpdate: Emitted before the DOM tree is updated.
 * - afterUpdate: Emitted after the DOM tree is updated.
 */
export class PageController extends EventTarget {
	private config: PageControllerConfig

	/** Corresponds to eval_page in browser-use */
	private flatTree: FlatDomTree | null = null

	/**
	 * All highlighted index-mapped interactive elements
	 * Corresponds to DOMState.selector_map in browser-use
	 */
	private selectorMap = new Map<number, InteractiveElementDomNode>()

	/** Index -> element text description mapping */
	private elementTextMap = new Map<number, string>()

	/**
	 * Simplified HTML for LLM consumption.
	 * Corresponds to clickable_elements_to_string in browser-use
	 */
	private simplifiedHTML = '<EMPTY>'

	/** last time the tree was updated */
	private lastTimeUpdate = 0

	/** Whether the tree has been indexed at least once */
	private isIndexed = false

	/** Visual mask overlay for blocking user interaction during automation */
	private mask: InstanceType<typeof import('./mask/SimulatorMask').SimulatorMask> | null = null
	private maskReady: Promise<void> | null = null

	/** Uninstalls the fetch/XHR instrumentation when API observation is on. */
	#stopApiObserver: (() => void) | null = null

	constructor(config: PageControllerConfig = {}) {
		super()

		this.config = config

		patchReact(this)

		if (config.enableMask) this.initMask()
	}

	/**
	 * Initialize mask asynchronously (dynamic import to avoid CSS loading in Node)
	 */
	initMask() {
		if (this.maskReady !== null) return
		this.maskReady = (async () => {
			const { SimulatorMask } = await import('./mask/SimulatorMask')
			this.mask = new SimulatorMask()
		})()
	}
	// ======= State Queries =======

	/**
	 * Get current page URL
	 */
	async getCurrentUrl(): Promise<string> {
		return window.location.href
	}

	/**
	 * Get last tree update timestamp
	 */
	async getLastUpdateTime(): Promise<number> {
		return this.lastTimeUpdate
	}

	/**
	 * Get structured browser state for LLM consumption.
	 * Automatically calls updateTree() to refresh the DOM state.
	 */
	async getBrowserState(): Promise<BrowserState> {
		const url = window.location.href
		const title = document.title
		const pi = getPageInfo()
		const viewportExpansion = dom.resolveViewportExpansion(this.config.viewportExpansion)

		await this.updateTree()

		const content = this.simplifiedHTML

		// Build header: page info + scroll position hint
		const titleLine = `Current Page: [${title}](${url})`

		const pageInfoLine = `Page info: ${pi.viewport_width}x${pi.viewport_height}px viewport, ${pi.page_width}x${pi.page_height}px total page size, ${pi.pages_above.toFixed(1)} pages above, ${pi.pages_below.toFixed(1)} pages below, ${pi.total_pages.toFixed(1)} total pages, at ${(pi.current_page_position * 100).toFixed(0)}% of page`

		const elementsLabel =
			viewportExpansion === -1
				? 'Interactive elements from top layer of the current page (full page):'
				: 'Interactive elements from top layer of the current page inside the viewport:'

		const hasContentAbove = pi.pixels_above > 4
		const scrollHintAbove =
			hasContentAbove && viewportExpansion !== -1
				? `... ${pi.pixels_above} pixels above (${pi.pages_above.toFixed(1)} pages) - scroll to see more ...`
				: '[Start of page]'

		const header = `${titleLine}\n${pageInfoLine}\n\n${elementsLabel}\n\n${scrollHintAbove}`

		// Build footer: scroll position hint
		const hasContentBelow = pi.pixels_below > 4
		const footer =
			hasContentBelow && viewportExpansion !== -1
				? `... ${pi.pixels_below} pixels below (${pi.pages_below.toFixed(1)} pages) - scroll to see more ...`
				: '[End of page]'

		return { url, title, header, content, footer }
	}

	// ======= DOM Tree Operations =======

	/**
	 * Update DOM tree, returns simplified HTML for LLM.
	 * This is the main method to refresh the page state.
	 * Automatically bypasses mask during DOM extraction if enabled.
	 */
	async updateTree(): Promise<string> {
		this.dispatchEvent(new Event('beforeUpdate'))

		this.lastTimeUpdate = Date.now()

		// Temporarily bypass mask to allow DOM extraction
		if (this.mask) {
			this.mask.wrapper.style.pointerEvents = 'none'
		}

		dom.cleanUpHighlights()

		const blacklist = [
			...(this.config.interactiveBlacklist || []),
			...Array.from(document.querySelectorAll('[data-eb-agent-not-interactive]')),
		]

		this.flatTree = dom.getFlatTree({
			...this.config,
			interactiveBlacklist: blacklist,
		})

		this.simplifiedHTML = dom.flatTreeToString(
			this.flatTree,
			this.config.includeAttributes,
			this.config.keepSemanticTags
		)

		this.selectorMap.clear()
		this.selectorMap = dom.getSelectorMap(this.flatTree)

		this.elementTextMap.clear()
		this.elementTextMap = dom.getElementTextMap(this.simplifiedHTML)

		// Mark as indexed - now element actions are allowed
		this.isIndexed = true

		// Restore mask blocking
		if (this.mask) {
			this.mask.wrapper.style.pointerEvents = 'auto'
		}

		this.dispatchEvent(new Event('afterUpdate'))

		return this.simplifiedHTML
	}

	/**
	 * Clean up all element highlights
	 */
	async cleanUpHighlights(): Promise<void> {
		console.log('[PageController] cleanUpHighlights')
		dom.cleanUpHighlights()
	}

	// ======= Element Actions =======

	/**
	 * Ensure the tree has been indexed before any index-based operation.
	 * Throws if updateTree() hasn't been called yet.
	 */
	private assertIndexed(): void {
		if (!this.isIndexed) {
			throw new Error('DOM tree not indexed yet. Can not perform actions on elements.')
		}
	}

	/**
	 * Click element by index
	 */
	async clickElement(index: number): Promise<ActionResult> {
		try {
			this.assertIndexed()
			const element = getElementByIndex(this.selectorMap, index)
			const elemText = this.elementTextMap.get(index)
			await clickElement(element)

			// Handle links that open in new tabs
			if (isAnchorElement(element) && element.target === '_blank') {
				return {
					success: true,
					message: `✅ Clicked element (${elemText ?? index}). ⚠️ Link opened in a new tab.`,
				}
			}

			return {
				success: true,
				message: `✅ Clicked element (${elemText ?? index}).`,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to click element: ${error}`,
			}
		}
	}

	/**
	 * Input text into element by index
	 */
	async inputText(index: number, text: string): Promise<ActionResult> {
		try {
			this.assertIndexed()
			const element = getElementByIndex(this.selectorMap, index)
			const elemText = this.elementTextMap.get(index)
			await inputTextElement(element, text)

			return {
				success: true,
				message: `✅ Input text (${text}) into element (${elemText ?? index}).`,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to input text: ${error}`,
			}
		}
	}

	/**
	 * Select dropdown option by index and option text
	 */
	async selectOption(index: number, optionText: string): Promise<ActionResult> {
		try {
			this.assertIndexed()
			const element = getElementByIndex(this.selectorMap, index)
			const elemText = this.elementTextMap.get(index)
			await selectOptionElement(element as HTMLSelectElement, optionText)

			return {
				success: true,
				message: `✅ Selected option (${optionText}) in element (${elemText ?? index}).`,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to select option: ${error}`,
			}
		}
	}

	/**
	 * Send a key (Enter, Tab, Escape, arrows, Backspace, Delete) to element by index.
	 * Use this for search boxes and forms that submit on Enter rather than via a
	 * separate visible button.
	 */
	async sendKeys(index: number, key: SendableKey): Promise<ActionResult> {
		try {
			this.assertIndexed()
			const element = getElementByIndex(this.selectorMap, index)
			const elemText = this.elementTextMap.get(index)
			await sendKeys(element, key)

			return {
				success: true,
				message: `✅ Sent key "${key}" to element (${elemText ?? index}).`,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to send key: ${error}`,
			}
		}
	}

	/**
	 * Scroll vertically
	 */
	async scroll(options: {
		down: boolean
		numPages: number
		pixels?: number
		index?: number
	}): Promise<ActionResult> {
		try {
			const { down, numPages, pixels, index } = options

			this.assertIndexed()

			const scrollAmount = (pixels ?? numPages * window.innerHeight) * (down ? 1 : -1)

			const element = index !== undefined ? getElementByIndex(this.selectorMap, index) : null

			const message = await scrollVertically(scrollAmount, element)

			return {
				success: true,
				message,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to scroll: ${error}`,
			}
		}
	}

	/**
	 * Scroll horizontally
	 */
	async scrollHorizontally(options: {
		right: boolean
		pixels: number
		index?: number
	}): Promise<ActionResult> {
		try {
			const { right, pixels, index } = options

			this.assertIndexed()

			const scrollAmount = pixels * (right ? 1 : -1)

			const element = index !== undefined ? getElementByIndex(this.selectorMap, index) : null

			const message = await scrollHorizontally(scrollAmount, element)

			return {
				success: true,
				message,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to scroll horizontally: ${error}`,
			}
		}
	}

	/**
	 * Execute arbitrary JavaScript on the page.
	 * The optional `signal` is exposed to the script scope so cooperative code
	 * can abort promptly when the task is stopped.
	 */
	async executeJavascript(script: string, signal?: AbortSignal): Promise<ActionResult> {
		try {
			// Wrap script in async function to support await, exposing `signal`.
			const asyncFunction = eval(`(async (signal) => { ${script} })`)
			const result = await asyncFunction(signal)
			return {
				success: true,
				message: `✅ Executed JavaScript. Result: ${result}`,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Error executing JavaScript: ${error}`,
			}
		}
	}

	// ======= Capability Discovery =======

	/**
	 * Scan the page's UI for candidate business actions (§8, §9).
	 *
	 * @remarks
	 * Returns descriptors, not executable tools — `@eb-agent/core` turns them into
	 * registered capabilities. Groups of elements become one action
	 * (`create_customer(name, email, phone)`); individual buttons never become tools
	 * of their own. Nothing here mutates the page or the DOM tree, so it is safe to
	 * call at any point in the agent loop.
	 */
	async scanCapabilities(options?: {
		maxCapabilities?: number
	}): Promise<DomCapabilityDescriptor[]> {
		try {
			return scanDomCapabilities({ maxCapabilities: options?.maxCapabilities })
		} catch (error) {
			// A generation failure must never take the DOM agent down with it.
			console.error('[PageController] Capability scan failed:', error)
			return []
		}
	}

	/**
	 * Run a generated capability by filling its fields and activating its submit
	 * control. Elements are re-resolved from durable locators on every call, since
	 * element indexes are only valid for the current DOM tree.
	 */
	async executeCapability(
		descriptor: DomCapabilityDescriptor,
		input: Record<string, unknown>,
		signal?: AbortSignal
	): Promise<DomExecutionResult> {
		try {
			return await executeDomCapability(descriptor, input, signal)
		} catch (error) {
			if ((error as Error)?.name === 'AbortError') throw error
			return {
				success: false,
				message: `❌ Failed to execute capability "${descriptor.name}": ${String(error)}`,
			}
		}
	}

	/**
	 * Whether a generated capability's elements are still present.
	 * Used to drop stale capabilities after the page re-renders.
	 */
	async isCapabilityUsable(descriptor: DomCapabilityDescriptor): Promise<boolean> {
		if (descriptor.submit && !isResolvable(descriptor.submit.locator)) return false
		return descriptor.fields
			.filter((field) => field.required)
			.every((field) => isResolvable(field.locator))
	}

	/**
	 * Start recording the application's own same-origin API calls (§18).
	 * Returns a function that removes the instrumentation.
	 *
	 * @remarks
	 * Off unless explicitly started. Observation alone changes nothing about the
	 * agent's behavior — it only makes `scanApiCapabilities()` able to answer.
	 */
	async observeApiCalls(): Promise<() => void> {
		this.#stopApiObserver ??= observeApiCalls()
		return this.#stopApiObserver
	}

	/** Capabilities inferred from the API calls observed so far. */
	async scanApiCapabilities(): Promise<ApiCapabilityDescriptor[]> {
		try {
			return inferApiCapabilities(getApiCalls())
		} catch (error) {
			console.error('[PageController] API capability inference failed:', error)
			return []
		}
	}

	/** Discard everything the API observer has recorded. */
	async clearApiObservations(): Promise<void> {
		clearApiCalls()
	}

	/**
	 * Replay an inferred API capability. The request carries the page's own
	 * session and the headers the application used; nothing is forged.
	 */
	async executeApiCapability(
		descriptor: ApiCapabilityDescriptor,
		input: Record<string, unknown>,
		signal?: AbortSignal
	): Promise<ApiExecutionResult> {
		try {
			return await executeApiCapability(descriptor, input, signal)
		} catch (error) {
			if ((error as Error)?.name === 'AbortError') throw error
			return {
				success: false,
				message: `❌ Failed to execute API capability "${descriptor.name}": ${String(error)}`,
			}
		}
	}

	// ======= Mask Operations =======

	/**
	 * Show the visual mask overlay.
	 * Only works after mask is setup.
	 */
	async showMask(): Promise<void> {
		await this.maskReady
		this.mask?.show()
	}

	/**
	 * Hide the visual mask overlay.
	 * Only works after mask is setup.
	 */
	async hideMask(): Promise<void> {
		await this.maskReady
		this.mask?.hide()
	}

	/**
	 * Dispose and clean up resources
	 */
	dispose(): void {
		// Restore the original fetch/XHR before anything else: leaving our wrappers
		// installed on a disposed controller would keep instrumenting the host app.
		this.#stopApiObserver?.()
		this.#stopApiObserver = null
		dom.cleanUpHighlights()
		this.flatTree = null
		this.selectorMap.clear()
		this.elementTextMap.clear()
		this.simplifiedHTML = '<EMPTY>'
		this.isIndexed = false
		this.mask?.dispose()
		this.mask = null
	}
}

export * from './actions'
export {
	type DomCapabilityDescriptor,
	type DomCapabilityField,
	scanDomCapabilities,
} from './capabilities/domScanner'
export { type DomExecutionResult } from './capabilities/domExecutor'
export { type ApiExecutionResult } from './capabilities/apiExecutor'
export {
	type ApiCallRecord,
	type ApiCapabilityDescriptor,
	clearApiCalls,
	getApiCalls,
	inferApiCapabilities,
	observeApiCalls,
} from './capabilities/apiObserver'
export { type Locator, buildLocator, isResolvable, resolveLocator } from './capabilities/locator'
