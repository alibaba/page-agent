import { Bot, Box, MessageSquare, Shield, Sparkles, Users } from 'lucide-react'

import { BlurFade } from '../../components/ui/blur-fade'
import { Marquee } from '../../components/ui/marquee'
import { Particles } from '../../components/ui/particles'
import { useLanguage } from '../../i18n/context'

export default function FeaturesSection() {
	const { isZh } = useLanguage()

	return (
		<section className="px-6 py-14" aria-labelledby="features-heading">
			<div className="max-w-6xl mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[22rem]">
					{/* Zero Infrastructure (2-col) */}
					<BlurFade inView className="col-span-1 md:col-span-2">
						<div className="group relative h-full overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/60 dark:border-white/8 [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] hover:shadow-xl transition-all duration-500 flex flex-col">
							<div className="flex-1 p-8 flex flex-col justify-center">
								<div className="space-y-3 mb-6">
									{[
										'pip install browser-use playwright',
										'docker run -p 3000:3000 playwright-mcp',
										'const browser = await chromium.launch()',
									].map((cmd) => (
										<div
											key={cmd}
											className="flex items-center gap-2.5 font-mono text-sm text-gray-400 dark:text-gray-600 line-through decoration-red-400/40 truncate"
										>
											<span className="text-red-400/60 text-xs shrink-0">✗</span>
											{cmd}
										</div>
									))}
								</div>
								<div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 rounded-xl px-5 py-3.5 font-mono text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2.5">
									<span className="text-emerald-500 text-xs shrink-0">✓</span>
									{'<script src="page-agent.js"></script>'}
								</div>
							</div>
							<div className="px-8 pb-6">
								<div className="flex items-center gap-2.5 mb-1.5">
									<Box className="w-5 h-5 text-blue-500" />
									<h3 className="font-semibold text-lg text-gray-900 dark:text-white">
										{isZh ? '零基建集成' : 'Zero Infrastructure'}
									</h3>
								</div>
								<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
									{isZh
										? '无需 Python、无头浏览器、服务端部署。一行 script 标签搞定。'
										: "No Python. No headless browser. No server. One script tag — that's it."}
								</p>
							</div>
						</div>
					</BlurFade>

					{/* Privacy by Default (1-col) */}
					<BlurFade inView delay={0.1} className="col-span-1">
						<div className="group relative h-full overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/60 dark:border-white/8 [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] hover:shadow-xl transition-all duration-500 flex flex-col">
							<div className="flex-1 relative overflow-hidden">
								<Particles
									className="absolute inset-0"
									quantity={40}
									staticity={50}
									ease={80}
									color="#8b5cf6"
								/>
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="w-20 h-20 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-purple-500/20">
										<Shield className="w-10 h-10 text-purple-500" strokeWidth={1.5} />
									</div>
								</div>
							</div>
							<div className="px-6 pb-6">
								<h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1.5">
									{isZh ? '隐私优先' : 'Privacy by Default'}
								</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
									{isZh
										? '浏览器内运行，数据完全由你掌控。'
										: 'Runs in the browser. You control your data, always.'}
								</p>
							</div>
						</div>
					</BlurFade>

					{/* Any LLM (1-col) */}
					<BlurFade inView delay={0.15} className="col-span-1">
						<div className="group relative h-full overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/60 dark:border-white/8 [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] hover:shadow-xl transition-all duration-500 flex flex-col">
							<div className="flex-1 relative overflow-hidden">
								<Marquee vertical pauseOnHover className="h-full [--duration:25s] [--gap:0.75rem]">
									{['OpenAI', 'Claude', 'DeepSeek', 'Qwen', 'Gemini', 'GLM', 'Ollama', 'Groq'].map(
										(name) => (
											<div
												key={name}
												className="mx-auto rounded-full bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 ring-1 ring-gray-200/50 dark:ring-white/5"
											>
												{name}
											</div>
										)
									)}
								</Marquee>
							</div>
							<div className="px-6 pb-6">
								<div className="flex items-center gap-2.5 mb-1.5">
									<Sparkles className="w-5 h-5 text-amber-500" />
									<h3 className="font-semibold text-lg text-gray-900 dark:text-white">
										{isZh ? '兼容多种 LLM' : 'Bring Your Own LLMs'}
									</h3>
								</div>
								<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
									{isZh
										? 'OpenAI、Claude、DeepSeek、Qwen 等，或通过 Ollama 完全离线。'
										: 'OpenAI, Claude, DeepSeek, Qwen, and more — or fully offline via Ollama.'}
								</p>
							</div>
						</div>
					</BlurFade>

					{/* Human-in-the-Loop (2-col) */}
					<BlurFade inView delay={0.2} className="col-span-1 md:col-span-2">
						<div className="group relative h-full overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/60 dark:border-white/8 [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] hover:shadow-xl transition-all duration-500 flex flex-col">
							<div className="flex-1 p-8 flex flex-col justify-center max-w-md mx-auto w-full">
								<div className="flex gap-2.5 mb-3">
									<div className="shrink-0 w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
										<Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
									</div>
									<div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
										{isZh ? '找到 3 条匹配记录。选择哪一条？' : 'Found 3 matches. Which one?'}
									</div>
								</div>
								<div className="flex gap-2.5 justify-end mb-3">
									<div className="bg-blue-500 rounded-2xl rounded-tr-md px-4 py-2.5 text-sm text-white">
										{isZh ? '第二条' : 'The second one.'}
									</div>
									<div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
										<Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
									</div>
								</div>
								<div className="flex gap-2.5">
									<div className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
										✓
									</div>
									<div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
										{isZh ? '已选择并提交！' : 'Done! Selected and submitted.'}
									</div>
								</div>
							</div>
							<div className="px-8 pb-6">
								<div className="flex items-center gap-2.5 mb-1.5">
									<MessageSquare className="w-5 h-5 text-blue-500" />
									<h3 className="font-semibold text-lg text-gray-900 dark:text-white">
										{isZh ? '人机协同' : 'Human-in-the-Loop'}
									</h3>
								</div>
								<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
									{isZh
										? '内置协作面板，AI 操作前先确认——不是盲目自动化。'
										: 'Built-in collaborative panel. Agent asks before acting — not blind automation.'}
								</p>
							</div>
						</div>
					</BlurFade>
				</div>
			</div>
		</section>
	)
}
