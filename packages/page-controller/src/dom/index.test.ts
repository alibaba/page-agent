import { describe, expect, it } from 'vitest'

import type { FlatDomTree } from './dom_tree/type'
import { flatTreeToString, getElementTextMap } from './index'

function makeFlatTree(nodes: Record<string, any>): FlatDomTree {
	return { rootId: 'root', map: nodes as any }
}

/**
 * Verifies the data-flow contract: lines emitted by flatTreeToString for
 * isNew elements use a `*[N]` prefix, and getElementTextMap must resolve the
 * same indexes. This is the regression test for the missing `*` prefix
 * handling in getElementTextMap.
 */
describe('getElementTextMap', () => {
	it('resolves the index of a regular interactive element', () => {
		const tree = makeFlatTree({
			root: {
				type: 'ELEMENT_NODE',
				tagName: 'body',
				isVisible: true,
				children: ['1'],
			},
			'1': {
				type: 'ELEMENT_NODE',
				tagName: 'button',
				isVisible: true,
				isTopElement: true,
				isInteractive: true,
				highlightIndex: 0,
				children: ['2'],
			},
			'2': { type: 'TEXT_NODE', text: 'Click me', isVisible: true },
		})

		const html = flatTreeToString(tree)
		expect(html).toContain('[0]<button')
		expect(getElementTextMap(html).has(0)).toBe(true)
	})

	it('resolves the index of an isNew element rendered with a *[N] prefix', () => {
		const tree = makeFlatTree({
			root: {
				type: 'ELEMENT_NODE',
				tagName: 'body',
				isVisible: true,
				children: ['1'],
			},
			'1': {
				type: 'ELEMENT_NODE',
				tagName: 'button',
				isVisible: true,
				isTopElement: true,
				isInteractive: true,
				isNew: true,
				highlightIndex: 3,
				children: ['2'],
			},
			'2': { type: 'TEXT_NODE', text: 'New Button', isVisible: true },
		})

		const html = flatTreeToString(tree)
		// flatTreeToString prefixes isNew elements with `*[N]`
		expect(html).toContain('*[3]<button')
		// getElementTextMap must resolve that same index (bug: it did not)
		expect(getElementTextMap(html).has(3)).toBe(true)
	})

	it('resolves page-mixed regular and isNew elements to distinct indexes', () => {
		const tree = makeFlatTree({
			root: {
				type: 'ELEMENT_NODE',
				tagName: 'body',
				isVisible: true,
				children: ['1', '4'],
			},
			'1': {
				type: 'ELEMENT_NODE',
				tagName: 'button',
				isVisible: true,
				isTopElement: true,
				isInteractive: true,
				highlightIndex: 0,
				children: ['2'],
			},
			'2': { type: 'TEXT_NODE', text: 'Existing', isVisible: true },
			'4': {
				type: 'ELEMENT_NODE',
				tagName: 'button',
				isVisible: true,
				isTopElement: true,
				isInteractive: true,
				isNew: true,
				highlightIndex: 5,
				children: ['5'],
			},
			'5': { type: 'TEXT_NODE', text: 'Appeared', isVisible: true },
		})

		const html = flatTreeToString(tree)
		expect(html).toContain('[0]<button')
		expect(html).toContain('*[5]<button')

		const map = getElementTextMap(html)
		expect(map.get(0)).toContain('Existing')
		expect(map.get(5)).toContain('Appeared')
	})
})
