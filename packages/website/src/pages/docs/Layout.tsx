import { ReactNode } from 'react'
import { siGooglechrome } from 'simple-icons'
import { Link, useLocation } from 'wouter'

import { SparklesText } from '@/components/ui/sparkles-text'
import { useLanguage } from '@/i18n/context'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

interface DocsLayoutProps {
	children: ReactNode
}

interface NavItem {
	title: string
	path: string
}

interface NavSection {
	title: string
	items: NavItem[]
}

export default function DocsLayout({ children }: DocsLayoutProps) {
	const { isZh } = useLanguage()
	const [location] = useLocation()

	const navigationSections: NavSection[] = [
		{
			title: isZh ? '介绍' : 'Introduction',
			items: [
				{ title: isZh ? '概览' : 'Overview', path: '/introduction/overview' },
				{ title: isZh ? '快速开始' : 'Quick Start', path: '/introduction/quick-start' },
				{ title: isZh ? '使用限制' : 'Limitations', path: '/introduction/limitations' },
				{
					title: isZh ? '故障排查' : 'Troubleshooting',
					path: '/introduction/troubleshooting',
				},
			],
		},
		{
			title: isZh ? '功能特性' : 'Features',
			items: [
				{ title: isZh ? '模型' : 'Models', path: '/features/models' },
				{ title: isZh ? '自定义工具' : 'Custom Tools', path: '/features/custom-tools' },
				{ title: isZh ? '知识注入' : 'Instructions', path: '/features/custom-instructions' },
				{ title: isZh ? '数据脱敏' : 'Data Masking', path: '/features/data-masking' },
				{ title: isZh ? 'Chrome 扩展' : 'Chrome Extension', path: '/features/chrome-extension' },
				{
					title: isZh ? '接入第三方 Agent' : 'Third-party Agent',
					path: '/features/third-party-agent',
				},
			],
		},
		{
			title: isZh ? '高级' : 'Advanced',
			items: [
				{ title: 'PageAgent', path: '/advanced/page-agent' },
				{ title: 'PageAgentCore', path: '/advanced/page-agent-core' },
				{ title: 'PageController', path: '/advanced/page-controller' },
				{ title: isZh ? '自定义 UI' : 'Custom UI', path: '/advanced/custom-ui' },
				{
					title: '🚧 ' + (isZh ? '安全与权限' : 'Security & Permissions'),
					path: '/advanced/security-permissions',
				},
			],
		},
	]

	const activeTitle = navigationSections
		.flatMap((s) => s.items)
		.find((item) => item.path === location)?.title

	useDocumentTitle(activeTitle)

	return (
		<div className="max-w-7xl mx-auto px-6 py-8 overflow-x-auto">
			<div className="flex gap-8 min-w-225">
				{/* Sidebar */}
				<aside className="w-64 shrink-0" role="complementary" aria-label="文档导航">
					<div className="sticky">
						<nav className="space-y-8" role="navigation" aria-label="文档章节">
							{navigationSections.map((section) => (
								<section key={section.title}>
									<h3 className="font-semibold text-muted-foreground uppercase tracking-wider mb-3">
										{section.title}
									</h3>
									<ul className="space-y-2" role="list">
										{section.items.map((item) => {
											const isActive = location === item.path
											const isChromeExtension = item.path === '/features/chrome-extension'
											return (
												<li key={item.path}>
													<Link
														href={item.path}
														className={`block px-3 py-2 rounded-lg transition-colors duration-200 ${
															isActive
																? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
																: 'text-muted-foreground hover:text-foreground hover:bg-accent'
														}`}
														aria-current={isActive ? 'page' : undefined}
													>
														{isChromeExtension ? (
															<span className="flex items-center gap-1.5">
																<svg
																	className="w-3.5 h-3.5 shrink-0"
																	viewBox="0 0 24 24"
																	aria-hidden="true"
																>
																	<path d={siGooglechrome.path} fill="currentColor" />
																</svg>
																<SparklesText
																	className="text-[length:inherit] font-[inherit] font-medium"
																	sparklesCount={3}
																>
																	{item.title}
																</SparklesText>
															</span>
														) : (
															item.title
														)}
													</Link>
												</li>
											)
										})}
									</ul>
								</section>
							))}
						</nav>
					</div>
				</aside>

				{/* Main Content */}
				<main className="flex-1 min-w-0" id="main-content" role="main">
					<div className="prose dark:prose-invert max-w-none">{children}</div>
				</main>
			</div>
		</div>
	)
}
