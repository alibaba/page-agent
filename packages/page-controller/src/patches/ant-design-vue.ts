import type { PageController } from '../PageController'

const clearFunctions: (() => void)[] = []

/**
 * Patch ant-design-vue 4.x Select and TreeSelect components.
 *
 * ant-design-vue's Select/TreeSelect use a div wrapping an invisible
 * input[role="combobox"]. The input holds ARIA attributes and the current
 * value, but since it's invisible (offsetWidth === 0), it never appears in
 * the cleaned DOM tree. This patch copies ARIA attributes from the hidden
 * input to the visible parent .ant-select-selector so the LLM can see and
 * interact with the component.
 */
function fixAntdvSelect() {
	const inputs = [...document.querySelectorAll('input[role="combobox"]')]
	for (const input of inputs) {
		const parent = input.closest('.ant-select-selector')
		if (!parent || !(parent instanceof HTMLElement)) continue

		// Always refresh ARIA attributes from the hidden input to the parent div.
		// This ensures the LLM sees up-to-date state (e.g., aria-expanded changes).
		for (const attr of ['aria-label', 'aria-expanded', 'aria-controls', 'aria-haspopup', 'aria-autocomplete']) {
			if (input.hasAttribute(attr)) {
				parent.setAttribute(attr, input.getAttribute(attr)!)
			}
		}

		// Copy the current value as a data attribute so flatTreeToString can read it.
		const inputEl = input as HTMLInputElement
		if (inputEl.value) {
			parent.setAttribute('data-value', inputEl.value)
		} else {
			parent.removeAttribute('data-value')
		}

		// Mark as patched to avoid duplicate processing.
		parent.setAttribute('data-antdv-patched', 'true')
	}
}

/**
 * Patch ant-design-vue 4.x TreeSelect dropdown items.
 *
 * TreeSelect dropdowns are teleported to <body> and use .ant-select-tree-*
 * classes. The tree nodes need cursor: pointer to be recognized as interactive
 * by isInteractiveElement().
 */
function fixAntdvTreeSelectDropdown() {
	const treeNodes = [...document.querySelectorAll('.ant-select-tree-treenode')]
	for (const node of treeNodes) {
		if (!(node instanceof HTMLElement)) continue

		// The content node needs cursor: pointer for isInteractiveElement().
		const content = node.querySelector('.ant-select-tree-node-content-wrapper')
		if (content instanceof HTMLElement && !content.hasAttribute('data-antdv-patched')) {
			content.style.setProperty('cursor', 'pointer', 'important')
			content.setAttribute('data-antdv-patched', 'true')
		}

		// The switcher (expand/collapse icon) should also be interactive.
		const switcher = node.querySelector('.ant-select-tree-switcher')
		if (switcher instanceof HTMLElement && !switcher.hasAttribute('data-antdv-patched')) {
			switcher.style.setProperty('cursor', 'pointer', 'important')
			switcher.setAttribute('role', 'button')
			switcher.setAttribute('data-antdv-patched', 'true')
		}
	}
}

/**
 * Patch ant-design-vue 4.x disabled components so they remain visible.
 *
 * By default, disabled elements (with the `disabled` attribute or
 * .ant-input-disabled class) are excluded from the interactive element tree
 * by isInteractiveElement(). This patch ensures disabled components are at
 * least visible to the LLM by adding role="button" and aria-disabled="true"
 * to their wrapper elements. The LLM can then see the component exists and
 * report its disabled state to the user.
 */
function fixAntdvDisabledComponents() {
	// Disabled inputs: .ant-input-disabled or input[disabled] with .ant-input wrapper
	const disabledInputs = [...document.querySelectorAll('.ant-input-disabled, .ant-input-affix-wrapper-disabled')]
	for (const wrapper of disabledInputs) {
		if (!(wrapper instanceof HTMLElement)) continue
		if (!wrapper.hasAttribute('data-antdv-disabled-patched')) {
			wrapper.setAttribute('aria-disabled', 'true')
			wrapper.setAttribute('data-antdv-disabled-patched', 'true')
			// Ensure the wrapper is visible (has dimensions) even though the
			// inner input is disabled. The wrapper itself should still be
			// recognized as an element in the DOM tree.
			wrapper.style.setProperty('cursor', 'not-allowed', 'important')
		}
	}

	// Disabled selects: .ant-select-disabled
	const disabledSelects = [...document.querySelectorAll('.ant-select-disabled')]
	for (const select of disabledSelects) {
		if (!(select instanceof HTMLElement)) continue
		if (!select.hasAttribute('data-antdv-disabled-patched')) {
			select.setAttribute('aria-disabled', 'true')
			select.setAttribute('data-antdv-disabled-patched', 'true')
		}
	}

	// Disabled buttons: .ant-btn-disabled or button[disabled]
	const disabledButtons = [...document.querySelectorAll('.ant-btn-disabled')]
	for (const btn of disabledButtons) {
		if (!(btn instanceof HTMLElement)) continue
		if (!btn.hasAttribute('data-antdv-disabled-patched')) {
			btn.setAttribute('aria-disabled', 'true')
			btn.setAttribute('data-antdv-disabled-patched', 'true')
		}
	}
}

export function patchAntDesignVue(pageController: PageController) {
	pageController.addEventListener('beforeUpdate', () => {
		fixAntdvSelect()
		fixAntdvTreeSelectDropdown()
		fixAntdvDisabledComponents()
	})
	pageController.addEventListener('afterUpdate', () => {
		for (const fn of clearFunctions) fn()
		clearFunctions.length = 0
	})
}
