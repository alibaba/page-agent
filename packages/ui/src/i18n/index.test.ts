import { describe, expect, it } from 'vitest'

import { I18n } from './index'

describe('I18n Arabic Support', () => {
	it('should translate correctly for ar-EG', () => {
		const i18n = new I18n('ar-EG')
		expect(i18n.getLanguage()).toBe('ar-EG')
		expect(i18n.t('ui.panel.ready')).toBe('جاهز')
		expect(i18n.t('ui.panel.thinking')).toBe('جاري التفكير...')
		expect(i18n.t('ui.panel.step', { number: 5 })).toBe('الخطوة 5')
	})

	it('should translate correctly for ar alias', () => {
		const i18n = new I18n('ar')
		expect(i18n.getLanguage()).toBe('ar')
		expect(i18n.t('ui.panel.stop')).toBe('إيقاف')
		expect(i18n.t('ui.tools.done')).toBe('انتهت المهمة')
	})
})
