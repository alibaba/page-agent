import { describe, expect, it, vi } from 'vitest'

import { I18n } from './index'

describe('I18n.t', () => {
	it('resolves a normal key', () => {
		expect(new I18n('en-US').t('ui.panel.ready')).toBe('Ready')
	})

	it('does not resolve inherited properties', () => {
		// `current?.[key]` walked the prototype chain, so these returned
		// Object.prototype members from a method that promises a string.
		const i18n = new I18n('en-US')
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		for (const key of ['toString', 'constructor', 'valueOf', 'hasOwnProperty']) {
			expect(i18n.t(key as never)).toBe(key)
		}

		warn.mockRestore()
	})

	it('does not return an intermediate object, with or without params', () => {
		// 'ui.panel' resolves to an object. With params it reached interpolate()
		// and threw `template.replace is not a function`.
		const i18n = new I18n('en-US')
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		expect(i18n.t('ui.panel' as never)).toBe('ui.panel')
		expect(() => i18n.t('ui.panel' as never, { name: 'x' })).not.toThrow()
		expect(i18n.t('ui.panel' as never, { name: 'x' })).toBe('ui.panel')

		warn.mockRestore()
	})

	it('still interpolates params', () => {
		const i18n = new I18n('en-US')
		expect(i18n.t('ui.panel.step', { number: 3 })).toBe('Step 3')
	})

	it('keeps an empty translation instead of reporting it missing', () => {
		// The old falsy check treated '' as absent and returned the key.
		const i18n = new I18n('en-US')
		// @ts-expect-error - reaching into the loaded table for a '' value
		i18n.translations = { empty: '' }
		expect(i18n.t('empty' as never)).toBe('')
	})
})
