import { describe, expect, it } from 'vitest'

import { I18n } from '../i18n'

describe('I18n', () => {
	it('translates a known key', () => {
		const i18n = new I18n('en-US')
		expect(i18n.t('ui.panel.ready')).toBe('Ready')
		expect(i18n.t('ui.panel.thinking')).toBe('Thinking...')
	})

	it('interpolates {{param}} placeholders', () => {
		const i18n = new I18n('en-US')
		const result = i18n.t('ui.errors.elementNotFound', { index: 42 })
		expect(result).toContain('42')
		expect(result).not.toContain('{{index}}')
	})

	it('returns key as fallback for missing translation', () => {
		const i18n = new I18n('en-US')
		const result = i18n.t('nonexistent.key' as any)
		expect(result).toBe('nonexistent.key')
	})

	it('supports zh-CN locale', () => {
		const i18n = new I18n('zh-CN')
		expect(i18n.getLanguage()).toBe('zh-CN')
		// Chinese "Ready" translation
		expect(i18n.t('ui.panel.ready')).not.toBe('Ready')
	})

	it('falls back to en-US for unknown language', () => {
		const i18n = new I18n('fr-FR' as any)
		expect(i18n.getLanguage()).toBe('en-US')
		expect(i18n.t('ui.panel.ready')).toBe('Ready')
	})

	it('preserves unmatched placeholders', () => {
		const i18n = new I18n('en-US')
		const result = i18n.t('ui.errors.elementNotFound', {})
		expect(result).toContain('{{index}}')
	})
})
