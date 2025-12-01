import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
	const { i18n, t } = useTranslation('common')
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)

	const currentLang = i18n.language

	const languages = [
		{ code: 'zh-CN', label: '中文' },
		{ code: 'en-US', label: 'English' },
	]

	const currentLanguage = languages.find((lang) => lang.code === currentLang) || languages[0]

	const handleLanguageChange = (langCode: string) => {
		i18n.changeLanguage(langCode)
		setIsOpen(false)
	}

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen])

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
				aria-label={t('language.switch_label')}
				aria-expanded={isOpen}
				aria-haspopup="true"
			>
				<svg
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
					/>
				</svg>
				<span>{currentLanguage.label}</span>
				<svg
					className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{isOpen && (
				<div
					className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
					role="menu"
					aria-orientation="vertical"
				>
					{languages.map((lang) => (
						<button
							key={lang.code}
							onClick={() => handleLanguageChange(lang.code)}
							className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
								currentLang === lang.code
									? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
									: 'text-gray-700 dark:text-gray-300'
							}`}
							role="menuitem"
						>
							<span>{lang.label}</span>
							{currentLang === lang.code && (
								<svg
									className="w-4 h-4 ml-auto"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	)
}
