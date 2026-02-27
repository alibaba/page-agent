import { Bot, Box, MessageSquare, Shield, Sparkles, Users } from 'lucide-react'

import { BlurFade } from '../../components/ui/blur-fade'
import { Highlighter } from '../../components/ui/highlighter'
import { MagicCard } from '../../components/ui/magic-card'
import { Particles } from '../../components/ui/particles'
import { useLanguage } from '../../i18n/context'

// Word-cloud style: each item has a position (%), size, opacity, and color for a scattered look
const LLM_CLOUD: {
	name: string
	color: string
	x: number
	y: number
	size: number
	opacity: number
}[] = [
	{ name: 'OpenAI', color: '#10b981', x: 18, y: 22, size: 1.5, opacity: 1 },
	{ name: 'Claude', color: '#f97316', x: 62, y: 15, size: 1.35, opacity: 0.95 },
	{ name: 'Qwen', color: '#8b5cf6', x: 38, y: 50, size: 1.8, opacity: 0.9 },
	{ name: 'Gemini', color: '#3b82f6', x: 68, y: 48, size: 1.2, opacity: 0.85 },
	{ name: 'DeepSeek', color: '#06b6d4', x: 10, y: 65, size: 1.1, opacity: 0.8 },
	{ name: 'Grok', color: '#f43f5e', x: 52, y: 78, size: 1.0, opacity: 0.75 },
	{ name: 'Ollama', color: '#9ca3af', x: 82, y: 25, size: 1.1, opacity: 0.8 },
	{ name: 'Kimi', color: '#14b8a6', x: 30, y: 82, size: 0.85, opacity: 0.6 },
	{ name: 'GLM', color: '#f59e0b', x: 70, y: 72, size: 0.85, opacity: 0.55 },
	{ name: 'LLaMA', color: '#60a5fa', x: 88, y: 70, size: 0.8, opacity: 0.45 },
]

const CARD_HEIGHT = 'h-72'

export default function FeaturesSection() {
	const { isZh } = useLanguage()

	return (
		<section className="px-6 py-14" aria-labelledby="features-heading">
			<div className="max-w-6xl mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[18rem]">
					{/* Row 1: Zero Infrastructure (2col) + Privacy (1col) */}
					<BlurFade inView className="col-span-1 md:col-span-2">
						<MagicCard
							className="h-full rounded-2xl"
							gradientFrom="#3b82f6"
							gradientTo="#06b6d4"
							gradientColor="#3b82f6"
							gradientOpacity={0.15}
						>
							<div className={`flex ${CARD_HEIGHT} flex-col`}>
								<div className="flex-1 p-7 flex flex-col justify-center">
									<div className="space-y-2.5 mb-5">
										{[
											'pip install browser-use playwright',
											'docker run -p 3000:3000 playwright-mcp',
											'const browser = await chromium.launch()',
										].map((cmd) => (
											<div
												key={cmd}
												className="font-mono text-sm text-white-400 dark:text-gray-300 truncate"
											>
												<Highlighter
													action="strike-through"
													color="#ef4444aa"
													strokeWidth={1.5}
													// multiline={false}
													// isView
												>
													{cmd}
												</Highlighter>
											</div>
										))}
									</div>
									<div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-700/40 rounded-xl px-5 py-3 font-mono text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2.5">
										<span className="text-emerald-500 text-xs shrink-0">✓</span>
										{'<script src="page-agent.js"></script>'}
									</div>
								</div>
								<div className="px-7 pb-5">
									<div className="flex items-center gap-2.5 mb-1">
										<Box className="w-5 h-5 text-blue-500" />
										<h3 className="font-semibold text-lg text-gray-900 dark:text-white">
											{isZh ? '零基建集成' : 'Zero Infrastructure'}
										</h3>
									</div>
									<p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
										{isZh
											? '无需 Python、无头浏览器、服务端部署。一行 script 标签搞定。'
											: "No Python. No headless browser. No server. One script tag — that's it."}
									</p>
								</div>
							</div>
						</MagicCard>
					</BlurFade>

					<BlurFade inView delay={0.1} className="col-span-1">
						<MagicCard
							className="h-full rounded-2xl"
							gradientFrom="#8b5cf6"
							gradientTo="#a855f7"
							gradientColor="#8b5cf6"
							gradientOpacity={0.12}
						>
							<div className={`flex ${CARD_HEIGHT} flex-col`}>
								<div className="flex-1 relative overflow-hidden">
									<Particles
										className="absolute inset-0"
										quantity={40}
										staticity={50}
										ease={80}
										color="#8b5cf6"
									/>
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="w-16 h-16 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-purple-500/20">
											<Shield className="w-8 h-8 text-purple-500" strokeWidth={1.5} />
										</div>
									</div>
								</div>
								<div className="px-6 pb-5">
									<h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
										{isZh ? '隐私优先' : 'Privacy by Default'}
									</h3>
									<p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
										{isZh
											? '浏览器内运行，数据完全由你掌控。'
											: 'Runs in the browser. You control your data, always.'}
									</p>
								</div>
							</div>
						</MagicCard>
					</BlurFade>

					{/* Row 2: Human-in-the-Loop (1col) + LLM (2col) */}
					<BlurFade inView delay={0.15} className="col-span-1">
						<MagicCard
							className="h-full rounded-2xl"
							gradientFrom="#3b82f6"
							gradientTo="#8b5cf6"
							gradientColor="#6366f1"
							gradientOpacity={0.12}
						>
							<div className={`flex ${CARD_HEIGHT} flex-col`}>
								<div className="flex-1 p-5 flex flex-col justify-center max-w-xs mx-auto w-full">
									<div className="flex gap-2 mb-2.5">
										<div className="shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
											<Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
										</div>
										<div className="bg-gray-100 dark:bg-white/10 rounded-2xl rounded-tl-md px-3.5 py-2 text-sm text-gray-700 dark:text-gray-200">
											{isZh ? '找到 3 条匹配记录。选择哪一条？' : 'Found 3 matches. Which one?'}
										</div>
									</div>
									<div className="flex gap-2 justify-end mb-2.5">
										<div className="bg-blue-500 rounded-2xl rounded-tr-md px-3.5 py-2 text-sm text-white">
											{isZh ? '第二条' : 'The second one.'}
										</div>
										<div className="shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
											<Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
										</div>
									</div>
									<div className="flex gap-2">
										<div className="shrink-0 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
											✓
										</div>
										<div className="bg-gray-100 dark:bg-white/10 rounded-2xl rounded-tl-md px-3.5 py-2 text-sm text-gray-700 dark:text-gray-200">
											{isZh ? '已选择并提交！' : 'Done! Selected and submitted.'}
										</div>
									</div>
								</div>
								<div className="px-5 pb-5">
									<div className="flex items-center gap-2.5 mb-1">
										<MessageSquare className="w-5 h-5 text-blue-500" />
										<h3 className="font-semibold text-lg text-gray-900 dark:text-white">
											{isZh ? '人机协同' : 'Human-in-the-Loop'}
										</h3>
									</div>
									<p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
										{isZh
											? '内置协作面板，AI 操作前先确认——不是盲目自动化。'
											: 'Built-in collaborative panel. Agent asks before acting — not blind automation.'}
									</p>
								</div>
							</div>
						</MagicCard>
					</BlurFade>

					<BlurFade inView delay={0.2} className="col-span-1 md:col-span-2">
						<MagicCard
							className="h-full rounded-2xl"
							gradientFrom="#f59e0b"
							gradientTo="#f97316"
							gradientColor="#f59e0b"
							gradientOpacity={0.12}
						>
							<div className={`flex ${CARD_HEIGHT} flex-col`}>
								<div className="flex-1 overflow-hidden relative">
									{LLM_CLOUD.map((item) => (
										<span
											key={item.name}
											className="absolute font-semibold whitespace-nowrap select-none"
											style={{
												left: `${item.x}%`,
												top: `${item.y}%`,
												fontSize: `${item.size}rem`,
												color: item.color,
												opacity: item.opacity,
												transform: 'translate(-50%, -50%)',
												textShadow: `0 0 80px ${item.color}99`,
											}}
										>
											{item.name}
										</span>
									))}
								</div>
								<div className="px-7 pb-5">
									<div className="flex items-center gap-2.5 mb-1">
										<Sparkles className="w-5 h-5 text-amber-500" />
										<h3 className="font-semibold text-lg text-gray-900 dark:text-white">
											{isZh ? '兼容多种 LLM' : 'Bring Your Own LLMs'}
										</h3>
									</div>
									<p className="text-sm text-gray-500 dark:text-gray-300 leading-relaxed">
										{isZh
											? 'OpenAI、Claude、DeepSeek、Qwen 等，或通过 Ollama 完全离线。'
											: 'OpenAI, Claude, DeepSeek, Qwen, and more — or fully offline via Ollama.'}
									</p>
								</div>
							</div>
						</MagicCard>
					</BlurFade>
				</div>
			</div>
		</section>
	)
}
