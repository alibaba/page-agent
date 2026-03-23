import { Link } from 'wouter'

import { APIDivider, APIReference, TypeRef } from '@/components/APIReference'
import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function PageAgentCoreDocs() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">PageAgentCore</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? 'PageAgentCore 是不带 UI 的核心 Agent 类。用于需要自定义 UI 或无头运行的场景。'
					: 'PageAgentCore is the core Agent class without UI. Use it for custom UI or headless scenarios.'}
			</p>

			{/* When to use */}
			<section className="mb-10">
				<Heading id="when-to-use-pageagentcore">
					{isZh ? '何时使用 PageAgentCore' : 'When to Use PageAgentCore'}
				</Heading>
				<ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2">
					<li>{isZh ? '需要自定义 UI 界面' : 'Need a custom UI interface'}</li>
					<li>{isZh ? '在自动化测试中无头运行' : 'Running headless in automated tests'}</li>
					<li>
						{isZh
							? '在非浏览器环境运行（需自定义 PageController）'
							: 'Running in non-browser environments (requires custom PageController)'}
					</li>
					<li>
						{isZh
							? '将 PageAgent 嵌入其他 Agent 系统'
							: 'Embedding PageAgent in other agent systems'}
					</li>
				</ul>
			</section>

			{/* Basic Usage */}
			<section className="mb-10">
				<Heading id="basic-usage">{isZh ? '基本用法' : 'Basic Usage'}</Heading>
				<CodeEditor
					language="typescript"
					code={`import { PageAgentCore } from '@page-agent/core'
import { PageController } from '@page-agent/page-controller'

const agent = new PageAgentCore({
  pageController: new PageController({ enableMask: true }),
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-5.2',
})

// Listen to events for UI display
agent.addEventListener('statuschange', () => {
  console.log('Status:', agent.status)
})

agent.addEventListener('activity', (e) => {
  const activity = (e as CustomEvent).detail
  console.log('Activity:', activity.type)
})

// Execute task
const result = await agent.execute('Fill in the form with test data')`}
				/>
			</section>

			<APIDivider title={isZh ? '配置' : 'Configuration'} />

			{/* Configuration */}
			<section className="mb-10">
				<Heading id="configuration">PageAgentCoreConfig</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? 'PageAgentCoreConfig = AgentConfig & { pageController: PageController }。AgentConfig 包含以下配置项：'
						: 'PageAgentCoreConfig = AgentConfig & { pageController: PageController }. AgentConfig contains the following options:'}
				</p>

				{/* PageController */}
				<h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">
					PageController
				</h3>
				<APIReference
					properties={[
						{
							name: 'pageController',
							type: 'PageController',
							required: true,
							description: isZh ? (
								<>
									<Link
										href="/advanced/page-controller"
										className="text-blue-600 dark:text-blue-400 hover:underline"
									>
										PageController
									</Link>{' '}
									实例，用于 DOM 操作和元素交互。
								</>
							) : (
								<>
									<Link
										href="/advanced/page-controller"
										className="text-blue-600 dark:text-blue-400 hover:underline"
									>
										PageController
									</Link>{' '}
									instance for DOM operations and element interaction.
								</>
							),
						},
					]}
				/>

				{/* LLM Config */}
				<h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">
					{isZh ? 'LLM 配置' : 'LLM Config'}
				</h3>
				<APIReference
					properties={[
						{
							name: 'baseURL',
							type: 'string',
							required: true,
							description: isZh
								? 'LLM API 的基础 URL（如 https://api.openai.com/v1）'
								: 'Base URL of the LLM API (e.g., https://api.openai.com/v1)',
						},
						{
							name: 'model',
							type: 'string',
							required: true,
							description: isZh
								? '模型名称（如 gpt-5.2, anthropic/claude-4.5-haiku）'
								: 'Model name (e.g., gpt-5.2, anthropic/claude-4.5-haiku)',
						},
						{
							name: 'apiKey',
							type: 'string',
							required: false,
							description: 'LLM AK',
						},
						{
							name: 'temperature',
							type: 'number',
							description: isZh
								? '模型温度参数，控制输出随机性'
								: 'Model temperature, controls output randomness',
						},
						{
							name: 'maxRetries',
							type: 'number',
							defaultValue: '3',
							description: isZh ? 'API 调用失败时的最大重试次数' : 'Maximum retries on API failure',
						},
						{
							name: 'disableNamedToolChoice',
							type: 'boolean',
							defaultValue: 'false',
							description: isZh
								? '禁用命名 tool_choice，始终使用 "required" 字符串。适用于不支持 tool_choice 对象格式的 LLM 服务。'
								: 'Disable named tool_choice, always use "required" string. For LLM services that don\'t support the object format of tool_choice.',
						},
						{
							name: 'customFetch',
							type: 'typeof fetch',
							description: isZh
								? '自定义 fetch 函数，用于定制 headers、credentials、代理等'
								: 'Custom fetch function for customizing headers, credentials, proxy, etc.',
						},
					]}
				/>

				{/* Agent Config */}
				<h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">
					{isZh ? 'Agent 配置' : 'Agent Config'}
				</h3>
				<APIReference
					properties={[
						{
							name: 'language',
							type: "'en-US' | 'zh-CN'",
							defaultValue: "'en-US'",
							description: isZh ? 'Agent 输出语言' : 'Agent output language',
						},
						{
							name: 'maxSteps',
							type: 'number',
							defaultValue: '40',
							description: isZh ? '每个任务的最大步骤数' : 'Maximum number of steps per task',
						},
						{
							name: 'customTools',
							type: 'Record<string, PageAgentTool | null>',
							status: 'experimental',
							description: isZh
								? '自定义工具，可扩展或覆盖内置工具。设为 null 可移除工具。'
								: 'Custom tools to extend or override built-in tools. Set to null to remove a tool.',
						},
						{
							name: 'instructions',
							type: 'InstructionsConfig',
							description: isZh
								? '指导 Agent 行为的指令配置，见下方类型定义'
								: 'Instructions to guide agent behavior, see type definition below',
						},
						{
							name: 'transformPageContent',
							type: '(content: string) => string | Promise<string>',
							description: isZh
								? '发送给 LLM 前转换页面内容，可用于数据脱敏'
								: 'Transform page content before sending to LLM, useful for data masking',
						},
						{
							name: 'customSystemPrompt',
							type: 'string',
							status: 'experimental',
							description: isZh
								? '完全覆盖默认系统提示词。谨慎使用。'
								: 'Completely override the default system prompt. Use with caution.',
						},
						{
							name: 'experimentalScript\nExecutionTool',
							type: 'boolean',
							defaultValue: 'false',
							status: 'experimental',
							description: isZh
								? '启用实验性 JavaScript 执行工具'
								: 'Enable experimental JavaScript execution tool',
						},
						{
							name: 'experimentalLlmsTxt',
							type: 'boolean',
							defaultValue: 'false',
							status: 'experimental',
							description: isZh
								? '从当前站点根目录获取 /llms.txt 并作为上下文提供给 LLM'
								: 'Fetch /llms.txt from site origin and include as LLM context',
						},
					]}
				/>

				{/* Lifecycle Hooks */}
				<h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">
					{isZh ? '生命周期钩子' : 'Lifecycle Hooks'}
					<span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
						experimental
					</span>
				</h3>
				<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
					<p className="text-amber-800 dark:text-amber-200 text-sm">
						{isZh
							? '这些接口高度实验性，可能在未来版本中发生变化。'
							: 'These APIs are highly experimental and may change in future versions. '}
					</p>
				</div>
				<APIReference
					properties={[
						{
							name: 'onBeforeStep',
							type: '(agent, stepCount) => void | Promise<void>',
							description: isZh ? '每个步骤执行前调用' : 'Called before each step execution',
						},
						{
							name: 'onAfterStep',
							type: '(agent, history) => void | Promise<void>',
							description: isZh ? '每个步骤执行后调用' : 'Called after each step execution',
						},
						{
							name: 'onBeforeTask',
							type: '(agent) => void | Promise<void>',
							description: isZh ? '任务开始前调用' : 'Called before task starts',
						},
						{
							name: 'onAfterTask',
							type: '(agent, result) => void | Promise<void>',
							description: isZh ? '任务结束后调用' : 'Called after task ends',
						},
						{
							name: 'onDispose',
							type: '(agent, reason?) => void',
							description: isZh ? 'Agent 销毁时调用' : 'Called when agent is disposed',
						},
					]}
				/>
			</section>

			<APIDivider title={isZh ? '属性与方法' : 'Properties & Methods'} />

			{/* Properties */}
			<section className="mb-10">
				<Heading id="properties">{isZh ? '属性' : 'Properties'}</Heading>
				<APIReference
					properties={[
						{
							name: 'status',
							type: "'idle' | 'running' | 'completed' | 'error'",
							description: isZh ? '当前 Agent 执行状态' : 'Current agent execution status',
						},
						{
							name: 'history',
							type: 'HistoricalEvent[]',
							description: isZh
								? '历史事件数组，构成 Agent 的记忆'
								: 'Array of historical events, forms agent memory',
						},
						{
							name: 'task',
							type: 'string',
							description: isZh ? '当前正在执行的任务' : 'Current task being executed',
						},
						{
							name: 'pageController',
							type: 'PageController',
							description: isZh
								? 'PageController 实例，用于 DOM 操作'
								: 'PageController instance for DOM operations',
						},
						{
							name: 'tools',
							type: 'Map<string, PageAgentTool>',
							description: isZh ? '可用工具的 Map' : 'Map of available tools',
						},
						{
							name: 'onAskUser',
							type: '(question: string) => Promise<string>',
							description: isZh
								? 'Agent 需要用户输入时的回调。未设置则禁用 ask_user 工具。'
								: 'Callback when agent needs user input. If not set, ask_user tool is disabled.',
						},
					]}
				/>
			</section>

			{/* Methods */}
			<section className="mb-10">
				<Heading id="methods">{isZh ? '方法' : 'Methods'}</Heading>
				<APIReference
					variant="methods"
					properties={[
						{
							name: 'execute(task)',
							type: 'Promise<ExecutionResult>',
							description: isZh
								? '执行任务并返回结果。包含 success、data 和 history 字段。'
								: 'Execute a task and return result. Contains success, data, and history fields.',
						},
						{
							name: 'stop()',
							type: 'void',
							description: isZh
								? '停止当前任务。Agent 仍可复用。'
								: 'Stop the current task. Agent remains reusable.',
						},
						{
							name: 'dispose()',
							type: 'void',
							description: isZh
								? '销毁 Agent 并清理资源'
								: 'Dispose the agent and clean up resources',
						},
					]}
				/>
			</section>

			{/* Events */}
			<section className="mb-10">
				<Heading id="events">{isZh ? '事件' : 'Events'}</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh ? (
						<>
							PageAgentCore 继承自 <TypeRef>EventTarget</TypeRef>，提供以下事件：
						</>
					) : (
						<>
							PageAgentCore extends <TypeRef>EventTarget</TypeRef> and provides the following
							events:
						</>
					)}
				</p>
				<APIReference
					properties={[
						{
							name: 'statuschange',
							type: 'Event',
							description: isZh
								? 'Agent 状态变化时触发 (idle → running → completed/error)'
								: 'Fired when agent status changes (idle → running → completed/error)',
						},
						{
							name: 'historychange',
							type: 'Event',
							description: isZh
								? '历史事件更新时触发（持久化事件，构成 Agent 记忆）'
								: 'Fired when history events are updated (persistent, part of agent memory)',
						},
						{
							name: 'activity',
							type: 'CustomEvent<AgentActivity>',
							description: isZh
								? '实时活动反馈（短暂状态，仅用于 UI）。类型包括：thinking, executing, executed, retrying, error'
								: 'Real-time activity feedback (transient, UI only). Types: thinking, executing, executed, retrying, error',
						},
						{
							name: 'dispose',
							type: 'Event',
							description: isZh ? 'Agent 被销毁时触发' : 'Fired when agent is disposed',
						},
					]}
				/>
			</section>

			<APIDivider title={isZh ? '类型定义' : 'Type Definitions'} />

			{/* ExecutionResult */}
			<section className="mb-10">
				<Heading id="executionresult">ExecutionResult</Heading>
				<CodeEditor
					language="typescript"
					code={`interface ExecutionResult {
  success: boolean
  data: string
  history: HistoricalEvent[]
}`}
				/>
			</section>

			{/* AgentActivity */}
			<section className="mb-10">
				<Heading id="agentactivity">AgentActivity</Heading>
				<CodeEditor
					language="typescript"
					code={`type AgentActivity =
  | { type: 'thinking' }
  | { type: 'executing'; tool: string; input: unknown }
  | { type: 'executed'; tool: string; input: unknown; output: string; duration: number }
  | { type: 'retrying'; attempt: number; maxAttempts: number }
  | { type: 'error'; message: string }`}
				/>
			</section>

			{/* InstructionsConfig */}
			<section className="mb-10">
				<Heading id="instructionsconfig">InstructionsConfig</Heading>
				<CodeEditor
					language="typescript"
					code={`interface InstructionsConfig {
  /** Global system-level instructions, applied to all tasks */
  system?: string

  /**
   * Dynamic page-level instructions callback.
   * Called before each step to get instructions for the current page.
   */
  getPageInstructions?: (url: string) => string | undefined
}`}
				/>
			</section>
		</div>
	)
}
