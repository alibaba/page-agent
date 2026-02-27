import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { APIDivider, APIReference, TypeRef } from '@/components/ui/api-reference'
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
				<Heading id="when-to-use-pageagentcore" level={2} className="text-2xl font-semibold mb-4">
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
				<Heading id="basic-usage" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '基本用法' : 'Basic Usage'}
				</Heading>
				<CodeEditor
					language="typescript"
					code={`import { PageAgentCore } from '@page-agent/core'
import { PageController } from '@page-agent/page-controller'

const agent = new PageAgentCore({
  pageController: new PageController({ enableMask: true }),
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-5.2',
  language: 'en-US',
})

// Listen to events for UI display

agent.addEventListener('statuschange', () => {
  console.log('Status:', agent.status)
})

agent.addEventListener('historychange', () => {
  console.log('History:', agent.history)
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

			{/* LLM Configuration */}
			<section className="mb-10">
				<Heading id="llmconfig" level={2} className="text-2xl font-semibold mb-4">
					LLMConfig
				</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '配置与大语言模型的连接参数。支持 OpenAI 兼容的 API。'
						: 'Configure connection parameters for the language model. Supports OpenAI-compatible APIs.'}
				</p>
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
							name: 'apiKey',
							type: 'string',
							required: true,
							description: isZh ? 'API 密钥' : 'API key for authentication',
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
							name: 'temperature',
							type: 'number',
							defaultValue: '0',
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
							name: 'customFetch',
							type: 'typeof fetch',
							description: isZh
								? '自定义 fetch 函数，用于定制 headers、credentials、代理等'
								: 'Custom fetch function for customizing headers, credentials, proxy, etc.',
						},
					]}
				/>
			</section>

			{/* Agent Configuration */}
			<section className="mb-10">
				<Heading id="agentconfig" level={2} className="text-2xl font-semibold mb-4">
					AgentConfig
				</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '配置 Agent 的行为、生命周期钩子和扩展能力。'
						: 'Configure agent behavior, lifecycle hooks, and extension capabilities.'}
				</p>
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
							defaultValue: '20',
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
								? '指导 Agent 行为的指令配置'
								: 'Instructions to guide agent behavior',
						},
						{
							name: 'transformPageContent',
							type: '(content: string) => string | Promise<string>',
							description: isZh
								? '发送给 LLM 前转换页面内容，可用于数据脱敏'
								: 'Transform page content before sending to LLM, useful for data masking',
						},
						{
							name: 'experimentalScriptExecutionTool',
							type: 'boolean',
							defaultValue: 'false',
							status: 'experimental',
							description: isZh
								? '启用实验性 JavaScript 执行工具'
								: 'Enable experimental JavaScript execution tool',
						},
					]}
				/>

				<h3 className="text-lg font-semibold mt-6 mb-3">InstructionsConfig</h3>
				<APIReference
					properties={[
						{
							name: 'system',
							type: 'string',
							description: isZh
								? '全局系统级指令，应用于所有任务'
								: 'Global system-level instructions, applied to all tasks',
						},
						{
							name: 'getPageInstructions',
							type: '(url: string) => string | undefined | null',
							description: isZh
								? '动态页面级指令回调，在每个步骤前调用'
								: 'Dynamic page-level instructions callback, called before each step',
						},
					]}
				/>
			</section>

			{/* Lifecycle Hooks */}
			<section className="mb-10">
				<Heading id="lifecycle-hooks" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '生命周期钩子' : 'Lifecycle Hooks'}
				</Heading>
				<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
					<p className="text-amber-800 dark:text-amber-200 text-sm">
						<strong>⚠️ {isZh ? '警告' : 'Warning'}:</strong>{' '}
						{isZh
							? '这些接口高度实验性，可能在未来版本中发生变化。建议优先使用事件系统（Events）来监听 Agent 状态。'
							: 'These APIs are highly experimental and may change in future versions. Prefer using the Events system for monitoring agent state.'}
					</p>
				</div>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '所有生命周期钩子都接收 agent 实例作为第一个参数，便于在回调中访问 Agent 状态和方法。'
						: 'All lifecycle hooks receive the agent instance as first parameter, making it easy to access agent state and methods in callbacks.'}
				</p>
				<APIReference
					properties={[
						{
							name: 'onBeforeStep',
							type: '(agent: PageAgentCore, stepCount: number) => void | Promise<void>',
							description: isZh ? '每个步骤执行前调用' : 'Called before each step execution',
							status: 'experimental',
						},
						{
							name: 'onAfterStep',
							type: '(agent: PageAgentCore, history: HistoricalEvent[]) => void | Promise<void>',
							description: isZh ? '每个步骤执行后调用' : 'Called after each step execution',
							status: 'experimental',
						},
						{
							name: 'onBeforeTask',
							type: '(agent: PageAgentCore) => void | Promise<void>',
							description: isZh ? '任务开始前调用' : 'Called before task starts',
							status: 'experimental',
						},
						{
							name: 'onAfterTask',
							type: '(agent: PageAgentCore, result: ExecutionResult) => void | Promise<void>',
							description: isZh ? '任务结束后调用' : 'Called after task ends',
							status: 'experimental',
						},
						{
							name: 'onDispose',
							type: '(agent: PageAgentCore, reason?: string) => void',
							description: isZh ? 'Agent 销毁时调用' : 'Called when agent is disposed',
							status: 'experimental',
						},
					]}
				/>
			</section>

			{/* PageController Configuration */}
			<section className="mb-10">
				<Heading id="pagecontrollerconfig" level={2} className="text-2xl font-semibold mb-4">
					PageControllerConfig
				</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '配置 DOM 提取、元素交互和视觉反馈。'
						: 'Configure DOM extraction, element interaction, and visual feedback.'}
				</p>
				<APIReference
					properties={[
						{
							name: 'pageController',
							type: 'PageController',
							status: 'experimental',
							description: isZh
								? '自定义 PageController 实例。如不提供，将创建默认实例。'
								: 'Custom PageController instance. If not provided, a default one will be created.',
						},
						{
							name: 'enableMask',
							type: 'boolean',
							defaultValue: 'true',
							description: isZh
								? '启用视觉遮罩覆盖层，阻止用户在自动化期间操作'
								: 'Enable visual mask overlay that blocks user interaction during automation',
						},
						{
							name: 'viewportExpansion',
							type: 'number',
							defaultValue: '0',
							description: isZh
								? '视口扩展像素数，-1 表示提取整个页面'
								: 'Viewport expansion in pixels, -1 means extract entire page',
						},
						{
							name: 'interactiveBlacklist',
							type: '(Element | (() => Element))[]',
							description: isZh ? '要排除的交互元素列表' : 'Elements to exclude from interaction',
						},
						{
							name: 'interactiveWhitelist',
							type: '(Element | (() => Element))[]',
							description: isZh
								? '要强制包含的交互元素列表'
								: 'Elements to force include for interaction',
						},
						{
							name: 'includeAttributes',
							type: 'string[]',
							description: isZh
								? '在 DOM 提取中包含的额外属性'
								: 'Additional attributes to include in DOM extraction',
						},
					]}
				/>
			</section>

			<APIDivider title={isZh ? '属性与方法' : 'Properties & Methods'} />

			{/* Properties */}
			<section className="mb-10">
				<Heading id="properties" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '属性' : 'Properties'}
				</Heading>
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
				<Heading id="methods" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '方法' : 'Methods'}
				</Heading>
				<APIReference
					properties={[
						{
							name: 'execute(task: string)',
							type: 'Promise<ExecutionResult>',
							description: isZh
								? '执行任务并返回结果。包含 success、data 和 history 字段。'
								: 'Execute a task and return result. Contains success, data, and history fields.',
						},
						{
							name: 'dispose(reason?: string)',
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
				<Heading id="events" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '事件' : 'Events'}
				</Heading>
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
				<Heading id="executionresult" level={2} className="text-2xl font-semibold mb-4">
					ExecutionResult
				</Heading>
				<CodeEditor
					language="typescript"
					code={`interface ExecutionResult {
  /** Whether the task completed successfully */
  success: boolean
  /** Result description from the agent */
  data: string
  /** Full execution history */
  history: HistoricalEvent[]
}`}
				/>
			</section>

			{/* AgentActivity */}
			<section className="mb-10">
				<Heading id="agentactivity" level={2} className="text-2xl font-semibold mb-4">
					AgentActivity
				</Heading>
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

			<APIDivider title={isZh ? '无头模式' : 'Headless Mode'} />

			{/* Headless Usage */}
			<section className="mb-10">
				<Heading id="headless-mode" level={2} className="text-2xl font-semibold mb-4">
					{isZh ? '无头模式' : 'Headless Mode'}
				</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '在非 DOM 环境中，你必须实现自定义的 PageController（例如远程操作页面或 Puppeteer）。'
						: 'In non-DOM environments, you must implement a custom PageController (e.g., remote page control or Puppeteer).'}
				</p>
				<CodeEditor
					language="typescript"
					code={`import { PageAgentCore } from '@page-agent/core'
import type { PageController } from '@page-agent/page-controller'

class MyRemotePageController implements PageController {
  // Implement required methods for DOM extraction and interaction
}

const agent = new PageAgentCore({
  pageController: new MyRemotePageController(),
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-5.2',
  language: 'en-US',
})

// Listen to events for UI display

agent.addEventListener('statuschange', () => {
  console.log('Status:', agent.status)
})

agent.addEventListener('historychange', () => {
  console.log('History:', agent.history)
})

agent.addEventListener('activity', (e) => {
  const activity = (e as CustomEvent).detail
  console.log('Activity:', activity.type)
})

// Execute task
const result = await agent.execute('Fill in the form with test data')`}
				/>
			</section>
		</div>
	)
}
