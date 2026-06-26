import type { PageController } from '../PageController'

const clearFunctions = [] as (() => void)[]

/**
 * element-plus 的 Input 组件有清空按钮（clearable），
 * 需要让 PageAgent 能识别这个按钮。
 *
 * 同样，DatePicker、Select 等组件也有类似问题。
 */
function fixElementPlusInputs() {
	const inputs = [...document.querySelectorAll('.el-input__inner')]
	for (const input of inputs) {
		const wrapper = input.closest('.el-input')
		if (!wrapper || !(wrapper instanceof HTMLElement)) return
		if (wrapper.hasAttribute('data-element-plus-patched')) continue

		// 检查是否有清空按钮
		const clearButton = wrapper.querySelector('.el-input__clear')
		if (clearButton && clearButton instanceof HTMLElement) {
			// 给清空按钮添加 cursor: pointer 样式，让它被识别为可交互元素
			// 使用 style 属性直接设置（最高优先级）
			clearButton.style.setProperty('cursor', 'pointer', 'important')
		}

		// 标记已处理
		wrapper.setAttribute('data-element-plus-patched', 'true')
	}
}

/**
 * element-plus 的 DatePicker 组件
 */
function fixElementPlusDatePicker() {
	const datePickers = [...document.querySelectorAll('.el-date-editor')]
	for (const picker of datePickers) {
		if (picker.hasAttribute('data-element-plus-patched')) continue

		// 给整个 DatePicker 添加 cursor: pointer 样式
		if (picker instanceof HTMLElement && getComputedStyle(picker).cursor === 'default') {
			picker.style.cursor = 'pointer'
		}

		// 标记已处理
		picker.setAttribute('data-element-plus-patched', 'true')
	}
}

/**
 * element-plus 的 Select 组件
 */
function fixElementPlusSelect() {
	const selects = [...document.querySelectorAll('.el-select')]
	for (const select of selects) {
		if (select.hasAttribute('data-element-plus-patched')) continue

		// 给整个 Select 添加 cursor: pointer 样式
		if (select instanceof HTMLElement && getComputedStyle(select).cursor === 'default') {
			select.style.cursor = 'pointer'
		}

		// 标记已处理
		select.setAttribute('data-element-plus-patched', 'true')
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
