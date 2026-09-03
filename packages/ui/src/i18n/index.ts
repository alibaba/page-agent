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
		this.translations = locales[this.language]
	}

	// 类型安全的翻译方法
	t(key: TranslationKey, params?: TranslationParams): string {
		const value = this.getNestedValue(this.translations, key)
		// Only a string is a translation. A key that lands on an intermediate
		// object ('ui.panel') used to reach interpolate() and throw
		// `template.replace is not a function`, and the previous falsy check
		// also rejected a legitimately empty translation.
		if (typeof value !== 'string') {
			console.warn(`Translation key "${key}" not found for language "${this.language}"`)
			return key
		}

		if (params) {
			return this.interpolate(value, params)
		}
		return value
	}

	private getNestedValue(obj: unknown, path: string): unknown {
		// Own properties only: `current?.[key]` walks the prototype chain, so
		// t('toString') resolved to Object.prototype.toString — a Function
		// returned from a method whose signature promises a string.
		return path
			.split('.')
			.reduce<unknown>(
				(current, key) =>
					typeof current === 'object' && current !== null && Object.hasOwn(current, key)
						? (current as Record<string, unknown>)[key]
						: undefined,
				obj
			)
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
