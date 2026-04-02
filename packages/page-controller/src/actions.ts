/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import type { InteractiveElementDomNode } from './dom/dom_tree/type'
import {
	clickPointer,
	disablePassThrough,
	enablePassThrough,
	getNativeValueSetter,
	isHTMLElement,
	isInputElement,
	isSelectElement,
	isTextAreaElement,
	movePointerToElement,
	waitFor,
} from './utils'

/**
 * Get the HTMLElement by index from a selectorMap.
 * @private Internal method, subject to change at any time.
 */
export function getElementByIndex(
	selectorMap: Map<number, InteractiveElementDomNode>,
	index: number
): HTMLElement {
	const interactiveNode = selectorMap.get(index)
	if (!interactiveNode) {
		throw new Error(`No interactive element found at index ${index}`)
	}

	const element = interactiveNode.ref
	if (!element) {
		throw new Error(`Element at index ${index} does not have a reference`)
	}

	if (!isHTMLElement(element)) {
		throw new Error(`Element at index ${index} is not an HTMLElement`)
	}

	return element
}

let lastClickedElement: HTMLElement | null = null

function blurLastClickedElement() {
	if (lastClickedElement) {
		lastClickedElement.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }))
		lastClickedElement.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }))
		lastClickedElement.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
		lastClickedElement.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
		lastClickedElement.blur()
		lastClickedElement = null
	}
}

/**
 * Simulate a full click following W3C Pointer Events + UI Events spec order:
 * pointerover/enter → mouseover/enter → pointerdown → mousedown → [focus] →
 * pointerup → mouseup → click
 *
 * @private Internal method, subject to change at any time.
 */
export async function clickElement(element: HTMLElement) {
	blurLastClickedElement()

	lastClickedElement = element

	await scrollIntoViewIfNeeded(element)
	const frame = element.ownerDocument.defaultView?.frameElement
	if (frame) await scrollIntoViewIfNeeded(frame)

	const rect = element.getBoundingClientRect()
	const x = rect.left + rect.width / 2
	const y = rect.top + rect.height / 2

	await movePointerToElement(element, x, y)
	await clickPointer()

	await waitFor(0.1)

	// Hit-test to find the deepest element at click coordinates, matching
	// real browser behavior where events target the innermost element.
	// @note This may hit a element in the blacklist
	// TODO: This is a temporary workaround. Should have been handled during dom extraction.
	const doc = element.ownerDocument
	await enablePassThrough()
	const hitTarget = doc.elementFromPoint(x, y)
	await disablePassThrough()
	const target =
		hitTarget instanceof HTMLElement && element.contains(hitTarget) ? hitTarget : element

	const pointerOpts = {
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		pointerType: 'mouse',
	}
	const mouseOpts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }

	// Hover — pointer events first, then mouse events (spec order)
	target.dispatchEvent(new PointerEvent('pointerover', pointerOpts))
	target.dispatchEvent(new PointerEvent('pointerenter', { ...pointerOpts, bubbles: false }))
	target.dispatchEvent(new MouseEvent('mouseover', mouseOpts))
	target.dispatchEvent(new MouseEvent('mouseenter', { ...mouseOpts, bubbles: false }))

	// Press
	target.dispatchEvent(new PointerEvent('pointerdown', pointerOpts))
	target.dispatchEvent(new MouseEvent('mousedown', mouseOpts))

	// Focus is not part of the standard pointer/mouse event sequence
	// "undefined and varies between user agents".
	// We focus the original element (nearest focusable ancestor), not the hit-test target, matching browser behavior.
	element.focus({ preventScroll: true })

	// Release
	target.dispatchEvent(new PointerEvent('pointerup', pointerOpts))
	target.dispatchEvent(new MouseEvent('mouseup', mouseOpts))

	// Click — activation behavior (navigation, form submit, etc.) triggers
	// via bubbling from target up to the interactive ancestor.
	target.click()

	await waitFor(0.2)
}

/**
 * @private Internal method, subject to change at any time.
 */
export async function inputTextElement(element: HTMLElement, text: string) {
	const isContentEditable = element.isContentEditable
	if (!isInputElement(element) && !isTextAreaElement(element) && !isContentEditable) {
		throw new Error('Element is not an input, textarea, or contenteditable')
	}

	await clickElement(element)

	if (isContentEditable) {
		// Contenteditable support (partial)
		// Not supported:
		// - Monaco/CodeMirror: Require direct JS instance access. No universal way to obtain.
		// - Draft.js: Not responsive to synthetic/execCommand/Range/DataTransfer. Unmaintained.
		//
		// Strategy: Try Plan A (synthetic events) first, then verify and fall back
		// to Plan B (execCommand) if the text wasn't actually inserted.
		//
		// Plan A: Dispatch synthetic events
		// Works: React contenteditable, Quill.
		// Fails: Slate.js, some contenteditable editors that ignore synthetic events.
		// Sequence: beforeinput -> mutation -> input -> change -> blur

		// Dispatch beforeinput + mutation + input for clearing
		if (
			element.dispatchEvent(
				new InputEvent('beforeinput', {
					bubbles: true,
					cancelable: true,
					inputType: 'deleteContent',
				})
			)
		) {
			element.innerText = ''
			element.dispatchEvent(
				new InputEvent('input', {
					bubbles: true,
					inputType: 'deleteContent',
				})
			)
		}

		// Dispatch beforeinput + mutation + input for insertion (important for React apps)
		if (
			element.dispatchEvent(
				new InputEvent('beforeinput', {
					bubbles: true,
					cancelable: true,
					inputType: 'insertText',
					data: text,
				})
			)
		) {
			element.innerText = text
			element.dispatchEvent(
				new InputEvent('input', {
					bubbles: true,
					inputType: 'insertText',
					data: text,
				})
			)
		}

		// Verify Plan A worked by checking if the text was actually inserted
		const planASucceeded = element.innerText.trim() === text.trim()

		if (!planASucceeded) {
			// Plan B: execCommand fallback (deprecated but widely supported)
			// Works: Quill, Slate.js, react contenteditable components.
			// This approach integrates with the browser's undo stack and is handled
			// natively by most rich-text editors.
			element.focus()

			// Select all existing content and delete it
			const doc = element.ownerDocument
			const selection = (doc.defaultView || window).getSelection()
			const range = doc.createRange()
			range.selectNodeContents(element)
			selection?.removeAllRanges()
			selection?.addRange(range)

			// eslint-disable-next-line @typescript-eslint/no-deprecated
			doc.execCommand('delete', false)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			doc.execCommand('insertText', false, text)
		}

		// Dispatch change event (for good measure)
		element.dispatchEvent(new Event('change', { bubbles: true }))

		// Trigger blur for validation
		element.blur()
	} else {
		getNativeValueSetter(element as HTMLInputElement | HTMLTextAreaElement).call(element, text)
	}

	// Only dispatch shared input event for non-contenteditable (contenteditable has its own)
	if (!isContentEditable) {
		element.dispatchEvent(new Event('input', { bubbles: true }))
	}

	await waitFor(0.1)

	blurLastClickedElement()
}

/**
 * @todo browser-use version is very complex and supports menu tags, need to follow up
 * @private Internal method, subject to change at any time.
 */
export async function selectOptionElement(selectElement: HTMLSelectElement, optionText: string) {
	if (!isSelectElement(selectElement)) {
		throw new Error('Element is not a select element')
	}

	const options = Array.from(selectElement.options)
	const option = options.find((opt) => opt.textContent?.trim() === optionText.trim())

	if (!option) {
		throw new Error(`Option with text "${optionText}" not found in select element`)
	}

	selectElement.value = option.value
	selectElement.dispatchEvent(new Event('change', { bubbles: true }))

	await waitFor(0.1) // Wait to ensure change event processing completes
}

interface ScrollableElement extends Element {
	scrollIntoViewIfNeeded?: (centerIfNeeded?: boolean) => void
}

/**
 * @private Internal method, subject to change at any time.
 */
export async function scrollIntoViewIfNeeded(element: Element) {
	const el = element as ScrollableElement
	if (typeof el.scrollIntoViewIfNeeded === 'function') {
		el.scrollIntoViewIfNeeded()
		// await waitFor(0.5) // Animation playback
	} else {
		// @todo visibility check
		element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
		// await waitFor(0.5) // Animation playback
	}
}

export async function scrollVertically(scroll_amount: number, element?: HTMLElement | null) {
	// Element-specific scrolling if element is provided
	if (element) {
		const targetElement = element
		let currentElement = targetElement as HTMLElement | null
		let scrollSuccess = false
		let scrolledElement: HTMLElement | null = null
		let scrollDelta = 0
		let attempts = 0
		const dy = scroll_amount

		while (currentElement && attempts < 10) {
			const computedStyle = window.getComputedStyle(currentElement)
			const hasScrollableY = /(auto|scroll|overlay)/.test(computedStyle.overflowY)
			const canScrollVertically = currentElement.scrollHeight > currentElement.clientHeight

			if (hasScrollableY && canScrollVertically) {
				const beforeScroll = currentElement.scrollTop
				const maxScroll = currentElement.scrollHeight - currentElement.clientHeight

				let scrollAmount = dy / 3

				if (scrollAmount > 0) {
					scrollAmount = Math.min(scrollAmount, maxScroll - beforeScroll)
				} else {
					scrollAmount = Math.max(scrollAmount, -beforeScroll)
				}

				currentElement.scrollTop = beforeScroll + scrollAmount

				const afterScroll = currentElement.scrollTop
				const actualScrollDelta = afterScroll - beforeScroll

				if (Math.abs(actualScrollDelta) > 0.5) {
					scrollSuccess = true
					scrolledElement = currentElement
					scrollDelta = actualScrollDelta
					break
				}
			}

			if (currentElement === document.body || currentElement === document.documentElement) {
				break
			}
			currentElement = currentElement.parentElement
			attempts++
		}

		if (scrollSuccess) {
			return `Scrolled container (${scrolledElement?.tagName}) by ${scrollDelta}px`
		} else {
			return `No scrollable container found for element (${targetElement.tagName})`
		}
	}

	// Page-level scrolling (default or fallback)

	const dy = scroll_amount
	const bigEnough = (el: HTMLElement) => el.clientHeight >= window.innerHeight * 0.5
	const canScroll = (el: HTMLElement | null) =>
		el &&
		/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY) &&
		el.scrollHeight > el.clientHeight &&
		bigEnough(el)

	// @deprecated Heuristic container search.
	// Unreliable in multi-panel layouts. Should guide LLMs to use indexed scroll for consistency.
	// TODO: remove this fallback

	// try to find the nearest scrollable container
	// document.activeElement is usually body.
	// After a successful element.focus(), activeElement become the nearest focusable parent

	let el: HTMLElement | null = document.activeElement as HTMLElement | null
	while (el && !canScroll(el) && el !== document.body) el = el.parentElement

	// Something is wrong if it falls back to global '*' search
	// TODO: Return error message instead of global '*' search

	el = canScroll(el)
		? el
		: Array.from(document.querySelectorAll<HTMLElement>('*')).find(canScroll) ||
			(document.scrollingElement as HTMLElement) ||
			(document.documentElement as HTMLElement)

	if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
		// Page-level scroll
		const scrollBefore = window.scrollY
		const scrollMax = document.documentElement.scrollHeight - window.innerHeight

		window.scrollBy(0, dy)

		const scrollAfter = window.scrollY
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dy > 0
				? `⚠️ Already at the bottom of the page, cannot scroll down further.`
				: `⚠️ Already at the top of the page, cannot scroll up further.`
		}

		const reachedBottom = dy > 0 && scrollAfter >= scrollMax - 1
		const reachedTop = dy < 0 && scrollAfter <= 1

		if (reachedBottom) return `✅ Scrolled page by ${scrolled}px. Reached the bottom of the page.`
		if (reachedTop) return `✅ Scrolled page by ${scrolled}px. Reached the top of the page.`
		return `✅ Scrolled page by ${scrolled}px.`
	} else {
		// Container scroll

		const warningMsg = `The document is not scrollable. Falling back to container scroll.`
		console.log(`[PageController] ${warningMsg}`)

		const scrollBefore = el!.scrollTop
		const scrollMax = el!.scrollHeight - el!.clientHeight

		el!.scrollBy({ top: dy, behavior: 'smooth' })
		await waitFor(0.1)

		const scrollAfter = el!.scrollTop
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dy > 0
				? `⚠️ ${warningMsg} Already at the bottom of container (${el!.tagName}), cannot scroll down further.`
				: `⚠️ ${warningMsg} Already at the top of container (${el!.tagName}), cannot scroll up further.`
		}

		const reachedBottom = dy > 0 && scrollAfter >= scrollMax - 1
		const reachedTop = dy < 0 && scrollAfter <= 1

		if (reachedBottom)
			return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the bottom.`
		if (reachedTop)
			return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the top.`
		return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px.`
	}
}

export async function scrollHorizontally(scroll_amount: number, element?: HTMLElement | null) {
	// Element-specific scrolling if element is provided
	if (element) {
		const targetElement = element
		let currentElement = targetElement as HTMLElement | null
		let scrollSuccess = false
		let scrolledElement: HTMLElement | null = null
		let scrollDelta = 0
		let attempts = 0
		const dx = scroll_amount

		while (currentElement && attempts < 10) {
			const computedStyle = window.getComputedStyle(currentElement)
			const hasScrollableX = /(auto|scroll|overlay)/.test(computedStyle.overflowX)
			const canScrollHorizontally = currentElement.scrollWidth > currentElement.clientWidth

			if (hasScrollableX && canScrollHorizontally) {
				const beforeScroll = currentElement.scrollLeft
				const maxScroll = currentElement.scrollWidth - currentElement.clientWidth

				let scrollAmount = dx / 3

				if (scrollAmount > 0) {
					scrollAmount = Math.min(scrollAmount, maxScroll - beforeScroll)
				} else {
					scrollAmount = Math.max(scrollAmount, -beforeScroll)
				}

				currentElement.scrollLeft = beforeScroll + scrollAmount

				const afterScroll = currentElement.scrollLeft
				const actualScrollDelta = afterScroll - beforeScroll

				if (Math.abs(actualScrollDelta) > 0.5) {
					scrollSuccess = true
					scrolledElement = currentElement
					scrollDelta = actualScrollDelta
					break
				}
			}

			if (currentElement === document.body || currentElement === document.documentElement) {
				break
			}
			currentElement = currentElement.parentElement
			attempts++
		}

		if (scrollSuccess) {
			return `Scrolled container (${scrolledElement?.tagName}) horizontally by ${scrollDelta}px`
		} else {
			return `No horizontally scrollable container found for element (${targetElement.tagName})`
		}
	}

	// Page-level scrolling (default or fallback)

	const dx = scroll_amount

	const bigEnough = (el: HTMLElement) => el.clientWidth >= window.innerWidth * 0.5
	const canScroll = (el: HTMLElement | null) =>
		el &&
		/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowX) &&
		el.scrollWidth > el.clientWidth &&
		bigEnough(el)

	// @deprecated Same heuristic container search as scrollVertically.
	// TODO: Remove once LLMs reliably use indexed scrolling via data-scrollable.

	let el: HTMLElement | null = document.activeElement as HTMLElement | null
	while (el && !canScroll(el) && el !== document.body) el = el.parentElement

	el = canScroll(el)
		? el
		: Array.from(document.querySelectorAll<HTMLElement>('*')).find(canScroll) ||
			(document.scrollingElement as HTMLElement) ||
			(document.documentElement as HTMLElement)

	if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
		// Page-level scroll
		const scrollBefore = window.scrollX
		const scrollMax = document.documentElement.scrollWidth - window.innerWidth

		window.scrollBy(dx, 0)

		const scrollAfter = window.scrollX
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dx > 0
				? `⚠️ Already at the right edge of the page, cannot scroll right further.`
				: `⚠️ Already at the left edge of the page, cannot scroll left further.`
		}

		const reachedRight = dx > 0 && scrollAfter >= scrollMax - 1
		const reachedLeft = dx < 0 && scrollAfter <= 1

		if (reachedRight)
			return `✅ Scrolled page by ${scrolled}px. Reached the right edge of the page.`
		if (reachedLeft) return `✅ Scrolled page by ${scrolled}px. Reached the left edge of the page.`
		return `✅ Scrolled page horizontally by ${scrolled}px.`
	} else {
		// Container scroll
		const warningMsg = `The document is not scrollable. Falling back to container scroll.`
		console.log(`[PageController] ${warningMsg}`)

		const scrollBefore = el!.scrollLeft
		const scrollMax = el!.scrollWidth - el!.clientWidth

		el!.scrollBy({ left: dx, behavior: 'smooth' })
		await waitFor(0.1)

		const scrollAfter = el!.scrollLeft
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dx > 0
				? `⚠️ ${warningMsg} Already at the right edge of container (${el!.tagName}), cannot scroll right further.`
				: `⚠️ ${warningMsg} Already at the left edge of container (${el!.tagName}), cannot scroll left further.`
		}

		const reachedRight = dx > 0 && scrollAfter >= scrollMax - 1
		const reachedLeft = dx < 0 && scrollAfter <= 1

		if (reachedRight)
			return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the right edge.`
		if (reachedLeft)
			return `✅ ${warningMsg} Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the left edge.`
		return `✅ ${warningMsg} Scrolled container (${el!.tagName}) horizontally by ${scrolled}px.`
	}
}
