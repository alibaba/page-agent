import { describe, expect, it } from 'vitest'

import type { FlatDomTree, InteractiveElementDomNode } from './dom_tree/type'
import { flatTreeToString, getFlatTree } from './index'

function createCheckboxTree(attributes: Record<string, string>): FlatDomTree {
	return {
		rootId: 'root',
		map: {
			root: {
				tagName: 'body',
				children: ['checkbox'],
				isVisible: true,
			},
			checkbox: {
				tagName: 'input',
				attributes,
				isInteractive: true,
				highlightIndex: 0,
				isVisible: true,
				ref: document.createElement('input'),
			},
		},
	}
}

function setVisibleGeometry(...elements: Element[]): void {
	for (const element of elements) {
		Object.defineProperties(element, {
			offsetWidth: { configurable: true, value: 100 },
			offsetHeight: { configurable: true, value: 24 },
			getClientRects: {
				configurable: true,
				value: () => [new DOMRect(0, 0, 100, 24)],
			},
			getBoundingClientRect: {
				configurable: true,
				value: () => new DOMRect(0, 0, 100, 24),
			},
		})
	}
}

describe('flatTreeToString', () => {
	it('preserves an unchecked native checkbox state', () => {
		const output = flatTreeToString(
			createCheckboxTree({ type: 'checkbox', checked: 'false', value: 'Option 2' })
		)

		expect(output).toContain('[0]<input type=checkbox checked=false value=Option 2 />')
	})

	it.each(['true', 'false', 'mixed'])('preserves aria-checked=%s', (checkedState) => {
		const output = flatTreeToString(
			createCheckboxTree({ role: 'checkbox', 'aria-checked': checkedState, 'aria-label': 'Option' })
		)

		expect(output).toContain(`aria-checked=${checkedState}`)
	})

	it.each([
		['nested control', '<label>Option <input type="checkbox" /></label>', true],
		['nested control', '<label>Option <input type="checkbox" /></label>', false],
		[
			'for/id control',
			'<label for="option">Option</label><input id="option" type="checkbox" />',
			true,
		],
		[
			'for/id control',
			'<label for="option">Option</label><input id="option" type="checkbox" />',
			false,
		],
	])('projects %s checked=%s state onto the indexed label', (_relationship, markup, checked) => {
		document.body.innerHTML = markup
		const label = document.querySelector('label')!
		const input = document.querySelector('input')!
		input.checked = checked
		setVisibleGeometry(document.body, label, input)

		const tree = getFlatTree({})
		const labelNode = Object.values(tree.map).find(
			(node): node is InteractiveElementDomNode => node.isInteractive === true && node.ref === label
		)

		expect(labelNode).toMatchObject({
			tagName: 'label',
			attributes: { type: 'checkbox', checked: String(checked) },
		})
		expect(flatTreeToString(tree)).toMatch(
			new RegExp(`<label type=checkbox checked=${checked}(?: for=option)?>Option`)
		)
	})
})
