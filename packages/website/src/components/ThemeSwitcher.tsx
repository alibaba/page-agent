import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export default function ThemeSwitcher() {
	const [theme, setTheme] = useState<Theme>(() => {
		// 初始化时读取保存的主题
		if (typeof window !== 'undefined') {
			const savedTheme = localStorage.getItem('theme') as Theme | null
			if (savedTheme === 'light' || savedTheme === 'dark') {
				return savedTheme
			}
			// 默认跟随系统
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
		}
		return 'light'
	})

	useEffect(() => {
		// 应用主题
		if (theme === 'dark') {
			document.documentElement.classList.add('dark')
			document.documentElement.style.colorScheme = 'dark'
		} else {
			document.documentElement.classList.remove('dark')
			document.documentElement.style.colorScheme = 'light'
		}
		// 保存到 localStorage
		localStorage.setItem('theme', theme)
	}, [theme])

	// 监听系统主题变化
	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

		const handleSystemThemeChange = (e: MediaQueryListEvent) => {
			// 只有在用户未手动设置时才自动跟随系统
			const savedTheme = localStorage.getItem('theme')
			if (!savedTheme) {
				setTheme(e.matches ? 'dark' : 'light')
			}
		}

		mediaQuery.addEventListener('change', handleSystemThemeChange)
		return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
	}, [])

	const toggleTheme = () => {
		setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
	}

	return (
		<button
			onClick={toggleTheme}
			className="relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 ease-in-out focus:outline-none"
			style={{
				backgroundColor: theme === 'dark' ? '#1e293b' : '#e0f2fe',
			}}
			aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
			role="switch"
			aria-checked={theme === 'dark'}
		>
			{/* 滑块 */}
			<span
				className="inline-block h-6 w-6 transform rounded-full transition-all duration-300 ease-in-out shadow-md"
				style={{
					backgroundColor: theme === 'dark' ? '#475569' : '#fbbf24',
					transform: theme === 'dark' ? 'translateX(2.25rem)' : 'translateX(0.25rem)',
				}}
			>
				{/* 图标 */}
				<span className="flex items-center justify-center h-full w-full">
					{theme === 'light' ? (
						// 太阳图标
						<svg
							className="w-4 h-4 text-white"
							fill="currentColor"
							viewBox="0 0 20 20"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
								clipRule="evenodd"
							/>
						</svg>
					) : (
						// 月亮图标
						<svg
							className="w-4 h-4 text-slate-200"
							fill="currentColor"
							viewBox="0 0 20 20"
							aria-hidden="true"
						>
							<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
						</svg>
					)}
				</span>
			</span>

			{/* 背景装饰 */}
			<span
				className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none"
				aria-hidden="true"
			>
				{/* 左侧太阳（浅色模式时显示） */}
				<span
					className={`transition-opacity duration-300 ${
						theme === 'light' ? 'opacity-0' : 'opacity-40'
					}`}
				>
					<svg className="w-4 h-4 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
							clipRule="evenodd"
						/>
					</svg>
				</span>
				{/* 右侧月亮（深色模式时显示） */}
				<span
					className={`transition-opacity duration-300 ${
						theme === 'dark' ? 'opacity-0' : 'opacity-40'
					}`}
				>
					<svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
						<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
					</svg>
				</span>
			</span>
		</button>
	)
}
