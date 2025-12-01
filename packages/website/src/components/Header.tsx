import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'

import LanguageSwitcher from './LanguageSwitcher'
import ThemeSwitcher from './ThemeSwitcher'
import { BookIcon, CloseIcon, GithubIcon, MenuIcon } from './icons'

export default function Header() {
	const { t } = useTranslation('common')
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

	return (
		<>
			<header
				className="relative z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
				role="banner"
			>
				<div className="max-w-7xl mx-auto px-6 py-4">
					<div className="flex items-center justify-between gap-2">
						{/* Logo */}
						<Link
							href="/"
							className="flex items-center gap-2 sm:gap-3 group shrink-0"
							aria-label={t('header.logo_alt')}
							onClick={() => setMobileMenuOpen(false)}
						>
							<img
								src="https://img.alicdn.com/imgextra/i2/O1CN01HB8ylu1uozANEMZw2_!!6000000006085-49-tps-128-128.webp"
								alt="PageAgent Logo"
								className="w-10 h-10 rounded-xl group-hover:scale-110 transition-transform duration-200"
							/>
							<div>
								<span className="text-base sm:text-xl font-bold text-gray-900 dark:text-white block leading-tight">
									page-agent
								</span>
								<p className="hidden sm:block text-xs text-gray-600 dark:text-gray-300">
									{t('header.slogan')}
								</p>
							</div>
						</Link>

						{/* Mobile Icon Navigation (横向滚动) */}
						<nav
							className="md:hidden flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1"
							role="navigation"
							aria-label="Mobile navigation"
						>
							<Link
								href="/docs/introduction/overview"
								className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 shrink-0"
								aria-label={t('header.nav_docs')}
							>
								<BookIcon className="w-5 h-5" />
							</Link>
							<a
								href="https://github.com/alibaba/page-agent"
								target="_blank"
								rel="noopener noreferrer"
								className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 shrink-0"
								aria-label={t('header.nav_source')}
							>
								<GithubIcon className="w-5 h-5" />
							</a>
						</nav>

						{/* Desktop Navigation */}
						<nav
							className="hidden md:flex items-center space-x-6"
							role="navigation"
							aria-label={t('header.nav_docs')}
						>
							<Link
								href="/docs/introduction/overview"
								className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
							>
								<BookIcon />
								{t('header.nav_docs')}
							</Link>
							<a
								href="https://github.com/alibaba/page-agent"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
								aria-label={t('header.nav_source')}
							>
								<GithubIcon />
								{t('header.nav_source')}
							</a>
							<ThemeSwitcher />
							<LanguageSwitcher />
						</nav>

						{/* Mobile menu button */}
						<button
							type="button"
							className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 shrink-0"
							aria-label={t('header.mobile_menu')}
							aria-expanded={mobileMenuOpen}
							aria-controls="mobile-menu"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						>
							{mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
						</button>
					</div>

					{/* Mobile Navigation */}
					{mobileMenuOpen && (
						<nav
							id="mobile-menu"
							className="md:hidden pt-4 pb-2 space-y-3 border-t border-gray-200 dark:border-gray-700 mt-4"
							role="navigation"
						>
							<Link
								href="/docs/introduction/overview"
								className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
								onClick={() => setMobileMenuOpen(false)}
							>
								<BookIcon className="w-5 h-5" />
								{t('header.nav_docs')}
							</Link>
							<a
								href="https://github.com/alibaba/page-agent"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
								aria-label={t('header.nav_source')}
							>
								<GithubIcon className="w-5 h-5" />
								{t('header.nav_source')}
							</a>
							<div className="flex items-center gap-3 px-3 py-2">
								<ThemeSwitcher />
								<LanguageSwitcher />
							</div>
						</nav>
					)}
				</div>
			</header>
		</>
	)
}
