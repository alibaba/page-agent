import { Link } from 'wouter'

import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { APIReference, TypeRef } from '@/components/ui/api-reference'
import { useLanguage } from '@/i18n/context'

export default function PageAgentDocs() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">PageAgent</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? 'PageAgent 是带有内置 UI 面板的完整 Agent 类。它继承自 PageAgentCore，并自动创建交互面板。'
					: 'PageAgent is the complete Agent class with built-in UI panel. It extends PageAgentCore and automatically creates an interactive panel.'}
			</p>

			{/* When to use */}
			<section className="mb-10">
				<Heading id="when-to-use-pageagent" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '何时使用 PageAgent' : 'When to Use PageAgent'}
				</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '在大多数场景下，你应该使用 PageAgent。它提供了开箱即用的完整体验：'
						: 'In most cases, you should use PageAgent. It provides a complete out-of-the-box experience:'}
				</p>
				<ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-6">
					<li>
						{isZh
							? '内置 UI 面板，显示任务进度、Agent 思考过程和操作结果'
							: 'Built-in UI panel showing task progress, agent thinking, and action results'}
					</li>
					<li>
						{isZh
							? '支持 ask_user 工具，Agent 可以向用户提问'
							: 'Supports ask_user tool for agent to ask questions to users'}
					</li>
				</ul>
			</section>

			{/* Basic Usage */}
			<section className="mb-10">
				<Heading id="basic-usage" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '基本用法' : 'Basic Usage'}
				</Heading>
				<CodeEditor
					language="typescript"
					code={`import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  // LLM Configuration (required)
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-5.2',
  
  // Optional settings
  language: 'en-US',
})

// Execute a task
const result = await agent.execute('Click the login button')

console.log(result.success) // true or false
console.log(result.data)    // Task result description
console.log(result.history) // Full execution history`}
				/>
			</section>

			{/* Class Definition */}
			<section className="mb-10">
				<Heading id="class-definition" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '类定义' : 'Class Definition'}
				</Heading>
				<CodeEditor
					language="typescript"
					code={`class PageAgent extends PageAgentCore {
  /** The UI panel instance */
  panel: Panel

  constructor(config: PageAgentConfig)
}`}
				/>
				<p className="text-gray-600 dark:text-gray-400 mt-4">
					{isZh ? (
						<>
							PageAgent 继承自{' '}
							<Link
								href="/advanced/page-agent-core"
								className="text-blue-600 dark:text-blue-400 hover:underline"
							>
								PageAgentCore
							</Link>
							，所有核心方法和事件都可用。详细的 API 参考请查看 PageAgentCore 文档。
						</>
					) : (
						<>
							PageAgent extends{' '}
							<Link
								href="/advanced/page-agent-core"
								className="text-blue-600 dark:text-blue-400 hover:underline"
							>
								PageAgentCore
							</Link>
							. All core methods and events are available. See PageAgentCore docs for detailed API
							reference.
						</>
					)}
				</p>
			</section>

			{/* Configuration */}
			<section className="mb-10">
				<Heading id="configuration" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '配置' : 'Configuration'}
				</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? 'PageAgent 使用与 PageAgentCore 相同的配置接口。'
						: 'PageAgent uses the same configuration interface as PageAgentCore.'}
				</p>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh ? (
						<>
							完整配置请参考{' '}
							<Link
								href="/advanced/page-agent-core"
								className="text-blue-600 dark:text-blue-400 hover:underline"
							>
								PageAgentCore 配置文档
							</Link>
							。
						</>
					) : (
						<>
							See{' '}
							<Link
								href="/advanced/page-agent-core"
								className="text-blue-600 dark:text-blue-400 hover:underline"
							>
								PageAgentCore configuration docs
							</Link>{' '}
							for complete reference.
						</>
					)}
				</p>
			</section>

			{/* Panel Property */}
			<section className="mb-10">
				<Heading id="panel-property" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? 'Panel 属性' : 'Panel Property'}
				</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? 'PageAgent 自动创建一个 Panel 实例。你可以通过 panel 属性访问它来控制 UI：'
						: 'PageAgent automatically creates a Panel instance. You can access it via the panel property to control the UI:'}
				</p>

				<APIReference
					properties={[
						{
							name: 'panel',
							type: 'Panel',
							required: true,
							description: isZh
								? '内置的 UI 面板实例，用于显示任务进度和接收用户输入。'
								: 'The built-in UI panel instance for displaying task progress and receiving user input.',
						},
					]}
				/>

				<h3 className="text-lg font-semibold mt-6 mb-3">{isZh ? 'Panel 方法' : 'Panel Methods'}</h3>
				<CodeEditor
					language="typescript"
					code={`// Show/hide the panel
agent.panel.show()
agent.panel.hide()

// Expand/collapse history view
agent.panel.expand()
agent.panel.collapse()

// Reset panel state
agent.panel.reset()

// Dispose panel (called automatically when agent disposes)
agent.panel.dispose()`}
				/>
			</section>

			{/* Comparison with PageAgentCore */}
			<section className="mb-10">
				<Heading id="pageagent-vs-pageagentcore" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? 'PageAgent vs PageAgentCore' : 'PageAgent vs PageAgentCore'}
				</Heading>
				<div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 dark:bg-gray-800/50">
								<th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300"></th>
								<th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">
									PageAgent
								</th>
								<th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">
									PageAgentCore
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							<tr className="bg-white dark:bg-gray-900">
								<td className="px-4 py-3 text-gray-600 dark:text-gray-400">
									{isZh ? 'UI 面板' : 'UI Panel'}
								</td>
								<td className="px-4 py-3 text-center text-green-600 dark:text-green-400">✓</td>
								<td className="px-4 py-3 text-center text-gray-400 dark:text-gray-600">-</td>
							</tr>
							<tr className="bg-white dark:bg-gray-900">
								<td className="px-4 py-3 text-gray-600 dark:text-gray-400">
									{isZh ? 'Headless 模式' : 'Headless Mode'}
								</td>
								<td className="px-4 py-3 text-center text-gray-400 dark:text-gray-600">-</td>
								<td className="px-4 py-3 text-center text-green-600 dark:text-green-400">✓</td>
							</tr>
							<tr className="bg-white dark:bg-gray-900">
								<td className="px-4 py-3 text-gray-600 dark:text-gray-400">
									{isZh ? '自定义 PageController' : 'Custom PageController'}
								</td>
								<td className="px-4 py-3 text-center text-green-600 dark:text-green-400">✓</td>
								<td className="px-4 py-3 text-center text-green-600 dark:text-green-400">✓</td>
							</tr>
							<tr className="bg-white dark:bg-gray-900">
								<td className="px-4 py-3 text-gray-600 dark:text-gray-400">
									{isZh ? '适用场景' : 'Use Case'}
								</td>
								<td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
									{isZh ? '网页集成' : 'Web integration'}
								</td>
								<td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
									{isZh ? '自定义 UI / 无头' : 'Custom UI / Headless'}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>
		</div>
	)
}
