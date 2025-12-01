/**
 * 代码编辑器组件，模拟现代代码编辑器的外观
 */
import React from 'react'

import HighlightSyntax from './HighlightSyntax'

interface CodeEditorProps {
	code: string
	language?: string
	title?: string
	showLineNumbers?: boolean
	showHeader?: boolean
	showFooter?: boolean
	className?: string
}

const CodeEditor: React.FC<CodeEditorProps> = ({
	code,
	language = 'javascript',
	title,
	showLineNumbers = false,
	showHeader = false,
	showFooter = false,
	className = '',
}) => {
	const lines = code.split('\n')

	// 使用 Tailwind 的 dark: 前缀实现自动主题切换
	const containerClasses =
		'bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-gray-300 dark:border-gray-700'
	const headerClasses = 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
	const headerTextClasses = 'text-gray-700 dark:text-gray-300'
	const languageTextClasses = 'text-gray-600 dark:text-gray-400'
	const lineNumbersClasses =
		'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-500'
	const codeAreaClasses = 'bg-white dark:bg-gray-900'
	const footerClasses =
		'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'
	const copyButtonClasses =
		'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white'

	return (
		<div
			className={`group relative ${containerClasses} rounded-xl border shadow-2xl overflow-hidden ${className}`}
		>
			{/* 编辑器顶部栏 */}
			{showHeader && (
				<div className={`flex items-center justify-between px-4 py-3 ${headerClasses} border-b`}>
					<div className="flex items-center space-x-3">
						{/* 窗口控制按钮 */}
						<div className="flex space-x-2">
							<div className="w-3 h-3 bg-red-500 rounded-full"></div>
							<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
							<div className="w-3 h-3 bg-green-500 rounded-full"></div>
						</div>
						{title && (
							<span className={`text-sm ${headerTextClasses} font-medium ml-2`}>{title}</span>
						)}
					</div>
					<div className="flex items-center space-x-2">
						<span className={`text-xs ${languageTextClasses} uppercase tracking-wide`}>
							{language}
						</span>
						<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
					</div>
				</div>
			)}

			{/* 代码内容区域 */}
			<div className="relative">
				<div className="flex">
					{/* 行号 */}
					{showLineNumbers && (
						<div className={`shrink-0 px-4 py-4 ${lineNumbersClasses} border-r select-none`}>
							<div className="text-xs font-mono leading-6">
								{lines.map((line, lineIdx) => {
									const lineNum = lineIdx + 1
									return (
										<div key={`${lineNum}-${line.substring(0, 20)}`} className="text-right">
											{lineNum}
										</div>
									)
								})}
							</div>
						</div>
					)}

					{/* 代码内容 */}
					<div className={`flex-1 px-4 py-4 ${codeAreaClasses} overflow-x-auto`}>
						<div className="text-sm font-mono leading-6">
							<HighlightSyntax code={code} />
						</div>
					</div>
				</div>

				{/* 复制按钮 */}
				<button
					onClick={() => {
						navigator.clipboard.writeText(code).catch(console.error)
					}}
					className={`absolute top-3 right-3 p-2 ${copyButtonClasses} rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100`}
					title="复制代码"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
				</button>
			</div>

			{/* 底部状态栏 */}
			{showFooter && (
				<div className={`px-4 py-2 ${footerClasses} border-t`}>
					<div className="flex items-center justify-between text-xs">
						<span>{lines.length} lines</span>
						<span>UTF-8</span>
					</div>
				</div>
			)}
		</div>
	)
}

export default CodeEditor
