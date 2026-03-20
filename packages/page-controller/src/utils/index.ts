// ======= type guards =======
// @note instanceof fails for elements inside iframes

export function isHTMLElement(el: unknown): el is HTMLElement {
	// @todo either specify to HTMLElement or allow Element here.
	return !!el && (el as Node).nodeType === 1
}

export function isInputElement(el: Element): el is HTMLInputElement {
	return el?.nodeType === 1 && el.tagName === 'INPUT'
}

export function isTextAreaElement(el: Element): el is HTMLTextAreaElement {
	return el?.nodeType === 1 && el.tagName === 'TEXTAREA'
}

export function isSelectElement(el: Element): el is HTMLSelectElement {
	return el?.nodeType === 1 && el.tagName === 'SELECT'
}

export function isAnchorElement(el: Element): el is HTMLAnchorElement {
	return el?.nodeType === 1 && el.tagName === 'A'
}

// ======= iframe helpers =======

/** Iframe offset for translating element coordinates to top-frame viewport. */
export function getIframeOffset(element: HTMLElement): { x: number; y: number } {
	const frame = element.ownerDocument.defaultView?.frameElement as HTMLElement | null
	if (!frame) return { x: 0, y: 0 }
	const rect = frame.getBoundingClientRect()
	return { x: rect.left, y: rect.top }
}

/**
 * Get native value setter from the element's own prototype (iframe-safe).
 * @note for React
 */
export function getNativeValueSetter(element: HTMLInputElement | HTMLTextAreaElement) {
	// eslint-disable-next-line @typescript-eslint/unbound-method
	return Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element) as object, 'value')!
		.set as (v: string) => void
}

// ======= general utils =======

export async function waitFor(seconds: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

// ======= dom utils =======

export async function movePointerToElement(element: HTMLElement) {
	const rect = element.getBoundingClientRect()
	const offset = getIframeOffset(element)
	const x = rect.left + rect.width / 2 + offset.x
	const y = rect.top + rect.height / 2 + offset.y

	window.dispatchEvent(new CustomEvent('PageAgent::MovePointerTo', { detail: { x, y } }))

	await waitFor(0.3)
}
