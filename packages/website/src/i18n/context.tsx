import { ReactNode, createContext, use, useState } from 'react'

type Lang = 'en-US' | 'zh-CN'

const LanguageContext = createContext<{
	language: Lang
	isZh: boolean
	setLanguage: (lang: Lang) => void
} | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
	const [language, setLanguage] = useState<Lang>(() => {
		const stored = localStorage.getItem('language') as Lang
		if (stored === 'zh-CN' || stored === 'en-US') return stored
		return navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'
	})

	const switchLanguage = (lang: Lang) => {
		setLanguage(lang)
		localStorage.setItem('language', lang)
	}

	return (
		<LanguageContext value={{ language, isZh: language === 'zh-CN', setLanguage: switchLanguage }}>
			{children}
		</LanguageContext>
	)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
	const ctx = use(LanguageContext)
	if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
	return ctx
}
