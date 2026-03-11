import { Bot, Users, Zap } from 'lucide-react'

import { BlurFade } from '../../components/ui/blur-fade'
import { SparklesText } from '../../components/ui/sparkles-text'
import { useLanguage } from '../../i18n/context'

export default function ScenariosSection() {
	const { isZh } = useLanguage()

	return (
		<section
			className="px-6 py-16 bg-linear-to-b from-blue-100 to-purple-100 dark:from-blue-950/40 dark:to-gray-800"
			aria-labelledby="scenarios-heading"
		>
			<div className="max-w-6xl mx-auto">
				<BlurFade inView>
					<div className="text-center mb-12">
						<SparklesText
							className="text-4xl lg:text-5xl mb-6"
							colors={{ first: '#3b82f6', second: '#8b5cf6' }}
						>
							{isZh ? '应用场景' : 'Built For'}
						</SparklesText>
					</div>
				</BlurFade>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* SaaS AI Copilot */}
					<BlurFade inView delay={0.05}>
						<div className="group relative overflow-hidden rounded-2xl bg-linear-to-b from-blue-50 to-white dark:from-blue-950/40 dark:to-gray-800 border border-blue-200/80 dark:border-blue-800/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
							<div className="p-6 pb-4">
								<div className="rounded-xl bg-gray-950 p-4 font-mono text-xs leading-6 text-gray-300 overflow-hidden shadow-inner">
									<div>
										<span className="text-purple-400">import</span> {'{ PageAgent }'}{' '}
										<span className="text-purple-400">from</span>{' '}
										<span className="text-emerald-400">&apos;page-agent&apos;</span>
									</div>
									<div className="mt-2">
										<span className="text-purple-400">const</span>{' '}
										<span className="text-blue-300">copilot</span> ={' '}
										<span className="text-purple-400">new</span>{' '}
										<span className="text-yellow-300">PageAgent</span>
										{'({'}
									</div>
									<div className="pl-4">
										<span className="text-blue-300">model</span>:{' '}
										<span className="text-emerald-400">&apos;gpt-5.1&apos;</span>,
									</div>
									<div className="pl-4">
										<span className="text-blue-300">apiKey</span>:{' '}
										<span className="text-emerald-400">process.env.KEY</span>,
									</div>
									<div>{'})'}</div>
								</div>
							</div>
							<div className="p-6 pt-2">
								<div className="flex items-center gap-2 mb-2">
									<Bot className="w-5 h-5 text-blue-500" />
									<h3 className="font-semibold text-lg text-foreground">
										{isZh ? 'SaaS AI 副驾驶' : 'SaaS AI Copilot'}
									</h3>
								</div>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{isZh
										? '几小时内为你的产品加上 AI 副驾驶，不需要重写后端。'
										: 'Ship an AI copilot in your product in hours, not months. No backend rewrite needed.'}
								</p>
							</div>
						</div>
					</BlurFade>

					{/* Smart Form Filling */}
					<BlurFade inView delay={0.1}>
						<div className="group relative overflow-hidden rounded-2xl bg-linear-to-b from-amber-50 to-white dark:from-amber-950/40 dark:to-gray-800 border border-amber-200/80 dark:border-amber-800/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
							<div className="p-6 pb-4">
								<div className="rounded-xl bg-background border border-border p-4 shadow-inner space-y-2.5">
									<div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/30 rounded-lg px-3 py-2 border border-amber-200/50 dark:border-amber-700/40">
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
											<span className="text-xs text-gray-400 dark:text-gray-500 w-12 shrink-0">
												{field.label}
											</span>
											<div className="flex-1 h-7 bg-muted rounded border border-border px-2 flex items-center text-xs text-muted-foreground">
												{field.value}
											</div>
											<span className="text-emerald-500 text-xs">✓</span>
										</div>
									))}
								</div>
							</div>
							<div className="p-6 pt-2">
								<div className="flex items-center gap-2 mb-2">
									<Zap className="w-5 h-5 text-amber-500" />
									<h3 className="font-semibold text-lg text-foreground">
										{isZh ? '智能表单填写' : 'Smart Form Filling'}
									</h3>
								</div>
								<p className="text-sm text-muted-foreground leading-relaxed">
									{isZh
										? '把 20 次点击变成一句话。ERP、CRM、管理后台的最佳拍档。'
										: 'Turn 20-click workflows into one sentence. Perfect for ERP, CRM, and admin systems.'}
								</p>
							</div>
						</div>
					</BlurFade>

					{/* Accessibility */}
					<BlurFade inView delay={0.15}>
						<div className="group relative overflow-hidden rounded-2xl bg-linear-to-b from-purple-50 to-white dark:from-purple-950/40 dark:to-gray-800 border border-purple-200/80 dark:border-purple-800/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
							<div className="p-6 pb-4 flex flex-col items-center justify-center">
								<div className="w-full rounded-xl bg-purple-50 dark:bg-purple-900/30 p-5 space-y-3">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-base">
											🎤
										</div>
										<div className="text-sm text-purple-700 dark:text-purple-300 italic">
											{isZh ? '"点击提交按钮"' : '"Click the submit button"'}
										</div>
									</div>
									<div className="flex items-center gap-3 pl-11">
										<div className="flex items-center gap-1.5">
											<div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
											<div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
											<div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
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
							<div className="p-6 pt-2">
								<div className="flex items-center gap-2 mb-2">
									<Users className="w-5 h-5 text-purple-500" />
									<h3 className="font-semibold text-lg text-foreground">
										{isZh ? '无障碍增强' : 'Accessibility'}
									</h3>
								</div>
								<p className="text-sm text-muted-foreground leading-relaxed">
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
