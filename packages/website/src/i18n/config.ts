import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import commonEn from './locales/en-US/common'
import docsEn from './locales/en-US/docs'
import homeEn from './locales/en-US/home'
import commonZh from './locales/zh-CN/common'
import docsZh from './locales/zh-CN/docs'
import homeZh from './locales/zh-CN/home'

const resources = {
	'zh-CN': {
		common: commonZh,
		home: homeZh,
		docs: docsZh,
	},
	'en-US': {
		common: commonEn,
		home: homeEn,
		docs: docsEn,
	},
}

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: 'en-US',
		defaultNS: 'common',

		// 语言检测配置
		detection: {
			// localStorage 优先（用户手动选择），其次检测浏览器语言
			order: ['localStorage', 'navigator'],
			caches: ['localStorage'],
		},

		interpolation: {
			escapeValue: false, // React 已经做了 XSS 防护
		},
	})

export default i18n
