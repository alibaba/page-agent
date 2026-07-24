import { ExternalLink } from 'lucide-react'
import { siGooglechrome } from 'simple-icons'
import { Link } from 'wouter'

import { AuroraText } from '../../components/ui/aurora-text'
import { BlurFade } from '../../components/ui/blur-fade'
import { useLanguage } from '../../i18n/context'

export default function OneMoreThingSection() {
	const { isZh } = useLanguage()

	return (
		<section className="px-6 py-20" aria-labelledby="one-more-thing-heading">
			<div className="mx-auto max-w-5xl">
				<div className="rounded-3xl bg-linear-to-r from-indigo-500/40 via-fuchsia-500/40 to-cyan-400/40 p-[1.5px] shadow-2xl shadow-indigo-500/10">
					<div className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-white px-6 py-14 text-center sm:px-10 dark:bg-gray-950">
						{/* Inner glow */}
						<div
							className="absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl"
							aria-hidden="true"
						></div>

						<div className="relative">
							<BlurFade inView>
								<span className="font-mono text-xs tracking-[0.3em] text-indigo-500 uppercase dark:text-indigo-400">
									{isZh ? '还有一件事' : 'One more thing'}
								</span>
								<h2
									id="one-more-thing-heading"
									className="mt-3 mb-5 text-3xl font-bold tracking-tight text-gray-900 lg:text-5xl dark:text-white"
								>
									{isZh ? (
										<>
											让 Agent{' '}
											<AuroraText colors={['#6366f1', '#a855f7', '#06b6d4']}>跨页面</AuroraText>
											工作
										</>
									) : (
										<>
											Go{' '}
											<AuroraText colors={['#6366f1', '#a855f7', '#06b6d4']}>multi-page</AuroraText>
										</>
									)}
								</h2>
								<p className="mx-auto mb-3 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
									{isZh
										? '想要多页面控制？试试可选的浏览器扩展。'
										: 'Need multi-page control? Try the optional browser extension.'}
								</p>
								<p className="mx-auto mb-10 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
									{'* '}
									{isZh
										? 'PageOS 本身无需任何扩展即可工作，扩展是额外的能力增强。'
										: 'PageOS works without any extension — this is a power-up, not a dependency.'}
								</p>
							</BlurFade>

							<div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
								<a
									href="https://chromewebstore.google.com/detail/page-os-ext/akldabonmimlicnjlflnapfeklbfemhj"
									target="_blank"
									rel="noopener noreferrer"
									className="group inline-flex items-center gap-3 rounded-2xl bg-linear-to-r from-indigo-600 to-fuchsia-600 px-8 py-4 font-medium text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl"
								>
									<img
										src="https://equalbyte.github.io/agentic-page/assets/third-party/chrome-web-store-192.svg"
										alt="Chrome Web Store"
										className="h-7 w-7"
									/>
									<span>{isZh ? '从 Chrome 应用商店安装' : 'Install from Chrome Web Store'}</span>
									<ExternalLink className="h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
								</a>
								<Link
									href="/docs/features/chrome-extension"
									className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white/70 px-8 py-4 font-medium text-gray-900 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-indigo-300 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-indigo-500/40"
								>
									<svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
										<path d={siGooglechrome.path} fill="currentColor" />
									</svg>
									<span>{isZh ? '查看文档' : 'Read the Docs'}</span>
								</Link>
							</div>

							<div className="mx-auto mb-10 max-w-3xl rounded-2xl border border-gray-200/80 bg-gray-50/70 px-5 py-4 text-left sm:text-center dark:border-white/10 dark:bg-white/[0.03]">
								<p className="text-sm leading-7 text-gray-700 dark:text-gray-300">
									{isZh
										? '从 Claude Desktop、Copilot 或其他本地 Agent 直接发起浏览器任务？'
										: 'Using Claude Desktop, Copilot, or another local agent? Connect it to the extension with the MCP server.'}
								</p>
								<p>
									<Link
										href="/docs/features/mcp-server"
										className="font-medium text-indigo-600 underline underline-offset-4 dark:text-indigo-400"
									>
										{isZh ? '查看 MCP 文档' : 'Read the MCP docs'}
									</Link>
								</p>
							</div>

							<div className="mx-auto grid max-w-3xl gap-4 text-left sm:grid-cols-3">
								{[
									{
										title: isZh ? '多页面任务' : 'Multi-Page Tasks',
										desc: isZh
											? '跨多个页面和标签页连续执行任务，不再受限于单页上下文'
											: 'Run tasks across multiple pages and tabs without being limited to a single page context',
									},
									{
										title: isZh ? '从页面发起控制' : 'Control from a WebPage',
										desc: isZh
											? '在页面 JS 中发起任务，驱动整个浏览器完成跨标签操作'
											: 'Trigger tasks from in-page JS to drive the entire browser across tabs',
									},
									{
										title: isZh ? '外部发起任务' : 'External Caller',
										desc: isZh
											? '页面 JS、本地 Agent 或云端 Agent 均可通过扩展发起任务'
											: 'Local agents and cloud agents can control user browser through the extension',
									},
								].map((item) => (
									<div
										key={item.title}
										className="rounded-xl border border-gray-200/80 bg-white/70 p-5 backdrop-blur-sm transition-colors hover:border-indigo-300/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-500/40"
									>
										<h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
											{item.title}
										</h3>
										<p className="text-sm text-gray-600 dark:text-gray-300">{item.desc}</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
