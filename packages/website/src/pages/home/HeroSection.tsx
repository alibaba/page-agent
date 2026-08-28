import type { EBAgent as EBAgentType } from 'eb-agent'
import { Check, Copy, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'wouter'

import { AnimatedShinyText } from '../../components/ui/animated-shiny-text'
import { AuroraText } from '../../components/ui/aurora-text'
import { Particles } from '../../components/ui/particles'
import {
	CDN_DEMO_CN_URL,
	CDN_DEMO_URL,
	// DEMO_API_KEY,
	DEMO_BASE_URL,
	DEMO_MODEL,
} from '../../constants'
import { useLanguage } from '../../i18n/context'

let ebAgentModule: Promise<typeof import('eb-agent')> | null = null

/**
 * Get the bookmarklet injection script
 * @param cdnSource Which CDN mirror to use
 * @param isZh Whether to use Chinese language
 */
function getInjection(cdnSource: 'china' | 'international', isZh?: boolean) {
	const cdn = cdnSource === 'china' ? CDN_DEMO_CN_URL : CDN_DEMO_URL
	const locale = isZh ? 'zh-CN' : 'en-US'

	const injection = encodeURI(
		`javascript:(function(){var s=document.createElement('script');s.src=\`${cdn}?lang=${locale}&t=\${Math.random()}\`;s.setAttribute('crossorigin', true);s.type="text/javascript";s.onload=()=>console.log('EBAgent script loaded!');document.body.appendChild(s);})();`
	)

	return `
	<a
		href=${injection}
		class="inline-flex items-center gap-1 text-xs px-4 py-2 bg-linear-to-r from-indigo-500 to-fuchsia-500 text-white font-medium rounded-full shadow-lg shadow-indigo-500/25 hover:scale-105 transition-all duration-200 cursor-move border border-dashed border-white/50"
		draggable="true"
		onclick="return false;"
		title="Drag me to your bookmarks bar!"
	>
		✨ EBAgent
	</a>
	`
}

const INSTALL_CMD = 'npm install eb-agent'

export default function HeroSection() {
	const { language, isZh } = useLanguage()

	const defaultTask = isZh
		? '从导航栏中进入文档页，打开"快速开始"相关的文档，帮我总结成 markdown'
		: 'Goto docs in navigation bar, find Quick-Start section, and summarize in markdown'

	const [task, setTask] = useState(() => defaultTask)
	const [prevDefaultTask, setPrevDefaultTask] = useState(defaultTask)
	if (prevDefaultTask !== defaultTask) {
		setPrevDefaultTask(defaultTask)
		setTask(defaultTask)
	}

	const [params] = useSearchParams()
	const isOther = params.has('try_other')

	const [activeTab, setActiveTab] = useState<'try' | 'other'>(isOther ? 'other' : 'try')
	const [cdnSource, setCdnSource] = useState<'international' | 'china'>('international')
	const [copied, setCopied] = useState(false)

	const [ready, setReady] = useState(false)
	useEffect(() => {
		ebAgentModule ??= import('eb-agent')
		ebAgentModule.then(() => setReady(true))
	}, [])

	const suggestions: string[] = isZh
		? ['进入文档页并总结"快速开始"', '切换到深色模式', '滚动到"应用场景"部分']
		: ['Summarize the Quick-Start docs', 'Switch to dark mode', 'Scroll to the use cases']

	const suggestionTasks: string[] = isZh
		? [
				'从导航栏中进入文档页，打开"快速开始"相关的文档，帮我总结成 markdown',
				'把网站切换到深色模式',
				'滚动到页面中"应用场景"部分',
			]
		: [
				'Goto docs in navigation bar, find Quick-Start section, and summarize in markdown',
				'Switch the website to dark mode',
				'Scroll to the use cases section of this page',
			]

	const handleCopy = async () => {
		await navigator.clipboard.writeText(INSTALL_CMD)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleExecute = async () => {
		if (!task.trim() || !ready || !ebAgentModule) return

		const { EBAgent } = await ebAgentModule
		const win = window as any

		if (!win.ebAgent || win.ebAgent.disposed) {
			win.ebAgent = new (EBAgent as typeof EBAgentType)({
				interactiveBlacklist: [document.getElementById('root')!],
				language: language,

				instructions: {
					system: 'You are a helpful assistant on EBAgent website.',
					getPageInstructions: (url: string) => {
						return url.includes('eb-agent') ? 'This is EBAgent demo page.' : undefined
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
						: undefined,
				visionModel:
					import.meta.env.DEV && import.meta.env.LLM_VISION_MODEL_NAME
						? { model: import.meta.env.LLM_VISION_MODEL_NAME }
						: undefined,
			})
		}

		await win.ebAgent.execute(task)
	}

	const termsLink = (
		<a
			href="https://github.com/EqualByte/agentic-page/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use"
			target="_blank"
			rel="noopener noreferrer"
			className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-300"
		>
			{isZh ? '使用条款' : 'Terms of Use'}
		</a>
	)

	return (
		<section
			className="relative overflow-hidden px-6 pt-20 pb-16 lg:pt-28 lg:pb-24"
			aria-labelledby="hero-heading"
		>
			{/* Background: dot grid + glows + particles */}
			<div className="absolute inset-0" aria-hidden="true">
				<div className="absolute inset-0 [background-image:radial-gradient(circle,rgba(99,102,241,0.22)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_65%_65%_at_50%_30%,black,transparent)]"></div>
				<div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl"></div>
				<div className="absolute top-40 -left-40 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl"></div>
				<div className="absolute top-52 -right-40 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl"></div>
			</div>
			<Particles
				className="absolute inset-0"
				quantity={70}
				staticity={40}
				ease={80}
				color="#818cf8"
			/>

			<div className="relative z-10 mx-auto max-w-5xl text-center">
				{/* Badge */}
				<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-4 py-1.5 font-mono text-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5">
					<span className="relative flex h-2 w-2" aria-hidden="true">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"></span>
						<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
					</span>
					<AnimatedShinyText className="tracking-wide">
						{isZh ? 'AI Agent · 就住在你的网页里' : 'AI agent · lives inside your webpage'}
					</AnimatedShinyText>
				</div>

				{/* Headline */}
				<h1
					id="hero-heading"
					className="mb-6 text-5xl font-bold tracking-tight text-gray-900 lg:text-7xl dark:text-white"
				>
					{isZh ? (
						<>
							你网站里的
							<br />
							<AuroraText colors={['#6366f1', '#a855f7', '#06b6d4', '#818cf8']}>
								AI 操作员
							</AuroraText>
						</>
					) : (
						<>
							The AI Operator
							<br />
							<AuroraText colors={['#6366f1', '#a855f7', '#06b6d4', '#818cf8']}>
								Living in Your Web Page
							</AuroraText>
						</>
					)}
				</h1>

				<p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 lg:text-xl dark:text-gray-300">
					{isZh
						? '一行代码，让你的网站变身 AI 原生应用。用户给出自然语言指令，AI 帮你操作页面。'
						: 'One line of code turns your website into an AI-native app. Users type what they want — the agent clicks, fills, and navigates for them.'}
				</p>

				{/* Install one-liner */}
				<div className="mb-12 inline-flex items-center gap-3 rounded-xl border border-gray-200/80 bg-gray-950 px-5 py-3 font-mono text-sm text-gray-100 shadow-lg shadow-indigo-500/10 dark:border-white/10">
					<span className="text-emerald-400" aria-hidden="true">
						$
					</span>
					<span>{INSTALL_CMD}</span>
					<button
						onClick={handleCopy}
						className="ml-1 cursor-pointer rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
						aria-label={isZh ? '复制安装命令' : 'Copy install command'}
					>
						{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
					</button>
				</div>

				{/* Live demo composer */}
				<div className="mx-auto mb-6 max-w-3xl">
					{/* Segmented control */}
					<div className="mb-5 flex justify-center">
						<div className="inline-flex rounded-full border border-gray-200/80 bg-white/70 p-1 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
							<button
								onClick={() => setActiveTab('try')}
								className={`cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
									activeTab === 'try'
										? 'bg-linear-to-r from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/25'
										: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
								}`}
							>
								{isZh ? '在本页尝试' : 'Try it here'}
							</button>
							<button
								onClick={() => setActiveTab('other')}
								className={`cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
									activeTab === 'other'
										? 'bg-linear-to-r from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/25'
										: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
								}`}
							>
								{isZh ? '在其他网站尝试' : 'Try on any site'}
							</button>
						</div>
					</div>

					{activeTab === 'try' && (
						<div>
							{/* Prompt composer with gradient ring */}
							<div className="rounded-2xl bg-linear-to-r from-indigo-500 via-fuchsia-500 to-cyan-400 p-[1.5px] shadow-xl shadow-indigo-500/15">
								<div className="rounded-[calc(1rem-1.5px)] bg-white p-3 dark:bg-gray-950">
									<div className="flex items-center gap-3">
										<Sparkles
											className="ml-2 h-5 w-5 shrink-0 text-indigo-500 dark:text-indigo-400"
											aria-hidden="true"
										/>
										<input
											value={task}
											onChange={(e) => setTask(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') handleExecute()
											}}
											placeholder={
												isZh
													? '告诉 AI 你想在这个页面做什么…'
													: 'Tell the agent what to do on this page…'
											}
											className="w-full border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
											data-eb-agent-not-interactive
										/>
										<button
											onClick={handleExecute}
											disabled={!ready}
											className="shrink-0 cursor-pointer rounded-xl bg-linear-to-r from-indigo-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/25 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
											data-eb-agent-not-interactive
										>
											{ready ? (
												isZh ? (
													'执行 ↵'
												) : (
													'Run ↵'
												)
											) : (
												<span className="animate-pulse">{isZh ? '准备中…' : 'Warming up…'}</span>
											)}
										</button>
									</div>
								</div>
							</div>

							{/* Suggestion chips */}
							<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
								{suggestions.map((label, i) => (
									<button
										key={label}
										onClick={() => setTask(suggestionTasks[i])}
										className="cursor-pointer rounded-full border border-gray-200/80 bg-white/60 px-3.5 py-1.5 text-xs text-gray-600 backdrop-blur-sm transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
										data-eb-agent-not-interactive
									>
										{label}
									</button>
								))}
							</div>

							<p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
								{isZh ? (
									<>使用免费测试 LLM API，点击执行即表示您同意{termsLink}</>
								) : (
									<>
										Powered by a free testing LLM API. By clicking Run you agree to the {termsLink}
									</>
								)}
							</p>
						</div>
					)}

					{activeTab === 'other' && (
						<div className="rounded-2xl border border-gray-200/80 bg-white/70 p-5 text-left backdrop-blur-md dark:border-white/10 dark:bg-white/5">
							<div className="grid gap-6 md:grid-cols-2">
								{/* Steps */}
								<div className="space-y-3">
									<div className="rounded-xl border border-gray-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-gray-900/60">
										<p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
											<span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
												1
											</span>
											{isZh ? '显示收藏夹栏' : 'Show your bookmarks bar'}
										</p>
										<div className="flex items-center justify-center gap-2">
											<kbd className="rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-800">
												Ctrl + Shift + B
											</kbd>
											<span className="text-gray-500 dark:text-gray-400">{isZh ? '或' : 'or'}</span>
											<kbd className="rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs dark:border-gray-600 dark:bg-gray-800">
												⌘ + Shift + B
											</kbd>
										</div>
									</div>

									<div className="rounded-xl border border-gray-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-gray-900/60">
										<p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
											<span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
												2
											</span>
											{isZh ? '拖拽下面按钮到收藏夹栏' : 'Drag this button to your bookmarks'}
										</p>
										<div className="flex items-center justify-center gap-3">
											<select
												value={cdnSource}
												onChange={(e) => setCdnSource(e.target.value as 'international' | 'china')}
												className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
											>
												<option value="international">jsdelivr CDN</option>
												<option value="china">npmmirror CDN</option>
											</select>
											<div
												dangerouslySetInnerHTML={{
													__html: getInjection(cdnSource, isZh),
												}}
											></div>
										</div>
									</div>

									<div className="rounded-xl border border-gray-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-gray-900/60">
										<p className="text-sm text-gray-700 dark:text-gray-300">
											<span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
												3
											</span>
											{isZh
												? '在其他网站点击收藏夹中的按钮即可使用'
												: 'Click the bookmark on any site to activate'}
										</p>
									</div>
								</div>

								{/* Heads up */}
								<div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
									<h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
										{isZh ? '⚠️ 注意' : '⚠️ Heads Up'}
									</h4>
									<ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
										<li className="flex items-start text-left">
											<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
											{isZh ? (
												<span>使用免费测试 LLM API，使用即表示同意{termsLink}</span>
											) : (
												<span>
													Uses a free testing LLM API. By using it you agree to the {termsLink}
												</span>
											)}
										</li>
										<li className="flex items-start text-left">
											<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
											{isZh
												? '数据通过中国大陆服务器处理'
												: 'Data processed via servers in Mainland China'}
										</li>
										<li className="flex items-start text-left">
											<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
											{isZh
												? '部分网站屏蔽了链接嵌入，将无反应'
												: 'Some sites block script injection (CSP policies)'}
										</li>
										<li className="flex items-start text-left">
											<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
											{isZh ? '支持单页应用' : 'Works on single-page apps'}
										</li>
										<li className="flex items-start text-left">
											<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
											{isZh
												? '仅识别文本，不识别图像，不支持拖拽等复杂交互'
												: 'Text-only understanding — no image recognition or drag-and-drop'}
										</li>
										<li className="flex items-start text-left">
											<span className="mt-2 mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
											{isZh ? '详细使用限制参照' : 'Full limitations in'}
											<Link
												href="/docs/introduction/limitations"
												className="pl-1 text-indigo-600 hover:underline dark:text-indigo-400"
											>
												{isZh ? '《文档》' : 'Docs'}
											</Link>
										</li>
									</ul>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Trust row */}
				<ul
					className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 font-mono text-xs tracking-wide text-gray-500 dark:text-gray-400"
					role="list"
				>
					{[
						isZh ? '纯前端方案' : 'Pure front-end',
						isZh ? '支持私有模型' : 'Bring your own LLM',
						isZh ? '无痛脱敏' : 'Built-in privacy',
						isZh ? 'MIT 开源' : 'MIT open source',
					].map((label) => (
						<li key={label} className="flex items-center">
							<span
								className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500"
								aria-hidden="true"
							></span>
							{label}
						</li>
					))}
				</ul>
			</div>
		</section>
	)
}
