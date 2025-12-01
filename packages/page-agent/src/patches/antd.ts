import type { PageAgent } from '../PageAgent'

const clearFunctions = [] as (() => void)[]

/**
 * antd 的 select 是 div 包 input 的结构，所有信息都在 input 标签上，
 * 但是 input 不可见，也不会出现在清洗后的树里，因此这里把他提上来
 */
function fixAntdSelect() {
	const selects = [...document.querySelectorAll('input[role="combobox"]')]
	// for (const select of selects) {}
}

export function patchAntd(pageAgent: PageAgent) {
	pageAgent.addEventListener('beforeUpdate', fixAntdSelect)
	pageAgent.addEventListener('afterUpdate', () => {
		for (const fn of clearFunctions) fn()
		clearFunctions.length = 0
	})
}
