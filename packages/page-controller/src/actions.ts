/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import type { InteractiveElementDomNode } from './dom/dom_tree/type'

// ======= general utils =======

async function waitFor(seconds: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

// ======= dom utils =======

export async function movePointerToElement(element: HTMLElement) {
	const rect = element.getBoundingClientRect()
	const x = rect.left + rect.width / 2
	const y = rect.top + rect.height / 2

	window.dispatchEvent(new CustomEvent('PageAgent::MovePointerTo', { detail: { x, y } }))

	await waitFor(0.3)
}

/**
 * Get the HTMLElement by index from a selectorMap.
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

	if (!(element instanceof HTMLElement)) {
		throw new Error(`Element at index ${index} is not an HTMLElement`)
	}

	return element
}

let lastClickedElement: HTMLElement | null = null

function blurLastClickedElement() {
	if (lastClickedElement) {
		lastClickedElement.blur()
		lastClickedElement.dispatchEvent(
			new MouseEvent('mouseout', { bubbles: true, cancelable: true })
		)
		lastClickedElement = null
	}
}

/**
 * Simulate a click on the element
 */
export async function clickElement(element: HTMLElement) {
	blurLastClickedElement()

	lastClickedElement = element
	await scrollIntoViewIfNeeded(element)
	await movePointerToElement(element)
	window.dispatchEvent(new CustomEvent('PageAgent::ClickPointer'))
	await waitFor(0.1)

	// hover it
	element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }))
	element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))

	// dispatch a sequence of events to ensure all listeners are triggered
	element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

	// focus it to ensure it gets the click event
	element.focus()

	element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
	element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

	// dispatch a click event
	// element.click()

	await waitFor(0.2) // Wait to ensure click event processing completes
}

// eslint-disable-next-line @typescript-eslint/unbound-method
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
	window.HTMLInputElement.prototype,
	'value'
)!.set!

// eslint-disable-next-line @typescript-eslint/unbound-method
const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
	window.HTMLTextAreaElement.prototype,
	'value'
)!.set!

/**
 * create a synthetic keyboard event
 * with key keycode code
 */
export async function createSyntheticInputEvent(elem: HTMLElement, key: string) {
	elem.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
	await waitFor(0.01)

	if (elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement) {
		elem.dispatchEvent(new Event('beforeinput', { bubbles: true }))
		await waitFor(0.01)
		elem.dispatchEvent(new Event('input', { bubbles: true }))
		await waitFor(0.01)
	}

	elem.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key }))
}

export async function inputTextElement(element: HTMLElement, text: string) {
	if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
		throw new Error('Element is not an input or textarea')
	}

	await clickElement(element)

	if (element instanceof HTMLTextAreaElement) {
		nativeTextAreaValueSetter.call(element, text)
	} else {
		nativeInputValueSetter.call(element, text)
	}

	const inputEvent = new Event('input', { bubbles: true })
	element.dispatchEvent(inputEvent)

	await waitFor(0.1) // Wait to ensure input event processing completes

	blurLastClickedElement()
}

/**
 * @todo browser-use version is very complex and supports menu tags, need to follow up
 */
export async function selectOptionElement(selectElement: HTMLSelectElement, optionText: string) {
	if (!(selectElement instanceof HTMLSelectElement)) {
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

export async function scrollIntoViewIfNeeded(element: HTMLElement) {
	const el = element as any
	if (el.scrollIntoViewIfNeeded) {
		el.scrollIntoViewIfNeeded()
		// await waitFor(0.5) // Animation playback
	} else {
		// @todo visibility check
		el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
		// await waitFor(0.5) // Animation playback
	}
}

export async function scrollVertically(
	down: boolean,
	scroll_amount: number,
	element?: HTMLElement | null
) {
	// Element-specific scrolling if element is provided
	if (element) {
		const targetElement = element
		console.log(
			'[SCROLL DEBUG] Starting direct container scroll for element:',
			targetElement.tagName
		)

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

			console.log(
				'[SCROLL DEBUG] Checking element:',
				currentElement.tagName,
				'hasScrollableY:',
				hasScrollableY,
				'canScrollVertically:',
				canScrollVertically,
				'scrollHeight:',
				currentElement.scrollHeight,
				'clientHeight:',
				currentElement.clientHeight
			)

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

				console.log(
					'[SCROLL DEBUG] Scroll attempt:',
					currentElement.tagName,
					'before:',
					beforeScroll,
					'after:',
					afterScroll,
					'delta:',
					actualScrollDelta
				)

				if (Math.abs(actualScrollDelta) > 0.5) {
					scrollSuccess = true
					scrolledElement = currentElement
					scrollDelta = actualScrollDelta
					console.log(
						'[SCROLL DEBUG] Successfully scrolled container:',
						currentElement.tagName,
						'delta:',
						actualScrollDelta
					)
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

	let el: HTMLElement | null = document.activeElement as HTMLElement | null
	while (el && !canScroll(el) && el !== document.body) el = el.parentElement

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
		const scrollBefore = el!.scrollTop
		const scrollMax = el!.scrollHeight - el!.clientHeight

		el!.scrollBy({ top: dy, behavior: 'smooth' })
		await waitFor(0.1)

		const scrollAfter = el!.scrollTop
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dy > 0
				? `⚠️ Already at the bottom of container (${el!.tagName}), cannot scroll down further.`
				: `⚠️ Already at the top of container (${el!.tagName}), cannot scroll up further.`
		}

		const reachedBottom = dy > 0 && scrollAfter >= scrollMax - 1
		const reachedTop = dy < 0 && scrollAfter <= 1

		if (reachedBottom)
			return `✅ Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the bottom.`
		if (reachedTop)
			return `✅ Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the top.`
		return `✅ Scrolled container (${el!.tagName}) by ${scrolled}px.`
	}
}

export async function scrollHorizontally(
	right: boolean,
	scroll_amount: number,
	element?: HTMLElement | null
) {
	// Element-specific scrolling if element is provided
	if (element) {
		const targetElement = element
		console.log(
			'[SCROLL DEBUG] Starting direct container scroll for element:',
			targetElement.tagName
		)

		let currentElement = targetElement as HTMLElement | null
		let scrollSuccess = false
		let scrolledElement: HTMLElement | null = null
		let scrollDelta = 0
		let attempts = 0
		const dx = right ? scroll_amount : -scroll_amount

		while (currentElement && attempts < 10) {
			const computedStyle = window.getComputedStyle(currentElement)
			const hasScrollableX = /(auto|scroll|overlay)/.test(computedStyle.overflowX)
			const canScrollHorizontally = currentElement.scrollWidth > currentElement.clientWidth

			console.log(
				'[SCROLL DEBUG] Checking element:',
				currentElement.tagName,
				'hasScrollableX:',
				hasScrollableX,
				'canScrollHorizontally:',
				canScrollHorizontally,
				'scrollWidth:',
				currentElement.scrollWidth,
				'clientWidth:',
				currentElement.clientWidth
			)

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

				console.log(
					'[SCROLL DEBUG] Scroll attempt:',
					currentElement.tagName,
					'before:',
					beforeScroll,
					'after:',
					afterScroll,
					'delta:',
					actualScrollDelta
				)

				if (Math.abs(actualScrollDelta) > 0.5) {
					scrollSuccess = true
					scrolledElement = currentElement
					scrollDelta = actualScrollDelta
					console.log(
						'[SCROLL DEBUG] Successfully scrolled container:',
						currentElement.tagName,
						'delta:',
						actualScrollDelta
					)
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

	const dx = right ? scroll_amount : -scroll_amount
	const bigEnough = (el: HTMLElement) => el.clientWidth >= window.innerWidth * 0.5
	const canScroll = (el: HTMLElement | null) =>
		el &&
		/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowX) &&
		el.scrollWidth > el.clientWidth &&
		bigEnough(el)

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
		const scrollBefore = el!.scrollLeft
		const scrollMax = el!.scrollWidth - el!.clientWidth

		el!.scrollBy({ left: dx, behavior: 'smooth' })
		await waitFor(0.1)

		const scrollAfter = el!.scrollLeft
		const scrolled = scrollAfter - scrollBefore

		if (Math.abs(scrolled) < 1) {
			return dx > 0
				? `⚠️ Already at the right edge of container (${el!.tagName}), cannot scroll right further.`
				: `⚠️ Already at the left edge of container (${el!.tagName}), cannot scroll left further.`
		}

		const reachedRight = dx > 0 && scrollAfter >= scrollMax - 1
		const reachedLeft = dx < 0 && scrollAfter <= 1

		if (reachedRight)
			return `✅ Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the right edge.`
		if (reachedLeft)
			return `✅ Scrolled container (${el!.tagName}) by ${scrolled}px. Reached the left edge.`
		return `✅ Scrolled container (${el!.tagName}) horizontally by ${scrolled}px.`
	}
}
