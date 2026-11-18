import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ThemeSwitcher from './ThemeSwitcher'

describe('ThemeSwitcher', () => {
	let container: HTMLDivElement
	let root: ReturnType<typeof createRoot>
	let query: EventTarget & { matches: boolean }

	beforeEach(() => {
		vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
		query = Object.assign(new EventTarget(), { matches: false })
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => query)
		)
		localStorage.clear()
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
	})

	afterEach(async () => {
		await act(async () => root.unmount())
		container.remove()
		document.documentElement.classList.remove('dark')
		document.documentElement.style.colorScheme = ''
		localStorage.clear()
		vi.unstubAllGlobals()
	})

	it('keeps following system changes until the user selects a theme', async () => {
		await act(async () => root.render(<ThemeSwitcher />))
		expect(document.documentElement.classList.contains('dark')).toBe(false)

		query.matches = true
		await act(async () => {
			query.dispatchEvent(Object.assign(new Event('change'), { matches: true }))
		})

		expect(document.documentElement.classList.contains('dark')).toBe(true)
		expect(localStorage.getItem('theme')).toBeNull()

		query.matches = false
		await act(async () => {
			query.dispatchEvent(Object.assign(new Event('change'), { matches: false }))
		})
		expect(document.documentElement.classList.contains('dark')).toBe(false)
	})

	it.each(['light', 'dark'])(
		'preserves a saved %s preference across system changes',
		async (theme) => {
			localStorage.setItem('theme', theme)
			await act(async () => root.render(<ThemeSwitcher />))

			await act(async () => {
				query.dispatchEvent(Object.assign(new Event('change'), { matches: theme !== 'dark' }))
			})

			expect(document.documentElement.classList.contains('dark')).toBe(theme === 'dark')
			expect(localStorage.getItem('theme')).toBe(theme)
		}
	)

	it('persists a manual selection and stops following system changes', async () => {
		await act(async () => root.render(<ThemeSwitcher />))
		await act(async () => container.querySelector('button')!.click())

		expect(localStorage.getItem('theme')).toBe('dark')
		expect(document.documentElement.classList.contains('dark')).toBe(true)

		await act(async () => {
			query.dispatchEvent(Object.assign(new Event('change'), { matches: false }))
		})
		expect(document.documentElement.classList.contains('dark')).toBe(true)
	})
})
