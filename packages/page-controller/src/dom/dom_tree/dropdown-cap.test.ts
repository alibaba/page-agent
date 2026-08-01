import { beforeEach, describe, expect, it } from 'vitest'

import { flatTreeToString } from '../index'
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

describe('dropdown option cap (#348)', () => {
	beforeEach(() => {
		setupSizes()
		document.body.innerHTML = ''
	})

	it('indexes at most 20 options per dropdown container', () => {
		const options = Array.from(
			{ length: 25 },
			(_, i) => `<li class="el-select-dropdown__item" style="cursor:pointer">选项 ${i}</li>`
		)
		document.body.innerHTML = `
			<div class="el-select-dropdown">
				<ul class="el-select-dropdown__list">${options.join('')}</ul>
			</div>
		`
		const tree = buildDropdown(document.body.innerHTML)
		const liNodes = Object.values(tree.map).filter((n: any) => n.tagName === 'li')
		const indexed = liNodes.filter((n: any) => typeof n.highlightIndex === 'number')
		expect(indexed.length).toBe(20)
	})

	it('records dropped options on the container', () => {
		const options = Array.from(
			{ length: 25 },
			(_, i) => `<li class="el-select-dropdown__item" style="cursor:pointer">选项 ${i}</li>`
		)
		document.body.innerHTML = `
			<div class="el-select-dropdown">
				<ul class="el-select-dropdown__list">${options.join('')}</ul>
			</div>
		`
		const tree = buildDropdown(document.body.innerHTML)
		const container = Object.values(tree.map).find(
			(n: any) => n.tagName === 'div' && n.extra?.droppedOptions === 5
		)
		expect(container).toBeDefined()
	})

	it('renders a folded-options hint in the simplified HTML', () => {
		const options = Array.from(
			{ length: 25 },
			(_, i) => `<li class="el-select-dropdown__item" style="cursor:pointer">选项 ${i}</li>`
		)
		document.body.innerHTML = `
			<div class="el-select-dropdown">
				<ul class="el-select-dropdown__list">${options.join('')}</ul>
			</div>
		`
		const tree = buildDropdown(document.body.innerHTML)
		const html = flatTreeToString(tree)
		expect(html).toContain('5 more option(s) not shown')
		// only the first 20 options carry indexes
		expect(html).toContain('[19]<li >选项 19')
		expect(html).not.toContain('选项 24')
	})

	it('does not cap dropdowns with few options', () => {
		const options = Array.from(
			{ length: 6 },
			(_, i) => `<li class="el-select-dropdown__item" style="cursor:pointer">选项 ${i}</li>`
		)
		document.body.innerHTML = `
			<div class="el-select-dropdown">
				<ul class="el-select-dropdown__list">${options.join('')}</ul>
			</div>
		`
		const tree = buildDropdown(document.body.innerHTML)
		const liNodes = Object.values(tree.map).filter((n: any) => n.tagName === 'li')
		expect(liNodes.filter((n: any) => typeof n.highlightIndex === 'number').length).toBe(6)
		const html = flatTreeToString(tree)
		expect(html).not.toContain('not shown')
	})
})
