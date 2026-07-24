import { Bot, Users, Zap } from 'lucide-react'

import { BlurFade } from '../../components/ui/blur-fade'
import { useLanguage } from '../../i18n/context'

const CARD_CLASS =
	'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white/70 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300/80 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-500/40'

export default function ScenariosSection() {
	const { isZh } = useLanguage()

	return (
		<section
			className="relative border-y border-gray-200/60 bg-gray-50/70 px-6 py-20 dark:border-white/5 dark:bg-white/[0.02]"
			aria-labelledby="scenarios-heading"
		>
			<div className="mx-auto max-w-6xl">
				<BlurFade inView>
					<div className="mb-12 text-center">
						<span className="font-mono text-xs tracking-[0.3em] text-indigo-500 uppercase dark:text-indigo-400">
							{isZh ? '应用场景' : 'Use cases'}
						</span>
						<h2
							id="scenarios-heading"
							className="mt-3 text-3xl font-bold tracking-tight text-gray-900 lg:text-5xl dark:text-white"
						>
							{isZh ? '为真实场景而生' : 'Built for real workflows'}
						</h2>
					</div>
				</BlurFade>

				<div className="grid grid-cols-1 gap-5 md:grid-cols-3">
					{/* SaaS AI Copilot */}
					<BlurFade inView delay={0.05}>
						<div className={CARD_CLASS}>
							<div className="p-6 pb-4">
								<div className="overflow-hidden rounded-xl border border-white/5 bg-gray-950 p-4 font-mono text-xs leading-6 text-gray-300 shadow-inner">
									<div className="mb-2 flex gap-1.5" aria-hidden="true">
										<span className="h-2.5 w-2.5 rounded-full bg-red-400/80"></span>
										<span className="h-2.5 w-2.5 rounded-full bg-amber-400/80"></span>
										<span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80"></span>
									</div>
									<div>
										<span className="text-purple-400">import</span> {'{ PageOS }'}{' '}
										<span className="text-purple-400">from</span>{' '}
										<span className="text-emerald-400">&apos;page-os&apos;</span>
									</div>
									<div className="mt-2">
										<span className="text-purple-400">const</span>{' '}
										<span className="text-blue-300">copilot</span> ={' '}
										<span className="text-purple-400">new</span>{' '}
										<span className="text-yellow-300">PageOS</span>
										{'({'}
									</div>
									<div className="pl-4">
										<span className="text-blue-300">model</span>:{' '}
										<span className="text-emerald-400">&apos;deepseek-chat&apos;</span>,
									</div>
									<div className="pl-4">
										<span className="text-blue-300">apiKey</span>:{' '}
										<span className="text-emerald-400">process.env.KEY</span>,
									</div>
									<div>{'})'}</div>
								</div>
							</div>
							<div className="mt-auto p-6 pt-2">
								<div className="mb-2 flex items-center gap-2.5">
									<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
										<Bot className="h-4.5 w-4.5 text-blue-500" />
									</span>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
										{isZh ? 'SaaS AI 副驾驶' : 'SaaS AI Copilot'}
									</h3>
								</div>
								<p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
									{isZh
										? '几小时内为你的产品加上 AI 副驾驶，不需要重写后端。'
										: 'Ship an AI copilot in your product in hours, not months. No backend rewrite needed.'}
								</p>
							</div>
						</div>
					</BlurFade>

					{/* Smart Form Filling */}
					<BlurFade inView delay={0.1}>
						<div className={CARD_CLASS}>
							<div className="p-6 pb-4">
								<div className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-4 shadow-inner dark:border-gray-700 dark:bg-gray-900">
									<div className="flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-50 px-3 py-2 text-xs text-gray-500 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-gray-400">
										<span>🪄</span>
										<span className="italic">
											{isZh
												? '"填写上周五出差的报销单"'
												: '"Fill the expense report for Friday\'s trip"'}
										</span>
									</div>
									{[
										{ label: isZh ? '姓名' : 'Name', value: 'John Smith' },
										{ label: isZh ? '金额' : 'Amount', value: '$342.50' },
										{ label: isZh ? '类目' : 'Category', value: 'Travel' },
									].map((field) => (
										<div key={field.label} className="flex items-center gap-2">
											<span className="w-12 shrink-0 text-xs text-gray-400 dark:text-gray-500">
												{field.label}
											</span>
											<div className="flex h-7 flex-1 items-center rounded border border-gray-200 bg-gray-50 px-2 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
												{field.value}
											</div>
											<span className="text-xs text-emerald-500">✓</span>
										</div>
									))}
								</div>
							</div>
							<div className="mt-auto p-6 pt-2">
								<div className="mb-2 flex items-center gap-2.5">
									<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
										<Zap className="h-4.5 w-4.5 text-amber-500" />
									</span>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
										{isZh ? '智能表单填写' : 'Smart Form Filling'}
									</h3>
								</div>
								<p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
									{isZh
										? '把 20 次点击变成一句话。ERP、CRM、管理后台的最佳拍档。'
										: 'Turn 20-click workflows into one sentence. Perfect for ERP, CRM, and admin systems.'}
								</p>
							</div>
						</div>
					</BlurFade>

					{/* Accessibility */}
					<BlurFade inView delay={0.15}>
						<div className={CARD_CLASS}>
							<div className="flex flex-col items-center justify-center p-6 pb-4">
								<div className="w-full space-y-3 rounded-xl border border-purple-200/50 bg-purple-50/70 p-5 dark:border-purple-500/20 dark:bg-purple-500/10">
									<div className="flex items-center gap-3">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-base dark:bg-purple-500/20">
											🎤
										</div>
										<div className="text-sm text-purple-700 italic dark:text-purple-300">
											{isZh ? '"点击提交按钮"' : '"Click the submit button"'}
										</div>
									</div>
									<div className="flex items-center gap-3 pl-11">
										<div className="flex items-center gap-1.5">
											<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400"></div>
											<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:0.2s]"></div>
											<div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:0.4s]"></div>
										</div>
										<span className="text-xs text-purple-500 dark:text-purple-400">
											{isZh ? 'AI 正在执行...' : 'AI executing...'}
										</span>
									</div>
									<div className="flex items-center gap-3 pl-11 text-sm text-emerald-600 dark:text-emerald-400">
										<span>✓</span> {isZh ? '按钮已点击' : 'Button clicked'}
									</div>
								</div>
							</div>
							<div className="mt-auto p-6 pt-2">
								<div className="mb-2 flex items-center gap-2.5">
									<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
										<Users className="h-4.5 w-4.5 text-purple-500" />
									</span>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
										{isZh ? '无障碍增强' : 'Accessibility'}
									</h3>
								</div>
								<p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
									{isZh
										? '用自然语言让任何网页无障碍。语音指令、屏幕阅读器，零门槛。'
										: 'Make any web app accessible through natural language. Voice, screen readers, zero barrier.'}
								</p>
							</div>
						</div>
					</BlurFade>
				</div>
			</div>
		</section>
	)
}
