import { useEffect, useRef, useState } from 'react'

import { useLanguage } from '@/i18n/context'

export default function LanguageSwitcher() {
	const { language, isZh, setLanguage } = useLanguage()
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)

	const languages = [
		{ code: 'zh-CN' as const, label: '中文' },
		{ code: 'en-US' as const, label: 'English' },
	]

	const currentLanguage = languages.find((lang) => lang.code === language) || languages[0]

	const handleLanguageChange = (langCode: 'zh-CN' | 'en-US') => {
		setLanguage(langCode)
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
				className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-accent transition-colors text-sm font-medium border border-border text-muted-foreground"
				aria-label={isZh ? '切换语言' : 'Switch language'}
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
					className="absolute right-0 mt-2 w-40 bg-popover rounded-lg shadow-lg border border-border py-1 z-50"
					role="menu"
					aria-orientation="vertical"
				>
					{languages.map((lang) => (
						<button
							key={lang.code}
							onClick={() => handleLanguageChange(lang.code)}
							className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-accent transition-colors ${
								language === lang.code
									? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
									: 'text-muted-foreground'
							}`}
							role="menuitem"
						>
							<span>{lang.label}</span>
							{language === lang.code && (
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
