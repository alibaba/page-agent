import { BookOpen, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { siGithub } from 'simple-icons'
import { Link } from 'wouter'

import { useLanguage } from '@/i18n/context'

import LanguageSwitcher from './LanguageSwitcher'
import ThemeSwitcher from './ThemeSwitcher'
import { HyperText } from './ui/hyper-text'

export default function Header() {
	const { isZh } = useLanguage()
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
							href="~/"
							className="flex items-center gap-2 sm:gap-3 group shrink-0"
							aria-label={isZh ? 'page-agent 首页' : 'page-agent home'}
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
								<HyperText
									as="p"
									className="hidden sm:block text-xs text-gray-600 dark:text-gray-300 py-0 font-normal overflow-visible"
									duration={600}
									animateOnHover={true}
									aria-hidden="true"
								>
									AI Agent In Your Webpage
								</HyperText>
							</div>
						</Link>

						{/* Mobile Icon Navigation (横向滚动) */}
						<nav
							className="md:hidden flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1"
							role="navigation"
							aria-label="Mobile navigation"
						>
							<Link
								href="~/docs/introduction/overview"
								className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 shrink-0"
								aria-label={isZh ? '文档' : 'Docs'}
							>
								<BookOpen className="w-5 h-5" />
							</Link>
							<a
								href="https://github.com/alibaba/page-agent"
								target="_blank"
								rel="noopener noreferrer"
								className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 shrink-0"
								aria-label="GitHub"
							>
								<svg
									role="img"
									viewBox="0 0 24 24"
									className="w-5 h-5 fill-current"
									aria-hidden="true"
								>
									<path d={siGithub.path} />
								</svg>
							</a>
						</nav>

						{/* Desktop Navigation */}
						<nav
							className="hidden md:flex items-center space-x-6"
							role="navigation"
							aria-label={isZh ? '文档' : 'Docs'}
						>
							<span className="text-xs font-mono text-gray-400 dark:text-gray-500 tabular-nums before:content-['v']">
								{import.meta.env.VERSION}
							</span>
							<Link
								href="~/docs/introduction/overview"
								className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
							>
								<BookOpen className="w-4 h-4" />
								{isZh ? '文档' : 'Docs'}
							</Link>
							<a
								href="https://github.com/alibaba/page-agent"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
								aria-label="GitHub"
							>
								<svg
									role="img"
									viewBox="0 0 24 24"
									className="w-4 h-4 fill-current"
									aria-hidden="true"
								>
									<path d={siGithub.path} />
								</svg>
								GitHub
							</a>
							<ThemeSwitcher />
							<LanguageSwitcher />
						</nav>

						{/* Mobile menu button */}
						<button
							type="button"
							className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 shrink-0"
							aria-label={isZh ? '打开导航栏' : 'Open navigation'}
							aria-expanded={mobileMenuOpen}
							aria-controls="mobile-menu"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						>
							{mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
								href="~/docs/introduction/overview"
								className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
								onClick={() => setMobileMenuOpen(false)}
							>
								<BookOpen className="w-5 h-5" />
								{isZh ? '文档' : 'Docs'}
							</Link>
							<a
								href="https://github.com/alibaba/page-agent"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
								aria-label="GitHub"
							>
								<svg
									role="img"
									viewBox="0 0 24 24"
									className="w-5 h-5 fill-current"
									aria-hidden="true"
								>
									<path d={siGithub.path} />
								</svg>
								GitHub
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
