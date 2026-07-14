import type { PageController } from '../PageController'

const clearFunctions: (() => void)[] = []

/**
 * Patch Element Plus Input components to make the clear button recognizable.
 * The clear button (.el-input__clear) needs cursor: pointer to be detected.
 */
function fixElementPlusInputs() {
	const inputs = [...document.querySelectorAll('.el-input__inner')]
	for (const input of inputs) {
		const wrapper = input.closest('.el-input')
		if (!wrapper || !(wrapper instanceof HTMLElement)) return
		if (wrapper.hasAttribute('data-element-plus-input-patched')) continue

		// Check if there's a clear button
		const clearButton = wrapper.querySelector('.el-input__clear')
		if (clearButton && clearButton instanceof HTMLElement) {
			// Add cursor: pointer to the clear button so it's recognized as interactive
			clearButton.style.setProperty('cursor', 'pointer', 'important')
			// Mark as patched only after successfully patching the button
			wrapper.setAttribute('data-element-plus-input-patched', 'true')
		}
		// Note: if the clear button is not in the DOM yet (empty input), we don't mark as patched
		// so the next beforeUpdate pass will try again
	}
}

/**
 * Patch Element Plus DatePicker components to make them recognizable.
 * DatePicker wrappers need cursor: pointer to be included in the selector map.
 */
function fixElementPlusDatePicker() {
	const datePickers = [...document.querySelectorAll('.el-date-editor')]
	for (const picker of datePickers) {
		if (picker.hasAttribute('data-element-plus-date-picker-patched')) continue
		if (!(picker instanceof HTMLElement)) continue

		// Set cursor: pointer unconditionally for DatePicker wrappers
		// Element Plus doesn't set cursor on these elements, so computed style is 'auto'
		picker.style.cursor = 'pointer'

		// Mark as patched
		picker.setAttribute('data-element-plus-date-picker-patched', 'true')
	}
}

/**
 * Patch Element Plus Select components to make them recognizable.
 * Select wrappers need cursor: pointer to be included in the selector map.
 */
function fixElementPlusSelect() {
	const selects = [...document.querySelectorAll('.el-select')]
	for (const select of selects) {
		if (select.hasAttribute('data-element-plus-select-patched')) continue
		if (!(select instanceof HTMLElement)) continue

		// Set cursor: pointer unconditionally for Select wrappers
		// Element Plus doesn't set cursor on these elements, so computed style is 'auto'
		select.style.cursor = 'pointer'

		// Mark as patched
		select.setAttribute('data-element-plus-select-patched', 'true')
	}
}

export function patchElementPlus(pageController: PageController) {
	pageController.addEventListener('beforeUpdate', () => {
		fixElementPlusInputs()
		fixElementPlusDatePicker()
		fixElementPlusSelect()
	})
	pageController.addEventListener('afterUpdate', () => {
		for (const fn of clearFunctions) fn()
		clearFunctions.length = 0
	})
}
