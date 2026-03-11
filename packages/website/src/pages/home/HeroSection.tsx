/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import type { PageAgent as PageAgentType } from 'page-agent'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'wouter'

import { AnimatedGradientText } from '../../components/ui/animated-gradient-text'
import { Highlighter } from '../../components/ui/highlighter'
import { NeonGradientCard } from '../../components/ui/neon-gradient-card'
import { Particles } from '../../components/ui/particles'
import {
	CDN_DEMO_CN_URL,
	CDN_DEMO_URL,
	DEMO_API_KEY,
	DEMO_BASE_URL,
	DEMO_MODEL,
} from '../../constants'
import { useLanguage } from '../../i18n/context'

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let pageAgentModule: Promise<typeof import('page-agent')> | null = null

function getInjection(useCN?: boolean) {
	const cdn = useCN ? CDN_DEMO_CN_URL : CDN_DEMO_URL

	const injection = encodeURI(
		`javascript:(function(){var s=document.createElement('script');s.src=\`${cdn}?t=\${Math.random()}\`;s.setAttribute('crossorigin', true);s.type="text/javascript";s.onload=()=>console.log('PageAgent script loaded!');document.body.appendChild(s);})();`
	)

	return `
	<a
		href=${injection}
		class="inline-flex items-center text-xs px-3 py-2 bg-blue-500 text-white font-medium rounded-lg hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-move border-2 border-dashed border-green-300"
		draggable="true"
		onclick="return false;"
		title="Drag me to your bookmarks bar!"
	>
		✨PageAgent
	</a>
	`
}

export default function HeroSection() {
	const { language, isZh } = useLanguage()

	const defaultTask = isZh
		? '从导航栏中进入文档页，打开"快速开始"相关的文档，帮我总结成 markdown'
		: 'Goto docs in navigation bar, find Quick-Start section, and summarize in markdown'

	const [task, setTask] = useState(() => defaultTask)

	useEffect(() => {
		setTask(defaultTask)
	}, [defaultTask])

	const [params] = useSearchParams()
	const isOther = params.has('try_other')

	const [activeTab, setActiveTab] = useState<'try' | 'other'>(isOther ? 'other' : 'try')
	const [cdnSource, setCdnSource] = useState<'international' | 'china'>('international')

	const [ready, setReady] = useState(false)
	useEffect(() => {
		pageAgentModule ??= import('page-agent')
		pageAgentModule.then(() => setReady(true))
	}, [])

	const handleExecute = async () => {
		if (!task.trim() || !ready || !pageAgentModule) return

		const { PageAgent } = await pageAgentModule
		const win = window as any

		if (!win.pageAgent || win.pageAgent.disposed) {
			win.pageAgent = new (PageAgent as typeof PageAgentType)({
				interactiveBlacklist: [document.getElementById('root')!],
				language: language,

				instructions: {
					system: 'You are a helpful assistant on PageAgent website.',
					getPageInstructions: (url: string) => {
						const hint = url.includes('page-agent') ? 'This is PageAgent demo page.' : undefined
						console.log('[instructions] getPageInstructions:', url, '->', hint)
						return hint
					},
				},

				model:
					import.meta.env.DEV && import.meta.env.LLM_MODEL_NAME
						? import.meta.env.LLM_MODEL_NAME
						: DEMO_MODEL,
				baseURL:
					import.meta.env.DEV && import.meta.env.LLM_BASE_URL
						? import.meta.env.LLM_BASE_URL
						: DEMO_BASE_URL,
				apiKey:
					import.meta.env.DEV && import.meta.env.LLM_API_KEY
						? import.meta.env.LLM_API_KEY
						: DEMO_API_KEY,
			})
		}

		const result = await win.pageAgent.execute(task)
		console.log(result)
	}

	return (
		<section
			className="relative px-6 pt-24 py-20 pb-18 lg:py-22 lg:pt-28 overflow-hidden"
			aria-labelledby="hero-heading"
		>
			<div className="max-w-7xl mx-auto text-center">
				{/* Background Pattern + Particles */}
				<div className="absolute inset-0 opacity-30" aria-hidden="true">
					<div className="absolute inset-0 bg-linear-to-r from-blue-400/20 to-purple-400/20 rounded-3xl transform rotate-1"></div>
					<div className="absolute inset-0 bg-linear-to-l from-purple-400/20 to-blue-400/20 rounded-3xl transform -rotate-1"></div>
				</div>
				<Particles
					className="absolute inset-0"
					quantity={80}
					staticity={30}
					ease={80}
					color="#6366f1"
				/>

				<div className="relative z-10">
					<div className="inline-flex items-center px-4 py-2 mb-8 text-sm font-medium bg-card/90 rounded-full shadow-lg border border-border">
						<span
							className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"
							aria-hidden="true"
						></span>
						<AnimatedGradientText colorFrom="#3b82f6" colorTo="#8b5cf6">
							AI Agent In Your Webpage
						</AnimatedGradientText>
					</div>

					<h1
						id="hero-heading"
						className="text-5xl lg:text-7xl font-bold mb-14 mt-8 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent pb-1"
					>
						{isZh ? (
							<>
								<span className="text-6xl lg:text-7xl">你网站里的 AI 操作员</span>
								<span className="block text-xl lg:text-2xl mt-5 font-medium bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
									The AI Operator Living in Your Web Page
								</span>
							</>
						) : (
							<>
								The AI Operator
								<br />
								Living in Your Web Page
							</>
						)}
					</h1>

					<p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed">
						<Highlighter action="underline" color="#8b5cf6" strokeWidth={2}>
							<span className="bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-bold">
								{isZh ? '🪄一行代码' : '🪄One line of code'}
							</span>
						</Highlighter>
						{isZh
							? '，让你的网站变身 AI 原生应用。'
							: ', turns your website into an AI-native app.'}
						<br />
						{isZh
							? '用户/答疑机器人给出文字指示，AI 帮你操作页面。'
							: 'Users give natural language commands, AI handles the rest.'}
					</p>

					{/* Try It Now Section - Tab Card */}
					<div className="mb-12">
						<div className="max-w-3xl mx-auto">
							<NeonGradientCard
								borderSize={2}
								borderRadius={20}
								neonColors={{ firstColor: '#ff00aa', secondColor: '#00FFF1' }}
							>
								{/* Tab Headers */}
								<div className="flex border-b border-border">
									<button
										onClick={() => setActiveTab('try')}
										className={`cursor-pointer flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 rounded-tl-2xl ${
											activeTab === 'try'
												? 'bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
												: 'text-muted-foreground hover:text-foreground hover:bg-accent'
										}`}
									>
										{isZh ? '🚀 立即尝试' : '🚀 Try It Now'}
									</button>
									<button
										onClick={() => setActiveTab('other')}
										className={`cursor-pointer flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 rounded-tr-2xl ${
											activeTab === 'other'
												? 'bg-linear-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 text-green-700 dark:text-green-300 border-b-2 border-green-500'
												: 'text-muted-foreground hover:text-foreground hover:bg-accent'
										}`}
									>
										{isZh ? '🌐 其他网页尝试' : '🌐 Try on Other Sites'}
									</button>
								</div>

								{/* Tab Content */}
								<div className="p-4">
									{activeTab === 'try' && (
										<div className="space-y-4">
											<div className="relative">
												<input
													value={task}
													onChange={(e) => setTask(e.target.value)}
													placeholder={
														isZh
															? '输入您想要 AI 执行的任务...'
															: 'Describe what you want AI to do...'
													}
													className="w-full px-4 py-3 pr-20 border border-border rounded-lg bg-card text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm mb-0"
													data-page-agent-not-interactive
												/>
												<button
													onClick={handleExecute}
													disabled={!ready}
													className="absolute right-2 top-2 px-5 py-1.5 bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium rounded-md hover:shadow-md transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
													data-page-agent-not-interactive
												>
													{ready ? (
														isZh ? (
															'执行'
														) : (
															'Run'
														)
													) : (
														<span className="animate-pulse">
															{isZh ? '准备中...' : 'Preparing...'}
														</span>
													)}
												</button>
											</div>
											<p className="text-xs text-muted-foreground text-left">
												{isZh ? (
													<>
														使用免费测试 LLM API，点击执行即表示您同意
														<a
															href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use"
															target="_blank"
															rel="noopener noreferrer"
															className="underline"
														>
															使用条款
														</a>
													</>
												) : (
													<>
														Powered by free testing LLM API. By clicking Run you agree to the{' '}
														<a
															href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use"
															target="_blank"
															rel="noopener noreferrer"
															className="underline"
														>
															Terms of Use
														</a>
													</>
												)}
											</p>
										</div>
									)}

									{activeTab === 'other' && (
										<div className="grid md:grid-cols-2 gap-6">
											{/* 左侧：操作步骤 */}
											<div className="space-y-4">
												<div className="bg-blue-50 dark:bg-card p-4 rounded-lg">
													<p className="text-muted-foreground text-sm mb-3">
														<span className="font-semibold">{isZh ? '步骤 1:' : 'Step 1:'}</span>{' '}
														{isZh ? '显示收藏夹栏' : 'Show your bookmarks bar'}
													</p>
													<div className="flex items-center justify-center gap-2">
														<kbd className="px-2 py-1 bg-muted border border-border rounded text-xs font-mono">
															Ctrl + Shift + B
														</kbd>
														<span className="text-muted-foreground">{isZh ? '或' : 'or'}</span>
														<kbd className="px-2 py-1 bg-muted border border-border rounded text-xs font-mono">
															⌘ + Shift + B
														</kbd>
													</div>
												</div>

												<div className="bg-green-50 dark:bg-card p-4 rounded-lg">
													<p className="text-muted-foreground text-sm mb-3">
														<span className="font-semibold">{isZh ? '步骤 2:' : 'Step 2:'}</span>{' '}
														{isZh ? '拖拽下面按钮到收藏夹栏' : 'Drag this button to your bookmarks'}
													</p>
													<div className="flex items-center justify-center gap-3">
														<select
															value={cdnSource}
															onChange={(e) =>
																setCdnSource(e.target.value as 'international' | 'china')
															}
															className="px-2 py-1.5 text-xs border border-border rounded bg-muted text-muted-foreground"
														>
															<option value="international">jsdelivr CDN</option>
															<option value="china">npmmirror CDN</option>
														</select>
														<div
															dangerouslySetInnerHTML={{
																__html: getInjection(cdnSource === 'china'),
															}}
														></div>
													</div>
												</div>

												<div className="bg-purple-50 dark:bg-card p-4 rounded-lg">
													<p className="text-muted-foreground text-sm">
														<span className="font-semibold">{isZh ? '步骤 3:' : 'Step 3:'}</span>{' '}
														{isZh
															? '在其他网站点击收藏夹中的按钮即可使用'
															: 'Click the bookmark on any site to activate'}
													</p>
												</div>
											</div>

											{/* 右侧：注意事项 */}
											<div className="bg-yellow-50 dark:bg-card p-4 rounded-lg">
												<h4 className="font-semibold text-foreground mb-3 text-sm">
													{isZh ? '⚠️ 注意' : '⚠️ Heads Up'}
												</h4>
												<ul className="space-y-2 text-sm text-muted-foreground">
													<li className="flex items-start text-left">
														<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
														{isZh ? (
															<span>
																使用免费测试 LLM API，使用即表示同意
																<a
																	href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use"
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-yellow-700 dark:text-yellow-300 underline"
																>
																	使用条款
																</a>
															</span>
														) : (
															<span>
																Uses free testing LLM API. By using you agree to the{' '}
																<a
																	href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use"
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-yellow-700 dark:text-yellow-300 underline"
																>
																	Terms of Use
																</a>
															</span>
														)}
													</li>
													<li className="flex items-start text-left">
														<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
														{isZh
															? '数据通过中国大陆服务器处理'
															: 'Data processed via servers in Mainland China'}
													</li>
													<li className="flex items-start text-left">
														<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
														{isZh
															? '部分网站屏蔽了链接嵌入，将无反应'
															: 'Some sites block script injection (CSP policies)'}
													</li>
													<li className="flex items-start text-left">
														<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
														{isZh ? '支持单页应用' : 'Works on single-page apps'}
													</li>
													<li className="flex items-start text-left">
														<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
														{isZh
															? '仅识别文本，不识别图像，不支持拖拽等复杂交互'
															: 'Text-only understanding—no image recognition or drag-and-drop'}
													</li>
													<li className="flex items-start text-left">
														<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
														{isZh ? '详细使用限制参照' : 'Full limitations in'}
														<Link
															href="/docs/introduction/limitations"
															className="text-blue-600 dark:text-blue-400 hover:underline pl-1"
														>
															{isZh ? '《文档》' : 'Docs'}
														</Link>
													</li>
												</ul>
											</div>
										</div>
									)}
								</div>
							</NeonGradientCard>
						</div>
					</div>

					<ul
						className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
						role="list"
					>
						<li className="flex items-center">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2" aria-hidden="true"></span>
							{isZh ? '纯前端方案' : 'Pure Front-end Solution'}
						</li>
						<li className="flex items-center">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2" aria-hidden="true"></span>
							{isZh ? '支持私有模型' : 'Your Own Models'}
						</li>
						<li className="flex items-center">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2" aria-hidden="true"></span>
							{isZh ? '无痛脱敏' : 'Built-in Privacy'}
						</li>
						<li className="flex items-center">
							<span className="w-2 h-2 bg-green-500 rounded-full mr-2" aria-hidden="true"></span>
							{isZh ? 'MIT 开源' : 'MIT Open Source'}
						</li>
					</ul>
				</div>
			</div>
		</section>
	)
}
