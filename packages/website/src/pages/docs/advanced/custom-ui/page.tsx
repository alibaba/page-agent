import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { APIDivider, APIReference } from '@/components/ui/api-reference'
import { useLanguage } from '@/i18n/context'

export default function CustomUIDocs() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{isZh ? '自定义 UI' : 'Custom UI'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? 'PageAgent 的核心逻辑（PageAgentCore）和 UI 完全解耦，通过事件通讯。你可以用自己的 UI 替换内置 Panel。'
					: 'PageAgent core logic (PageAgentCore) is fully decoupled from UI through events. You can replace the built-in Panel with your own UI.'}
			</p>

			{/* Architecture */}
			<section className="mb-10">
				<Heading id="architecture">{isZh ? '架构' : 'Architecture'}</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? 'PageAgent 由三个独立模块组成，可自由组合：'
						: 'PageAgent consists of three independent modules that can be freely combined:'}
				</p>
				<ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-4">
					<li>
						<strong>PageAgentCore</strong> -{' '}
						{isZh ? '核心 Agent 逻辑，不包含 UI' : 'Core agent logic, no UI'}
					</li>
					<li>
						<strong>PageController</strong> -{' '}
						{isZh ? 'DOM 操作和视觉反馈' : 'DOM operations and visual feedback'}
					</li>
					<li>
						<strong>UI (Panel)</strong> -{' '}
						{isZh
							? '用户界面，可替换为自定义实现'
							: 'User interface, replaceable with custom implementation'}
					</li>
				</ul>
			</section>

			<APIDivider title={isZh ? '事件系统' : 'Event System'} />

			{/* Two Event Streams */}
			<section className="mb-10">
				<Heading id="two-event-streams">{isZh ? '两个事件流' : 'Two Event Streams'}</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? 'PageAgentCore 提供两种不同性质的事件流，方便 UI 渲染：'
						: 'PageAgentCore provides two distinct event streams for UI rendering:'}
				</p>

				{/* Comparison Table */}
				<div className="overflow-x-auto mb-6">
					<table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
						<thead>
							<tr className="bg-gray-100 dark:bg-gray-800">
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left"></th>
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
									Historical Events
								</th>
								<th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">
									Activity Events
								</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh ? '事件名' : 'Event Name'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									<code>historychange</code>
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									<code>activity</code>
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh ? '持久性' : 'Persistence'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh ? '持久化到 agent.history' : 'Persisted in agent.history'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh ? '瞬态' : 'Transient'}
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh ? '传给 LLM' : 'Sent to LLM'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh ? '是' : 'Yes'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh ? '否' : 'No'}
								</td>
							</tr>
							<tr>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh ? '用途' : 'Purpose'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh ? '构成 Agent 记忆，显示历史步骤' : 'Forms agent memory, displays history'}
								</td>
								<td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
									{isZh
										? '实时 UI 反馈（如 loading 状态）'
										: 'Real-time UI feedback (e.g., loading state)'}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			{/* All Events */}
			<section className="mb-10">
				<Heading id="all-events">{isZh ? '所有事件' : 'All Events'}</Heading>
				<APIReference
					properties={[
						{
							name: 'statuschange',
							type: 'Event',
							description: isZh
								? 'Agent 状态变化 (idle → running → completed/error)'
								: 'Agent status changes (idle → running → completed/error)',
						},
						{
							name: 'historychange',
							type: 'Event',
							description: isZh
								? '历史事件更新，读取 agent.history 获取完整历史'
								: 'History updated, read agent.history for full history',
						},
						{
							name: 'activity',
							type: 'CustomEvent<AgentActivity>',
							description: isZh
								? '实时活动反馈：thinking, executing, executed, retrying, error'
								: 'Real-time activity: thinking, executing, executed, retrying, error',
						},
						{
							name: 'dispose',
							type: 'Event',
							description: isZh ? 'Agent 被销毁' : 'Agent is disposed',
						},
					]}
				/>
			</section>

			{/* HistoricalEvent Types */}
			<section className="mb-10">
				<Heading id="historicalevent">HistoricalEvent</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh ? 'agent.history 数组中的事件类型：' : 'Event types in agent.history array:'}
				</p>
				<CodeEditor
					language="typescript"
					code={`type HistoricalEvent =
  | { type: 'step'; stepIndex: number; reflection: AgentReflection; action: Action }
  | { type: 'observation'; content: string }
  | { type: 'user_takeover' }
  | { type: 'retry'; message: string; attempt: number; maxAttempts: number }
  | { type: 'error'; message: string }`}
				/>
			</section>

			{/* AgentActivity Types */}
			<section className="mb-10">
				<Heading id="agentactivity">AgentActivity</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh ? 'activity 事件的 detail 类型：' : 'The detail type of activity events:'}
				</p>
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

			<APIDivider title={isZh ? 'React 示例' : 'React Example'} />

			{/* React Hooks Example */}
			<section className="mb-10">
				<Heading id="using-react-hooks">{isZh ? '使用 React Hooks' : 'Using React Hooks'}</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh ? '监听事件并更新 React 状态：' : 'Listen to events and update React state:'}
				</p>
				<CodeEditor
					language="tsx"
					code={`function useAgent(agent: PageAgentCore) {
  const [status, setStatus] = useState(agent.status)
  const [history, setHistory] = useState(agent.history)
  const [activity, setActivity] = useState<AgentActivity | null>(null)

  useEffect(() => {
    const onStatus = () => setStatus(agent.status)
    const onHistory = () => setHistory([...agent.history])
    const onActivity = (e: Event) => setActivity((e as CustomEvent).detail)

    agent.addEventListener('statuschange', onStatus)
    agent.addEventListener('historychange', onHistory)
    agent.addEventListener('activity', onActivity)

    return () => {
      agent.removeEventListener('statuschange', onStatus)
      agent.removeEventListener('historychange', onHistory)
      agent.removeEventListener('activity', onActivity)
    }
  }, [agent])

  return { status, history, activity }
}`}
				/>
			</section>

			<APIDivider title={isZh ? '完整组装示例' : 'Complete Assembly Example'} />

			{/* Assembly Example */}
			<section className="mb-10">
				<Heading id="assembling-core-controller-custom-ui">
					{isZh ? '组装 Core + Controller + 自定义 UI' : 'Assembling Core + Controller + Custom UI'}
				</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '参考内置 PageAgent 的实现方式，用自定义 UI 替换 Panel：'
						: 'Following the built-in PageAgent pattern, replace Panel with custom UI:'}
				</p>
				<CodeEditor
					language="typescript"
					code={`import { PageAgentCore } from '@page-agent/core'
import { PageController } from '@page-agent/page-controller'

// 1. Create PageController
const pageController = new PageController({ enableMask: true })

// 2. Create PageAgentCore with controller
const agent = new PageAgentCore({
  pageController,
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-5.2',
})

// 3. Mount your custom UI
const root = createRoot(document.getElementById('my-ui')!)
root.render(<MyAgentUI agent={agent} />)

// 4. Handle user input (optional)
agent.onAskUser = async (question) => window.prompt(question) || ''

// 5. Execute task
await agent.execute('Fill the form with test data')

// 6. Cleanup
agent.dispose()`}
				/>
			</section>
		</div>
	)
}
