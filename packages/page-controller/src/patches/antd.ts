import type { PageController } from '../PageController'

const clearFunctions: (() => void)[] = []

/**
 * Ant Design's Select component uses a div wrapping an input[role="combobox"] structure.
 * The input is invisible (offsetWidth === 0), so it never appears in the cleaned DOM tree.
 * This patch copies ARIA attributes from the hidden input to the parent selector div
 * so the LLM can see and interact with the Select component.
 */
function fixAntdSelect() {
	const inputs = [...document.querySelectorAll('input[role="combobox"]')]
	for (const input of inputs) {
		// Find the parent div (Ant Design Select container)
		const parent = input.closest('.ant-select-selector') || input.parentElement
		if (!parent || !(parent instanceof HTMLElement)) return

		// Always refresh ARIA attributes from the hidden input to the parent div
		// This ensures the LLM sees up-to-date state (e.g., aria-expanded changes when opened/closed)
		if (input.hasAttribute('aria-label')) {
			parent.setAttribute('aria-label', input.getAttribute('aria-label')!)
		}
		if (input.hasAttribute('aria-expanded')) {
			parent.setAttribute('aria-expanded', input.getAttribute('aria-expanded')!)
		}
		if (input.hasAttribute('aria-controls')) {
			parent.setAttribute('aria-controls', input.getAttribute('aria-controls')!)
		}

		// If the input has a value, add it as a data attribute on the parent
		// flatTreeToString will read the parent's text content / attributes
		const inputEl = input as HTMLInputElement
		if (inputEl.value) {
			parent.setAttribute('data-value', inputEl.value)
		}

		// Mark as patched to avoid duplicate processing
		// Note: we still refresh attributes above on every update
		if (!parent.hasAttribute('data-antd-patched')) {
			parent.setAttribute('data-antd-patched', 'true')
		}
	}
}

export function patchAntd(pageController: PageController) {
	pageController.addEventListener('beforeUpdate', fixAntdSelect)
	pageController.addEventListener('afterUpdate', () => {
		for (const fn of clearFunctions) fn()
		clearFunctions.length = 0
	})
}
