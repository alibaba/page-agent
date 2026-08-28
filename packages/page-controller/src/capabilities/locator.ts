/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * Durable element locators for generated capabilities.
 *
 * @remarks
 * The agent's normal `[index]` addressing is only valid for the current DOM tree —
 * `updateTree()` reassigns every index. A generated capability, by contrast, is
 * registered once and may be called many steps later, after re-renders and
 * navigations. So generated tools address elements by a resolvable locator with
 * ordered fallbacks, and re-resolve on every call.
 */

/** How to find an element again, in order of preference. */
export interface Locator {
	/** `#id` / `[name=...]` / `[data-testid=...]` — cheap and stable when present. */
	selector?: string
	/** Absolute-ish XPath captured at scan time. Survives attribute churn, not restructuring. */
	xpath?: string
	/** Visible label/text used as a last-resort anchor. */
	text?: string
	/** Tag name, used to validate that a fallback match is the right kind of element. */
	tagName?: string
}

/** Escape a value for use inside an attribute selector. */
function cssEscapeValue(value: string): string {
	if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
	return value.replace(/["\\]/g, '\\$&')
}

/**
 * Build the most stable locator we can for an element.
 *
 * Preference order reflects what actually survives a redesign: explicit test hooks
 * and form field names outlive generated class names and DOM position.
 */
export function buildLocator(element: HTMLElement, xpath?: string): Locator {
	const locator: Locator = { xpath, tagName: element.tagName.toLowerCase() }

	const testId =
		element.getAttribute('data-testid') ??
		element.getAttribute('data-test-id') ??
		element.getAttribute('data-test') ??
		element.getAttribute('data-cy')

	if (testId) {
		locator.selector = `[data-testid="${cssEscapeValue(testId)}"]`
		// Keep the exact attribute we matched on, since sites use several spellings.
		if (!element.hasAttribute('data-testid')) {
			const attr = element.hasAttribute('data-test-id')
				? 'data-test-id'
				: element.hasAttribute('data-test')
					? 'data-test'
					: 'data-cy'
			locator.selector = `[${attr}="${cssEscapeValue(testId)}"]`
		}
		return locator
	}

	const id = element.getAttribute('id')
	// Framework-generated ids (`:r3:`, `radix-123`) change every render — useless as anchors.
	if (id && !looksGenerated(id)) {
		locator.selector = `#${cssEscapeValue(id)}`
		return locator
	}

	const name = element.getAttribute('name')
	if (name) {
		locator.selector = `${locator.tagName}[name="${cssEscapeValue(name)}"]`
		return locator
	}

	const ariaLabel = element.getAttribute('aria-label')
	if (ariaLabel) {
		locator.selector = `${locator.tagName}[aria-label="${cssEscapeValue(ariaLabel)}"]`
		return locator
	}

	const text = (element.textContent ?? '').trim()
	if (text && text.length <= 60) locator.text = text

	return locator
}

/** Heuristic for framework-generated ids that are not stable across renders. */
function looksGenerated(id: string): boolean {
	return (
		/^:.*:$/.test(id) || // React useId
		/^(radix|headlessui|mui|mantine|chakra)-/i.test(id) ||
		/^[a-f0-9]{8,}$/i.test(id) ||
		/\d{6,}/.test(id)
	)
}

/** Resolve an XPath to an element, tolerating malformed expressions. */
function resolveXPath(xpath: string, root: Document): HTMLElement | null {
	try {
		const result = root.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
		const node = result.singleNodeValue
		return node instanceof HTMLElement ? node : null
	} catch {
		return null
	}
}

/**
 * Find the element a locator points at, trying each strategy in turn.
 * Returns `null` rather than throwing so callers can report a precise,
 * actionable message about which field went missing.
 */
export function resolveLocator(locator: Locator, root: Document = document): HTMLElement | null {
	if (locator.selector) {
		try {
			const found = root.querySelector<HTMLElement>(locator.selector)
			if (found) return found
		} catch {
			// Invalid selector — fall through to the next strategy.
		}
	}

	if (locator.xpath) {
		const found = resolveXPath(locator.xpath, root)
		if (found) return found
	}

	if (locator.text) {
		const tag = locator.tagName ?? '*'
		const candidates = Array.from(root.querySelectorAll<HTMLElement>(tag))
		const exact = candidates.find((el) => (el.textContent ?? '').trim() === locator.text)
		if (exact) return exact
	}

	return null
}

/** True when the locator still points at a live, attached element. */
export function isResolvable(locator: Locator, root: Document = document): boolean {
	const element = resolveLocator(locator, root)
	return Boolean(element && element.isConnected)
}
