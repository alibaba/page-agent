import { ExternalLink } from 'lucide-react'
import { siGooglechrome } from 'simple-icons'
import { Link } from 'wouter'

import { BlurFade } from '../../components/ui/blur-fade'
import { MagicCard } from '../../components/ui/magic-card'
import { useLanguage } from '../../i18n/context'

export default function OneMoreThingSection() {
	const { isZh } = useLanguage()

	return (
		<section className="px-6 py-14" aria-labelledby="one-more-thing-heading">
			<div className="max-w-4xl mx-auto text-center">
				<BlurFade inView>
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
				</BlurFade>

				<div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
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

				<div className="grid sm:grid-cols-3 gap-5 text-left max-w-3xl mx-auto">
					{[
						{
							title: isZh ? '多页面任务' : 'Multi-Page Tasks',
							desc: isZh
								? '跨多个页面和标签页连续执行任务，不再受限于单页上下文'
								: 'Run tasks across multiple pages and tabs without being limited to a single page context',
						},
						{
							title: isZh ? '页面内发起控制' : 'Control from Your Page',
							desc: isZh
								? '在页面 JS 中发起任务，驱动整个浏览器完成跨标签操作'
								: 'Trigger tasks from page JS to drive the entire browser across tabs',
						},
						{
							title: isZh ? '外部发起任务' : 'External Triggers',
							desc: isZh
								? '页面 JS、本地 Agent 或云端 Agent 均可通过扩展发起任务'
								: 'Page JS, local agents, or cloud agents can trigger tasks through the extension',
						},
					].map((item) => (
						<MagicCard
							key={item.title}
							className="rounded-xl"
							gradientColor="#8b5cf620"
							gradientOpacity={0.15}
						>
							<div className="p-5">
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
								<p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
							</div>
						</MagicCard>
					))}
				</div>
			</div>
		</section>
	)
}
