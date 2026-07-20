import { describe, expect, it, vi } from 'vitest'

import { clickElement, inputTextElement, selectOptionElement } from './actions'

describe('element actions', () => {
	it('rejects clicking a native select with actionable feedback', async () => {
		const select = document.createElement('select')

		await expect(clickElement(select)).rejects.toThrow('Use select_dropdown_option')
	})

	it('rejects typing into a native select with actionable feedback', async () => {
		const select = document.createElement('select')

		await expect(inputTextElement(select, 'Researcher')).rejects.toThrow(
			'Use select_dropdown_option'
		)
	})

	it('reports when an input value does not persist', async () => {
		const input = document.createElement('input')
		document.body.append(input)
		input.addEventListener('input', () => {
			input.value = ''
		})

		await expect(inputTextElement(input, 'Ramen')).rejects.toThrow('Input did not persist')
	})

	it('selects an option and dispatches input and change events', async () => {
		const select = document.createElement('select')
		select.innerHTML = `
			<option value="">Choose a role</option>
			<option value="researcher">Researcher</option>
		`
		const onInput = vi.fn()
		const onChange = vi.fn()
		select.addEventListener('input', onInput)
		select.addEventListener('change', onChange)

		await selectOptionElement(select, 'Researcher')

		expect(select.value).toBe('researcher')
		expect(select.selectedOptions.item(0)?.textContent).toBe('Researcher')
		expect(onInput).toHaveBeenCalledOnce()
		expect(onChange).toHaveBeenCalledOnce()
	})

	it('reports when a selected value does not persist', async () => {
		const select = document.createElement('select')
		select.innerHTML = `
			<option value="">Choose a role</option>
			<option value="researcher">Researcher</option>
		`
		select.addEventListener('change', () => {
			select.value = ''
		})

		await expect(selectOptionElement(select, 'Researcher')).rejects.toThrow(
			'Selection did not persist'
		)
	})
})
