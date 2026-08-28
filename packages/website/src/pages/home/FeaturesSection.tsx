import { Bot, Box, MessageSquare, Shield, Sparkles, Users } from 'lucide-react'

import { BlurFade } from '../../components/ui/blur-fade'
import { Highlighter } from '../../components/ui/highlighter'
import { Marquee } from '../../components/ui/marquee'
import { Particles } from '../../components/ui/particles'
import { useLanguage } from '../../i18n/context'

const LLMS: { name: string; color: string }[] = [
	{ name: 'DeepSeek', color: '#06b6d4' },
	{ name: 'OpenAI', color: '#10b981' },
	{ name: 'Claude', color: '#f97316' },
	{ name: 'Gemini', color: '#3b82f6' },
	{ name: 'Qwen', color: '#8b5cf6' },
	{ name: 'Grok', color: '#f43f5e' },
	{ name: 'Ollama', color: '#9ca3af' },
	{ name: 'LM Studio', color: '#4338ca' },
	{ name: 'Kimi', color: '#14b8a6' },
	{ name: 'GLM', color: '#f59e0b' },
	{ name: 'LLaMA', color: '#60a5fa' },
]

const CARD_CLASS =
	'h-full rounded-2xl border border-gray-200/80 bg-white/70 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300/80 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-500/40'

export default function FeaturesSection() {
	const { isZh } = useLanguage()

	return (
		<section className="relative px-6 py-20" aria-labelledby="features-heading">
			<div className="mx-auto max-w-6xl">
				<BlurFade inView>
					<div className="mb-12 text-center">
						<span className="font-mono text-xs tracking-[0.3em] text-indigo-500 uppercase dark:text-indigo-400">
							{isZh ? '核心能力' : 'Capabilities'}
						</span>
						<h2
							id="features-heading"
							className="mt-3 text-3xl font-bold tracking-tight text-gray-900 lg:text-5xl dark:text-white"
						>
							{isZh ? '一个 Agent 所需的一切' : 'Everything an agent needs.'}
							<br />
							<span className="text-gray-400 dark:text-gray-500">
								{isZh ? '没有多余的基建' : 'None of the infrastructure.'}
							</span>
						</h2>
					</div>
				</BlurFade>

				<div className="grid auto-rows-[18rem] grid-cols-1 gap-4 md:grid-cols-3">
					{/* Row 1: Zero Infrastructure (2col) + Privacy (1col) */}
					<BlurFade inView className="col-span-1 md:col-span-2">
						<div className={CARD_CLASS}>
							<div className="flex h-72 flex-col">
								<div className="flex flex-1 flex-col justify-center p-7">
									<div className="mb-5 space-y-2.5">
										{[
											'pip install browser-use playwright',
											'docker run -p 3000:3000 playwright-mcp',
											'const browser = await chromium.launch()',
										].map((cmd) => (
											<div
												key={cmd}
												className="truncate font-mono text-sm text-gray-500 dark:text-gray-400"
											>
												<Highlighter action="strike-through" color="#ef4444aa" strokeWidth={1.5}>
													{cmd}
												</Highlighter>
											</div>
										))}
									</div>
									<div className="flex items-center gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50 px-5 py-3 font-mono text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
										<span className="shrink-0 text-xs text-emerald-500">✓</span>
										{'<script src="eb-agent.js"></script>'}
									</div>
								</div>
								<div className="px-7 pb-5">
									<div className="mb-1 flex items-center gap-2.5">
										<Box className="h-5 w-5 text-indigo-500" />
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
											{isZh ? '零基建集成' : 'Zero Infrastructure'}
										</h3>
									</div>
									<p className="text-sm leading-relaxed text-gray-500 dark:text-gray-300">
										{isZh
											? '无需 Python、无头浏览器、服务端部署。一行 script 标签搞定。'
											: "No Python. No headless browser. No server. One script tag — that's it."}
									</p>
								</div>
							</div>
						</div>
					</BlurFade>

					<BlurFade inView delay={0.1} className="col-span-1">
						<div className={CARD_CLASS}>
							<div className="flex h-72 flex-col">
								<div className="relative flex-1 overflow-hidden rounded-t-2xl">
									<Particles
										className="absolute inset-0"
										quantity={40}
										staticity={50}
										ease={80}
										color="#8b5cf6"
									/>
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 ring-1 ring-purple-500/20 backdrop-blur-sm dark:bg-purple-500/20">
											<Shield className="h-8 w-8 text-purple-500" strokeWidth={1.5} />
										</div>
									</div>
								</div>
								<div className="px-6 pb-5">
									<h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
										{isZh ? '隐私优先' : 'Privacy by Default'}
									</h3>
									<p className="text-sm leading-relaxed text-gray-500 dark:text-gray-300">
										{isZh
											? '浏览器内运行，数据完全由你掌控。'
											: 'Runs in the browser. You control your data, always.'}
									</p>
								</div>
							</div>
						</div>
					</BlurFade>

					{/* Row 2: Human-in-the-Loop (1col) + LLM (2col) */}
					<BlurFade inView delay={0.15} className="col-span-1">
						<div className={CARD_CLASS}>
							<div className="flex h-72 flex-col">
								<div className="mx-auto flex w-full max-w-xs flex-1 flex-col justify-center p-5">
									<div className="mb-2.5 flex gap-2">
										<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
											<Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
										</div>
										<div className="rounded-2xl rounded-tl-md bg-gray-100 px-3.5 py-2 text-sm text-gray-700 dark:bg-white/10 dark:text-gray-200">
											{isZh ? '找到 3 条匹配记录。选择哪一条？' : 'Found 3 matches. Which one?'}
										</div>
									</div>
									<div className="mb-2.5 flex justify-end gap-2">
										<div className="rounded-2xl rounded-tr-md bg-indigo-500 px-3.5 py-2 text-sm text-white">
											{isZh ? '第二条' : 'The second one.'}
										</div>
										<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
											<Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
										</div>
									</div>
									<div className="flex gap-2">
										<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
											✓
										</div>
										<div className="rounded-2xl rounded-tl-md bg-gray-100 px-3.5 py-2 text-sm text-gray-700 dark:bg-white/10 dark:text-gray-200">
											{isZh ? '已选择并提交！' : 'Done! Selected and submitted.'}
										</div>
									</div>
								</div>
								<div className="px-5 pb-5">
									<div className="mb-1 flex items-center gap-2.5">
										<MessageSquare className="h-5 w-5 text-indigo-500" />
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
											{isZh ? '人机协同' : 'Human-in-the-Loop'}
										</h3>
									</div>
									<p className="text-sm leading-relaxed text-gray-500 dark:text-gray-300">
										{isZh
											? '内置协作面板，AI 操作前先确认——不是盲目自动化。'
											: 'Built-in collaborative panel. Agent asks before acting — not blind automation.'}
									</p>
								</div>
							</div>
						</div>
					</BlurFade>

					<BlurFade inView delay={0.2} className="col-span-1 md:col-span-2">
						<div className={CARD_CLASS}>
							<div className="flex h-72 flex-col">
								<div className="relative flex flex-1 flex-col justify-center gap-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
									<Marquee pauseOnHover className="[--duration:30s]">
										{LLMS.slice(0, 6).map((llm) => (
											<span
												key={llm.name}
												className="rounded-full border border-gray-200/80 bg-white/70 px-5 py-2 font-mono text-sm font-semibold whitespace-nowrap dark:border-white/10 dark:bg-white/5"
												style={{ color: llm.color }}
											>
												{llm.name}
											</span>
										))}
									</Marquee>
									<Marquee reverse pauseOnHover className="[--duration:30s]">
										{LLMS.slice(6).map((llm) => (
											<span
												key={llm.name}
												className="rounded-full border border-gray-200/80 bg-white/70 px-5 py-2 font-mono text-sm font-semibold whitespace-nowrap dark:border-white/10 dark:bg-white/5"
												style={{ color: llm.color }}
											>
												{llm.name}
											</span>
										))}
									</Marquee>
								</div>
								<div className="px-7 pb-5">
									<div className="mb-1 flex items-center gap-2.5">
										<Sparkles className="h-5 w-5 text-amber-500" />
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
											{isZh ? '兼容多种 LLM' : 'Bring Your Own LLMs'}
										</h3>
									</div>
									<p className="text-sm leading-relaxed text-gray-500 dark:text-gray-300">
										{isZh
											? 'DeepSeek、OpenAI、Claude、Qwen 等，或通过 Ollama 完全离线。'
											: 'DeepSeek, OpenAI, Claude, Qwen, and more — or fully offline via Ollama.'}
									</p>
								</div>
							</div>
						</div>
					</BlurFade>
				</div>
			</div>
		</section>
	)
}
