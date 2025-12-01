import {
	type SupportedLanguage,
	type TranslationKey,
	type TranslationParams,
	type TranslationSchema,
	locales,
} from './locales'

export class I18n {
	private language: SupportedLanguage
	private translations: TranslationSchema

	constructor(language: SupportedLanguage = 'en-US') {
		this.language = language in locales ? language : 'en-US'
		this.translations = locales[language]
	}

	// 类型安全的翻译方法
	t(key: TranslationKey, params?: TranslationParams): string {
		const value = this.getNestedValue(this.translations, key)
		if (!value) {
			console.warn(`Translation key "${key}" not found for language "${this.language}"`)
			return key
		}

		if (params) {
			return this.interpolate(value, params)
		}
		return value
	}

	private getNestedValue(obj: any, path: string): string | undefined {
		return path.split('.').reduce((current, key) => current?.[key], obj)
	}

	private interpolate(template: string, params: TranslationParams): string {
		return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
			// Use != null to check for both null and undefined, allow empty strings
			return params[key] != null ? params[key].toString() : match
		})
	}

	getLanguage(): SupportedLanguage {
		return this.language
	}
}

// 导出类型和实例创建函数
export type { TranslationKey, SupportedLanguage, TranslationParams }
export { locales }
