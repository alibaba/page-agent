import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function Overview() {
	const { isZh } = useLanguage()

	return (
		<article>
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-4">Overview</h1>
				<p className="text-xl text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
					{isZh
						? 'page-agent 是一个完全基于 Web 技术的 GUI Agent，简单几步，让你的网站拥有 AI 操作员。'
						: 'page-agent is a purely web-based GUI Agent. Gives your website an AI operator in simple steps.'}
				</p>

				{/* Status Badges */}
				<div className="flex flex-wrap gap-2 items-center">
					<a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">
						<img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License" />
					</a>
					<a href="http://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer">
						<img
							src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg"
							alt="TypeScript"
						/>
					</a>
					<a
						href="https://www.npmjs.com/package/page-agent"
						target="_blank"
						rel="noopener noreferrer"
					>
						<img src="https://img.shields.io/npm/dt/page-agent.svg" alt="Downloads" />
					</a>
					<a
						href="https://bundlephobia.com/package/page-agent"
						target="_blank"
						rel="noopener noreferrer"
					>
						<img src="https://img.shields.io/bundlephobia/minzip/page-agent" alt="Bundle Size" />
					</a>
					<a href="https://github.com/alibaba/page-agent" target="_blank" rel="noopener noreferrer">
						<img
							src="https://img.shields.io/github/stars/alibaba/page-agent.svg"
							alt="GitHub stars"
						/>
					</a>
				</div>
			</div>

			<section>
				<Heading id="what-is-page-agent" className="text-2xl font-bold mb-4">
					{isZh ? '什么是 page-agent？' : 'What is page-agent?'}
				</Heading>

				<p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed ">
					{isZh
						? 'page-agent 是一个页面内嵌式 GUI Agent。与传统的浏览器自动化工具不同，page-agent 面向网站开发者，而非爬虫或Agent客户端开发者；将 Agent 集成到你的网站中，让用户可以通过自然语言与页面进行交互。'
						: 'page-agent is an embedded GUI Agent. Unlike traditional browser automation tools, page-agent is built for web developers and web applications first. Integrate it into your site to let users interact with pages through natural language.'}
				</p>
			</section>

			<section>
				<Heading id="core-features" className="text-2xl font-bold mb-3">
					{isZh ? '核心特性' : 'Core Features'}
				</Heading>

				<div className="grid md:grid-cols-2 gap-4 mb-8" role="list">
					<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
							{isZh ? '🧠 智能 DOM 理解' : '🧠 Smart DOM Analysis'}
						</h3>
						<p className="text-gray-700 dark:text-gray-300">
							{isZh
								? '基于 DOM 分析，高强度脱水。无需视觉识别，纯文本实现精准操作。'
								: 'DOM-based analysis with high-intensity dehydration. No visual recognition needed. Pure text for fast and precise operations.'}
						</p>
					</div>

					<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
							{isZh ? '🔒 安全可控' : '🔒 Secure & Controllable'}
						</h3>
						<p className="text-gray-700 dark:text-gray-300">
							{isZh
								? '支持操作黑白名单、数据脱敏保护。注入自定义知识库，让 AI 按你的规则工作。'
								: 'Supports operation allowlists, data masking protection. Inject custom knowledge to make AI work by your rules.'}
						</p>
					</div>

					<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
							{isZh ? '⚡ 零后端部署' : '⚡ Zero Backend'}
						</h3>
						<p className="text-gray-700 dark:text-gray-300">
							{isZh
								? 'CDN 或 NPM 引入，自定义 LLM 接入点。'
								: 'CDN or NPM import with custom LLM endpoints.'}
						</p>
					</div>

					<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
							{isZh ? '♿ 普惠智能' : '♿ Accessible Intelligence'}
						</h3>
						<p className="text-gray-700 dark:text-gray-300">
							{isZh
								? '为复杂 B端系统、管理后台提供自然语言入口。让每个用户都能轻松上手。'
								: 'Provides natural language interface for complex B2B systems and admin panels. Makes software easy for everyone.'}
						</p>
					</div>
				</div>

				<Heading id="vs-browser-use" className="text-2xl font-bold mb-4">
					{isZh ? '与 browser-use 的区别' : 'vs. browser-use'}
				</Heading>

				<div className="overflow-x-auto mb-8">
					<table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
						<thead>
							<tr className="bg-gray-50 dark:bg-gray-800">
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left"></th>
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left">
									page-agent
								</th>
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left">
									browser-use
								</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									{isZh ? '部署方式' : 'Deployment'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{isZh ? '页面内嵌组件' : 'Embedded component'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{isZh ? '外部工具' : 'External tool'}
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									{isZh ? '操作范围' : 'Scope'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{isZh ? '当前页面' : 'Current page'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{isZh ? '整个浏览器' : 'Entire browser'}
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									{isZh ? '目标用户' : 'Target Users'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{isZh ? '网站开发者' : 'Web developers'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{isZh ? '爬虫/Agent 开发者' : 'Scraper/Agent developers'}
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
									{isZh ? '使用场景' : 'Use Case'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{isZh ? '用户体验增强' : 'UX enhancement'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
									{isZh ? '自动化任务' : 'Automation tasks'}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<Heading id="use-cases" className="text-2xl font-bold mb-4">
					{isZh ? '应用场景' : 'Use Cases'}
				</Heading>

				<ul className="space-y-4 mb-8">
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 min-w-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 shrink-0">
							1
						</span>
						<div className="text-gray-700 dark:text-gray-300">
							<strong>{isZh ? '对接答疑机器人：' : 'Connect Support Bots:'}</strong>{' '}
							{isZh
								? '把你的答疑助手变成全能Agent。客服机器人不再只说「请先点击设置按钮然后点击...」，而是直接帮用户现场操作。'
								: "Turn your support assistant into a full agent. Customer service bots no longer just say 'Please click the settings button then click...'—they operate for users directly."}
						</div>
					</li>
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 min-w-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 shrink-0">
							2
						</span>
						<div className="text-gray-700 dark:text-gray-300">
							<strong>{isZh ? '交互升级/智能化改造：' : 'Modernize Legacy Apps:'}</strong>{' '}
							{isZh
								? '一行代码，老应用变身Agent，产品专家帮用户操作复杂 B 端软件。降低人工支持成本，提高用户满意度。'
								: 'One line of code transforms old apps into agents. Product experts help users navigate complex B2B software. Reduce support costs and improve satisfaction.'}
						</div>
					</li>
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 min-w-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 shrink-0">
							3
						</span>
						<div className="text-gray-700 dark:text-gray-300">
							<strong>{isZh ? '产品教学：' : 'Interactive Training:'}</strong>{' '}
							{isZh
								? '向用户演示交互过程，边做边教。例如让AI演示「如何提交报销申请」的完整操作流程。'
								: "Demonstrate workflows in real-time. Let AI show the complete process of 'how to submit an expense report.'"}
						</div>
					</li>
					<li className="flex items-start space-x-3">
						<span className="w-6 h-6 min-w-6 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm mt-0.5 shrink-0">
							4
						</span>
						<div className="text-gray-700 dark:text-gray-300">
							<strong>{isZh ? '无障碍支持：' : 'Accessibility:'}</strong>{' '}
							{isZh
								? '为视障用户、老年用户提供自然语言交互，对接屏幕阅读器或语音助理，让软件人人可用。'
								: 'Provide natural language interaction for visually impaired and elderly users. Connect screen readers or voice assistants to make software accessible to everyone.'}
						</div>
					</li>
				</ul>
			</section>
		</article>
	)
}
