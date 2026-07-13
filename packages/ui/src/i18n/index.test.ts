import { describe, expect, it, vi } from 'vitest'

import { I18n, locales } from './index'

describe('I18n', () => {
	it('defaults to en-US', () => {
		expect(new I18n().getLanguage()).toBe('en-US')
	})

	it('falls back to en-US for unsupported languages', () => {
		const i18n = new I18n('fr-FR' as never)
		expect(i18n.getLanguage()).toBe('en-US')
		expect(i18n.t('ui.panel.ready')).toBe('Ready')
	})

	it('resolves nested keys for each supported language', () => {
		expect(new I18n('en-US').t('ui.panel.ready')).toBe('Ready')
		expect(new I18n('zh-CN').t('ui.panel.ready')).toBe('准备就绪')
	})

	it('returns the key and warns when translation is missing', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			const i18n = new I18n('en-US')
			expect(i18n.t('ui.panel.nope' as never)).toBe('ui.panel.nope')
			expect(warn).toHaveBeenCalledOnce()
		} finally {
			warn.mockRestore()
		}
	})

	describe('interpolation', () => {
		const i18n = new I18n('en-US')

		it('replaces {{param}} placeholders', () => {
			expect(i18n.t('ui.panel.step', { number: 3 })).toBe('Step 3')
		})

		it('accepts falsy values like 0 and empty string', () => {
			expect(i18n.t('ui.panel.step', { number: 0 })).toBe('Step 0')
			expect(i18n.t('ui.panel.userAnswer', { input: '' })).toBe('User answer: ')
		})

		it('keeps the placeholder when the param is not provided', () => {
			expect(i18n.t('ui.panel.step', {})).toBe('Step {{number}}')
		})
	})
})

describe('locales', () => {
	/** Collect every nested key path of a translation object */
	function keyPaths(obj: object, prefix = ''): string[] {
		return Object.entries(obj).flatMap(([key, value]) => {
			const path = prefix ? `${prefix}.${key}` : key
			return typeof value === 'object' && value !== null ? keyPaths(value, path) : [path]
		})
	}

	it('zh-CN matches the structure of en-US', () => {
		expect(keyPaths(locales['zh-CN'])).toEqual(keyPaths(locales['en-US']))
	})

	it('translations keep the same {{param}} placeholders across languages', () => {
		const params = (s: string) => (s.match(/\{\{(\w+)\}\}/g) ?? []).sort()
		const en = new I18n('en-US')
		const zh = new I18n('zh-CN')
		for (const path of keyPaths(locales['en-US'])) {
			expect(params(zh.t(path as never)), path).toEqual(params(en.t(path as never)))
		}
	})
})
