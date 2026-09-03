import { describe, expect, it, vi } from 'vitest'

import { selectOptionElement } from './actions'

function makeSelect(): HTMLSelectElement {
	const select = document.createElement('select')
	for (const [value, label] of [
		['a', 'Apple'],
		['b', 'Banana'],
	]) {
		const option = document.createElement('option')
		option.value = value
		option.textContent = label
		select.appendChild(option)
	}
	document.body.appendChild(select)
	return select
}

describe('selectOptionElement', () => {
	it('selects the option whose text matches', async () => {
		const select = makeSelect()
		await selectOptionElement(select, 'Banana')
		expect(select.value).toBe('b')
	})

	it('rejects an unknown option', async () => {
		const select = makeSelect()
		await expect(selectOptionElement(select, 'Cherry')).rejects.toThrow(/not found/)
	})

	it('assigns through the prototype setter, not the instance one', async () => {
		// React installs its own `value` setter on the instance to track changes.
		// A direct assignment goes through that one and leaves React's tracker
		// holding the old value, so onChange never runs.
		const select = makeSelect()
		const prototypeSetter = vi.fn(
			Object.getOwnPropertyDescriptor(Object.getPrototypeOf(select) as object, 'value')!
				.set as (v: string) => void
		)
		const instanceSetter = vi.fn()
		Object.defineProperty(Object.getPrototypeOf(select), 'value', {
			configurable: true,
			get: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(select) as object, 'value')!.get,
			set: prototypeSetter,
		})
		Object.defineProperty(select, 'value', {
			configurable: true,
			get: () => 'a',
			set: instanceSetter,
		})

		await selectOptionElement(select, 'Banana')

		expect(prototypeSetter).toHaveBeenCalledWith('b')
		expect(instanceSetter).not.toHaveBeenCalled()
	})

	it('fires input before change', async () => {
		const select = makeSelect()
		const seen: string[] = []
		select.addEventListener('input', () => seen.push('input'))
		select.addEventListener('change', () => seen.push('change'))

		await selectOptionElement(select, 'Banana')

		expect(seen).toEqual(['input', 'change'])
	})
})
