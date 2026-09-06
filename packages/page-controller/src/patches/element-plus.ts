import type { PageController } from '../PageController'

const clearFunctions: (() => void)[] = []

/**
 * Patch a single Element Plus clear control so the DOM extractor recognizes it
 * as a distinct interactive element (cursor + role="button" + aria-label).
 *
 * Element Plus uses different class names for clear controls depending on the
 * component: `.el-input__clear` (plain Input), `.clear-icon` (DatePicker /
 * TimePicker single clear icon), and `.el-range__close-icon` (RangePicker clear
 * icon). Patching all three ensures every clear control is actionable.
 */
function patchClearControl(clearControl: Element | null) {
	if (!(clearControl instanceof HTMLElement)) return

	clearControl.style.setProperty('cursor', 'pointer', 'important')
	if (!clearControl.hasAttribute('role')) {
		clearControl.setAttribute('role', 'button')
	}
	if (!clearControl.hasAttribute('aria-label')) {
		clearControl.setAttribute('aria-label', 'Clear')
	}
}

/**
 * Patch Element Plus Input components to make the clear button recognizable.
 * The clear button (.el-input__clear) needs cursor: pointer to be detected.
 * We patch on every update to handle dynamic clear button creation/removal.
 */
function fixElementPlusInputs() {
	// Collect unique wrappers. Plain inputs (and single DatePicker/TimePicker,
	// which reuse `.el-input`) are covered by `.el-input`; RangePicker uses
	// `.el-range-editor` with `.el-range-input` (not `.el-input__inner`).
	const wrappers = new Set<HTMLElement>()
	for (const el of document.querySelectorAll('.el-input, .el-range-editor')) {
		if (el instanceof HTMLElement) wrappers.add(el)
	}

	for (const wrapper of wrappers) {
		// Always check and patch every clear-control variant on each update.
		// This handles dynamically created/removed clear buttons (e.g., when
		// input value changes, or disabled/readonly/clearable props change).
		patchClearControl(wrapper.querySelector('.el-input__clear'))
		patchClearControl(wrapper.querySelector('.clear-icon'))
		patchClearControl(wrapper.querySelector('.el-range__close-icon'))
	}
}

/**
 * Patch Element Plus DatePicker components to make them recognizable.
 * DatePicker wrappers need cursor: pointer to be included in the selector map.
 * We check on every update and handle dynamic disabled state changes.
 */
function fixElementPlusDatePicker() {
	const datePickers = [...document.querySelectorAll('.el-date-editor')]
	for (const picker of datePickers) {
		if (!(picker instanceof HTMLElement)) continue

		// Check if disabled (Element Plus adds .is-disabled class)
		// If disabled, remove forced cursor (if previously applied) and skip
		if (picker.classList.contains('is-disabled')) {
			if (picker.style.cursor === 'pointer') {
				picker.style.cursor = ''
			}
			continue
		}

		// Set cursor: pointer for DatePicker wrappers
		// Element Plus doesn't set cursor on these elements, so computed style is 'auto'
		picker.style.cursor = 'pointer'
	}
}

/**
 * Patch Element Plus Select components to make them recognizable.
 * Select wrappers need cursor: pointer to be included in the selector map.
 * We check on every update and handle dynamic disabled state changes.
 */
function fixElementPlusSelect() {
	const selects = [...document.querySelectorAll('.el-select')]
	for (const select of selects) {
		if (!(select instanceof HTMLElement)) continue

		// Check if disabled (Element Plus puts .is-disabled on .el-select__wrapper)
		// If disabled, remove forced cursor (if previously applied) and skip
		const innerWrapper = select.querySelector('.el-select__wrapper')
		if (innerWrapper && innerWrapper.classList.contains('is-disabled')) {
			if (select.style.cursor === 'pointer') {
				select.style.cursor = ''
			}
			continue
		}

		// Set cursor: pointer for Select wrappers
		// Element Plus doesn't set cursor on these elements, so computed style is 'auto'
		select.style.cursor = 'pointer'
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
