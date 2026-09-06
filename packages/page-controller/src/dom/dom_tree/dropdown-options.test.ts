import { beforeEach, describe, expect, it } from 'vitest'

import domTree from './index.js'

function setupSizes() {
	Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
		configurable: true,
		get() {
			return 100
		},
	})
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
		configurable: true,
		get() {
			return 30
		},
	})
}

function buildDropdown(html: string) {
	return domTree({
		doHighlightElements: false,
		viewportExpansion: -1,
		interactiveBlacklist: [],
		interactiveWhitelist: [],
	}) as any
}

function getIndexedOptions(tree: any) {
	return Object.values(tree.map)
		.filter((n: any) => n.tagName === 'li' && typeof n.highlightIndex === 'number')
		.sort((a: any, b: any) => a.highlightIndex - b.highlightIndex)
}

describe('dropdown option indexing (#519)', () => {
	beforeEach(() => {
		setupSizes()
		document.body.innerHTML = ''
	})

	it('indexes enabled dropdown options', () => {
		document.body.innerHTML = `
			<div class="el-select-dropdown">
				<ul class="el-select-dropdown__list">
					<li class="el-select-dropdown__item" style="cursor:pointer">选项1</li>
					<li class="el-select-dropdown__item" style="cursor:pointer">选项2</li>
					<li class="el-select-dropdown__item" style="cursor:pointer">选项3</li>
				</ul>
			</div>
		`
		const tree = buildDropdown(document.body.innerHTML)
		const indexed = getIndexedOptions(tree)
		expect(indexed.length).toBe(3)
	})

	it('indexes disabled dropdown options so the full list is visible to the LLM', () => {
		document.body.innerHTML = `
			<div class="el-select-dropdown">
				<ul class="el-select-dropdown__list">
					<li class="el-select-dropdown__item" style="cursor:pointer">闸片产线</li>
					<li class="el-select-dropdown__item is-disabled" style="cursor:not-allowed">落料车间</li>
					<li class="el-select-dropdown__item" style="cursor:pointer">机加车间</li>
				</ul>
			</div>
		`
		const tree = buildDropdown(document.body.innerHTML)
		const indexed = getIndexedOptions(tree)
		expect(indexed.length).toBe(3)
	})

	it('still excludes disabled buttons outside dropdowns', () => {
		document.body.innerHTML = `
			<button style="cursor:not-allowed" disabled>保存</button>
		`
		const tree = buildDropdown(document.body.innerHTML)
		const buttons = Object.values(tree.map).filter((n: any) => n.tagName === 'button')
		expect(buttons.every((n: any) => n.highlightIndex === undefined)).toBe(true)
	})
})
