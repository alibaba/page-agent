import type { PageController } from '../PageController'

const clearFunctions = [] as (() => void)[]

/**
 * antd 的 select 是 div 包 input 的结构，所有信息都在 input 标签上，
 * 但是 input 不可见，也不会出现在清洗后的树里，因此这里把他提上来
 */
function fixAntdSelect() {
	const inputs = [...document.querySelectorAll('input[role="combobox"]')]
	for (const input of inputs) {
		// 找到父 div（Ant Design Select 的容器）
		const parent = input.closest('.ant-select-selector') || input.parentElement
		if (!parent || !(parent instanceof HTMLElement)) return
		if (parent.hasAttribute('data-antd-patched')) continue

		// 把 input 的关键 ARIA 属性复制到父 div 上
		// 这样即使 input 不可见，LLM 也能从父 div 上看到这些信息
		// role="combobox" 已经在 DEFAULT_INCLUDE_ATTRIBUTES 中
		if (input.hasAttribute('aria-label')) {
			parent.setAttribute('aria-label', input.getAttribute('aria-label')!)
		}
		if (input.hasAttribute('aria-expanded')) {
			parent.setAttribute('aria-expanded', input.getAttribute('aria-expanded')!)
		}
		if (input.hasAttribute('aria-controls')) {
			parent.setAttribute('aria-controls', input.getAttribute('aria-controls')!)
		}

		// 如果有值，添加到父 div 的 text content 中
		// flatTreeToString 会读取元素的 text content
		const inputEl = input as HTMLInputElement
		if (inputEl.value) {
			parent.setAttribute('data-value', inputEl.value)
		}

		// 标记已处理，避免重复处理
		parent.setAttribute('data-antd-patched', 'true')
	}
}

export function patchAntd(pageController: PageController) {
	pageController.addEventListener('beforeUpdate', fixAntdSelect)
	pageController.addEventListener('afterUpdate', () => {
		for (const fn of clearFunctions) fn()
		clearFunctions.length = 0
	})
}
