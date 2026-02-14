/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import {
	Bot,
	Box,
	ExternalLink,
	MessageSquare,
	PlayCircle,
	Shield,
	Sparkles,
	Users,
	Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { siGooglechrome } from 'simple-icons'
import { Link, useSearchParams } from 'wouter'

import Footer from '../components/Footer'
import Header from '../components/Header'
import { AnimatedGradientText } from '../components/ui/animated-gradient-text'
import { Highlighter } from '../components/ui/highlighter'
import { NeonGradientCard } from '../components/ui/neon-gradient-card'
import { Particles } from '../components/ui/particles'
import { SparklesText } from '../components/ui/sparkles-text'
import {
	CDN_DEMO_CN_URL,
	CDN_DEMO_URL,
	DEMO_API_KEY,
	DEMO_BASE_URL,
	DEMO_MODEL,
} from '../constants'
import { useLanguage } from '../i18n/context'

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

export default function HomePage() {
	const { language, isZh } = useLanguage()

	const defaultTask = isZh
		? '从导航栏中进入文档页，打开"快速开始"相关的文档，帮我总结成 markdown'
		: 'Goto docs in navigation bar, find Quick-Start section, and summarize in markdown'

	const [task, setTask] = useState(() => defaultTask)

	// Update task when language changes
	useEffect(() => {
		setTask(defaultTask)
	}, [defaultTask])

	const [params, setParams] = useSearchParams()
	const isOther = params.has('try_other')

	const [activeTab, setActiveTab] = useState<'try' | 'other'>(isOther ? 'other' : 'try')
	const [cdnSource, setCdnSource] = useState<'international' | 'china'>('international')

	const handleExecute = async () => {
		if (!task.trim()) return

		const win = window as any

		// Lazy load PageAgent only when user clicks execute
		if (!win.pageAgent || win.pageAgent.disposed) {
			const { PageAgent } = await import('page-agent')
			win.pageAgent = new PageAgent({
				// 把 react 根元素排除掉，挂了很多冒泡时间导致假阳
				interactiveBlacklist: [document.getElementById('root')!],
				language: language,

				instructions: {
					system: 'You are a helpful assistant on PageAgent website.',
					getPageInstructions: (url) => {
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

				// enableAskUser: false,
				// promptForNextTask: false,
				// enablePanel: false,
			})
		}

		const result = await win.pageAgent.execute(task)
		console.log(result)
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
			<Header />

			{/* Hero Section */}
			<main id="main-content">
				<section
					className="relative px-6 py-22 pb-18 lg:py-28 overflow-hidden"
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
							<div className="inline-flex items-center px-4 py-2 mb-8 text-sm font-medium bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
								<span
									className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"
									aria-hidden="true"
								></span>
								<AnimatedGradientText colorFrom="#3b82f6" colorTo="#8b5cf6">
									GUI Agent in your webpage
								</AnimatedGradientText>
							</div>

							<h1
								id="hero-heading"
								className="text-5xl lg:text-7xl font-bold mb-8 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent pb-1"
							>
								{isZh ? '让你的 Web 应用' : 'The AI Operator'}
								<br />
								{isZh ? '拥有 AI 操作员' : 'Living in Your Web App'}
							</h1>

							<p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
								<Highlighter action="underline" color="#8b5cf6" strokeWidth={2}>
									<span className="bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-bold">
										{isZh ? '🪄一行代码' : '🪄One line of code'}
									</span>
								</Highlighter>
								{isZh
									? '，为你的网站添加 GUI Agent。'
									: ' adds intelligent GUI Agents to your website.'}
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
										<div className="flex border-b border-gray-200 dark:border-gray-700">
											<button
												onClick={() => setActiveTab('try')}
												className={`flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 rounded-tl-2xl ${
													activeTab === 'try'
														? 'bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
														: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
												}`}
											>
												{isZh ? '🚀 立即尝试' : '🚀 Try It Now'}
											</button>
											<button
												onClick={() => setActiveTab('other')}
												className={`flex-1 px-4 py-4 text-lg font-medium transition-colors duration-200 rounded-tr-2xl ${
													activeTab === 'other'
														? 'bg-linear-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 text-green-700 dark:text-green-300 border-b-2 border-green-500'
														: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
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
															className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm mb-0"
															data-page-agent-not-interactive
														/>
														<button
															onClick={handleExecute}
															// disabled
															// disabled={!task.trim()}
															className="absolute right-2 top-2 px-5 py-1.5 bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium rounded-md hover:shadow-md transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
															data-page-agent-not-interactive
														>
															{isZh ? '执行' : 'Run'}
														</button>
													</div>
												</div>
											)}

											{activeTab === 'other' && (
												<div className="grid md:grid-cols-2 gap-6">
													{/* 左侧：操作步骤 */}
													<div className="space-y-4">
														{/* Keyboard Shortcut Hint */}
														<div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg">
															<p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
																<span className="font-semibold">
																	{isZh ? '步骤 1:' : 'Step 1:'}
																</span>{' '}
																{isZh ? '显示收藏夹栏' : 'Show your bookmarks bar'}
															</p>
															<div className="flex items-center justify-center gap-2">
																<kbd className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-xs font-mono">
																	Ctrl + Shift + B
																</kbd>
																<span className="text-gray-500 dark:text-gray-400">
																	{isZh ? '或' : 'or'}
																</span>
																<kbd className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-xs font-mono">
																	⌘ + Shift + B
																</kbd>
															</div>
														</div>

														{/* Draggable Bookmarklet */}
														<div className="bg-green-50 dark:bg-gray-700 p-4 rounded-lg">
															<p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
																<span className="font-semibold">
																	{isZh ? '步骤 2:' : 'Step 2:'}
																</span>{' '}
																{isZh
																	? '拖拽下面按钮到收藏夹栏'
																	: 'Drag this button to your bookmarks'}
															</p>
															<div className="flex items-center justify-center gap-3">
																<select
																	value={cdnSource}
																	onChange={(e) =>
																		setCdnSource(e.target.value as 'international' | 'china')
																	}
																	className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200"
																>
																	<option value="international">
																		{isZh ? '国际' : 'International'}
																	</option>
																	<option value="china">
																		{isZh ? '国内镜像' : 'China Mirror'}
																	</option>
																</select>
																<div
																	dangerouslySetInnerHTML={{
																		__html: getInjection(cdnSource === 'china'),
																	}}
																></div>
															</div>
														</div>

														{/* Usage Instructions */}
														<div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
															<p className="text-gray-700 dark:text-gray-300 text-sm">
																<span className="font-semibold">
																	{isZh ? '步骤 3:' : 'Step 3:'}
																</span>{' '}
																{isZh
																	? '在其他网站点击收藏夹中的按钮即可使用'
																	: 'Click the bookmark on any site to activate'}
															</p>
														</div>
													</div>

													{/* 右侧：注意事项 */}
													<div className="bg-yellow-50 dark:bg-gray-700 p-4 rounded-lg">
														<h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
															{isZh ? '⚠️ 注意' : '⚠️ Heads Up'}
														</h4>
														<ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{isZh
																	? '仅做技术评估，链接定期失效'
																	: 'Demo only—link may expire without notice'}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{isZh
																	? '使用 DeepSeek 模型，参考 DeepSeek 用户协议和隐私政策'
																	: 'This free demo uses DeepSeek API (see their terms and privacy policy)'}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{isZh
																	? '部分网站屏蔽了链接嵌入，将无反应'
																	: 'Some sites block script injection (CSP policies)'}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{isZh
																	? '仅支持单页应用，页面跳转后需要重新注入'
																	: 'Works on single-page apps only—reload required after navigation'}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{isZh
																	? '仅识别文本，不识别图像，不支持拖拽等复杂交互'
																	: 'Text-only understanding—no image recognition or drag-and-drop'}
															</li>
															<li className="flex items-start text-left">
																<span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 shrink-0 "></span>
																{isZh ? '详细使用限制参照' : 'Full limitations in'}{' '}
																<Link
																	href="/docs/introduction/limitations"
																	className="text-blue-600 dark:text-blue-400 hover:underline"
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
								className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 dark:text-gray-400"
								role="list"
							>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									{isZh ? '纯前端方案' : 'Pure Front-end Solution'}
								</li>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									{isZh ? '支持私有模型' : 'Your Own Models'}
								</li>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									{isZh ? '无痛脱敏' : 'Built-in Privacy'}
								</li>
								<li className="flex items-center">
									<span
										className="w-2 h-2 bg-green-500 rounded-full mr-2"
										aria-hidden="true"
									></span>
									{isZh ? 'MIT 开源' : 'MIT Open Source'}
								</li>
							</ul>
						</div>
					</div>
				</section>

				{/* Features Section */}
				<section
					className="px-6 py-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
					aria-labelledby="features-heading"
				>
					<div className="max-w-7xl mx-auto">
						<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8" role="list">
							{/* Feature 1 */}
							<article
								className="group p-8 bg-linear-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-14 h-14 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
									aria-hidden="true"
								>
									<Box className="w-7 h-7 text-white" strokeWidth={2.5} />
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									{isZh ? '纯页面内方案' : 'In-page Solution'}
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									{isZh
										? '完全运行在你的页面内。不需要浏览器插件、不需要无头浏览器，不需要后端。'
										: 'Runs entirely within your page. No browser extensions, no headless browsers, and no backend required.'}
								</p>
							</article>

							{/* Feature 2 */}
							<article
								className="group p-8 bg-linear-to-br from-purple-100 to-pink-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-14 h-14 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
									aria-hidden="true"
								>
									<Zap className="w-7 h-7 text-white fill-white" strokeWidth={2.5} />
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									{isZh ? '零后端部署' : 'Zero Backend Setup'}
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									{isZh
										? '前端脚本引入，自定义 LLM 接入点。从 OpenAI 到 qwen3，完全由你掌控。'
										: 'Just drop in a script. Works with any LLM provider—OpenAI, Anthropic, or your own models.'}
								</p>
							</article>

							{/* Feature 3 */}
							<article
								className="group p-8 bg-linear-to-br from-orange-100 to-red-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-14 h-14 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
									aria-hidden="true"
								>
									<MessageSquare className="w-7 h-7 text-white" strokeWidth={2.5} />
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									{isZh ? '普惠智能交互' : 'Natural Language UI'}
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									{isZh
										? '为复杂 B端系统、管理后台提供自然语言入口。让每个用户都能轻松上手。'
										: 'Transform complex admin panels into chat interfaces. Make powerful tools accessible to everyone, not just experts.'}
								</p>
							</article>

							{/* Feature 4 */}
							<article
								className="group p-8 bg-linear-to-br from-green-100 to-blue-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
								role="listitem"
							>
								<div
									className="w-14 h-14 bg-linear-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg"
									aria-hidden="true"
								>
									<Shield className="w-7 h-7 text-white" strokeWidth={2.5} />
								</div>
								<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
									{isZh ? '安全可控集成' : 'Secure by Design'}
								</h3>
								<p className="text-gray-600 dark:text-gray-300 leading-relaxed">
									{isZh
										? '支持操作黑白名单、数据脱敏保护。注入自定义知识库，让 AI 按你的规则工作。'
										: 'Control what AI can access with allowlists, data masking, and custom knowledge injection. Your rules, your data.'}
								</p>
							</article>
						</div>
					</div>
				</section>

				{/* Use Cases Section */}
				<section className="px-6 py-20" aria-labelledby="use-cases-heading">
					<div className="max-w-7xl mx-auto">
						<div className="text-center mb-16">
							<SparklesText
								className="text-4xl lg:text-5xl mb-6"
								colors={{ first: '#3b82f6', second: '#8b5cf6' }}
							>
								{isZh ? '应用场景' : 'Where It Shines'}
							</SparklesText>
							<p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
								{isZh
									? '从简单的表单填写到复杂的业务流程，AI 都能理解并执行'
									: 'From simple forms to complex workflows, AI understands and executes'}
							</p>
						</div>

						<div className="grid lg:grid-cols-2 gap-12" role="list">
							{/* Use Case 1 */}
							<div className="group bg-linear-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl hover:shadow-xl transition-all duration-300">
								<div className="flex items-start space-x-4">
									<div className="w-12 h-12 bg-linear-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
										<Bot className="w-6 h-6 text-white" strokeWidth={2.5} />
									</div>

									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											{isZh ? '对接答疑机器人' : 'Supercharge Support Bots'}
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											{isZh
												? '把你的答疑助手变成全能Agent。客服机器人不再只说「请先点击设置按钮然后点击...」，而是直接帮用户现场操作。'
												: 'Stop telling users where to click—let AI do it for them. Turn your chatbot from a guide into an operator that actually completes tasks.'}
										</p>
									</div>
								</div>
							</div>

							{/* Use Case 2 */}
							<div className="group bg-linear-to-br from-green-100 to-blue-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl hover:shadow-xl transition-all duration-300">
								<div className="flex items-start space-x-4">
									<div className="w-12 h-12 bg-linear-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
										<Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											{isZh ? '交互升级/智能化改造' : 'Modernize Legacy Apps'}
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											{isZh
												? '一行代码，老应用变身Agent，产品专家帮用户操作复杂 B 端软件。降低人工支持成本，提高用户满意度。'
												: 'Add AI superpowers to old software without rebuilding. One script tag transforms complex enterprise tools into chat-driven interfaces.'}
										</p>
									</div>
								</div>
							</div>

							{/* Use Case 3 */}
							<div className="group bg-linear-to-br from-purple-100 to-pink-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl hover:shadow-xl transition-all duration-300">
								<div className="flex items-start space-x-4">
									<div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
										<PlayCircle className="w-6 h-6 text-white fill-white/30" strokeWidth={2.5} />
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											{isZh ? '产品教学' : 'Interactive Walkthroughs'}
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											{isZh
												? '向用户演示交互过程，边做边教。例如让AI演示「如何提交报销申请」的完整操作流程。'
												: "Show, don't tell. Let AI demonstrate workflows in real-time—perfect for onboarding or training new users on complex systems."}
										</p>
									</div>
								</div>
							</div>

							{/* Use Case 4 */}
							<div className="group bg-linear-to-br from-orange-100 to-red-100 dark:from-gray-700 dark:to-gray-800 p-8 rounded-2xl hover:shadow-xl transition-all duration-300">
								<div className="flex items-start space-x-4">
									<div className="w-12 h-12 bg-linear-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md">
										<Users className="w-6 h-6 text-white" strokeWidth={2.5} />
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
											{isZh ? '无障碍支持' : 'Accessibility First'}
										</h3>
										<p className="text-gray-600 dark:text-gray-300">
											{isZh
												? '为视障用户、老年用户提供自然语言交互，对接屏幕阅读器或语音助理，让软件人人可用。'
												: 'Make web apps accessible through natural language. Perfect for screen readers, voice control, or users who find traditional interfaces challenging.'}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* One More Thing */}
				<section
					className="px-6 py-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
					aria-labelledby="one-more-thing-heading"
				>
					<div className="max-w-4xl mx-auto text-center">
						<h2
							id="one-more-thing-heading"
							className="text-4xl lg:text-5xl font-bold mb-6 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
						>
							One More Thing
						</h2>
						<p className="text-xl text-gray-600 dark:text-gray-300 mb-4 max-w-2xl mx-auto">
							{isZh
								? '想要多页面控制？试试可选的浏览器扩展。'
								: 'Need multi-page control? Try the optional browser extension.'}
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
							{'* '}
							{isZh
								? 'PageAgent.js 本身无需任何扩展即可工作，扩展是额外的能力增强。'
								: 'PageAgent.js works without any extension — this is a power-up, not a dependency.'}
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
							<a
								href="https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj"
								target="_blank"
								rel="noopener noreferrer"
								className="group inline-flex items-center gap-3 px-8 py-4 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
							>
								<img
									src="https://img.alicdn.com/imgextra/i3/O1CN01JpW0Vo1sR3FpiZKFM_!!6000000005762-55-tps-192-192.svg"
									alt="Chrome Web Store"
									className="w-7 h-7"
								/>
								<span>{isZh ? '从 Chrome 应用商店安装' : 'Install from Chrome Web Store'}</span>
								<ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
							</a>
							<Link
								href="/docs/features/chrome-extension"
								className="inline-flex items-center gap-3 px-8 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-2xl transition-all duration-300 hover:scale-105"
							>
								<svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
									<path d={siGooglechrome.path} fill="currentColor" />
								</svg>
								<span>{isZh ? '查看文档' : 'Read the Docs'}</span>
							</Link>
						</div>

						<div className="grid sm:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
							<div className="p-5 bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800 rounded-xl">
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									{isZh ? '多页面任务' : 'Multi-Page Tasks'}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									{isZh
										? '跨多个页面和标签页连续执行任务，不再受限于单页上下文'
										: 'Run tasks across multiple pages and tabs without being limited to a single page context'}
								</p>
							</div>
							<div className="p-5 bg-linear-to-br from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 rounded-xl">
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									{isZh ? '页面内发起控制' : 'Control from Your Page'}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									{isZh
										? '在页面 JS 中发起任务，驱动整个浏览器完成跨标签操作'
										: 'Trigger tasks from page JS to drive the entire browser across tabs'}
								</p>
							</div>
							<div className="p-5 bg-linear-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-800 rounded-xl">
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									{isZh ? '外部发起任务' : 'External Triggers'}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									{isZh
										? '页面 JS、本地 Agent 或云端 Agent 均可通过扩展发起任务'
										: 'Page JS, local agents, or cloud agents can trigger tasks through the extension'}
								</p>
							</div>
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}
