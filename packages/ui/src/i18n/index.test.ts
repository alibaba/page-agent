import { describe, expect, it, vi } from 'vitest'

import { I18n } from './index'

describe('I18n', () => {
	describe('constructor', () => {
		it('uses the given supported language', () => {
			expect(new I18n('en-US').getLanguage()).toBe('en-US')
			expect(new I18n('zh-CN').getLanguage()).toBe('zh-CN')
		})

		it('falls back to en-US for an unknown language', () => {
			expect(new I18n('fr-FR' as never).getLanguage()).toBe('en-US')
		})
	})

	describe('t', () => {
		it('resolves a nested key', () => {
			expect(new I18n('en-US').t('ui.panel.ready')).toBe('Ready')
			expect(new I18n('zh-CN').t('ui.panel.ready')).toBe('准备就绪')
		})

		it('interpolates params and keeps unknown placeholders intact', () => {
			expect(new I18n('en-US').t('ui.panel.userAnswer', { input: 'yes' })).toBe('User answer: yes')
			expect(new I18n('en-US').t('ui.panel.step', { number: 3 })).toBe('Step 3')
			expect(new I18n('en-US').t('ui.panel.userAnswer', {})).toBe('User answer: {{input}}')
		})

		it('warns and returns the key for a missing translation', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
			const i18n = new I18n('en-US')

			expect(i18n.t('ui.panel.doesNotExist' as never)).toBe('ui.panel.doesNotExist')
			expect(warn).toHaveBeenCalledWith(
				'Translation key "ui.panel.doesNotExist" not found for language "en-US"'
			)

			warn.mockRestore()
		})
	})

	describe('prototype chain', () => {
		it('does not resolve inherited keys', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
			const i18n = new I18n('en-US')

			expect(i18n.t('toString' as never)).toBe('toString')
			expect(i18n.t('constructor' as never)).toBe('constructor')
			expect(i18n.t('__proto__' as never)).toBe('__proto__')
			expect(i18n.t('ui.panel.ready.toString' as never)).toBe('ui.panel.ready.toString')

			warn.mockRestore()
		})
	})
})
