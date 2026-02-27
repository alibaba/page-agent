import { useEffect, useRef, useState } from 'react'
import { Link } from 'wouter'

import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

// ---------------------------------------------------------------------------
// Data: each section is a typed object for easy extension
// ---------------------------------------------------------------------------

interface TroubleshootingSection {
	id: string
	title: { en: string; zh: string }
	symptom: { en: string; zh: string }
	color: 'red' | 'amber' | 'orange' | 'violet'
	content: (isZh: boolean) => React.ReactNode
}

const SECTIONS: TroubleshootingSection[] = [
	{
		id: 'format-errors',
		title: { en: 'Model Response Format Errors', zh: '模型返回格式错误' },
		symptom: {
			en: 'The model returns malformed tool calls, plain text, or unexpected JSON instead of structured actions.',
			zh: '模型返回了格式错误的 tool call、纯文本或非预期的 JSON，而非结构化的操作指令。',
		},
		color: 'amber',
		content: FormatErrorsContent,
	},
	{
		id: 'low-success-rate',
		title: { en: 'Low Task Success Rate', zh: '任务成功率低' },
		symptom: {
			en: 'The agent appears to understand the task but frequently fails to complete it, or produces incorrect results.',
			zh: 'Agent 似乎理解了任务，但频繁执行失败或产生不正确的结果。',
		},
		color: 'amber',
		content: LowSuccessRateContent,
	},
	{
		id: 'wrong-element',
		title: { en: "Can't Hit Target Elements", zh: '无法点击目标元素' },
		symptom: {
			en: 'The agent repeatedly retries but keeps interacting with the wrong element, or fails to locate the correct one.',
			zh: 'Agent 反复重试，但始终点击在错误的元素上，或无法定位到正确的目标元素。',
		},
		color: 'amber',
		content: WrongElementContent,
	},
	{
		id: 'api-errors',
		title: { en: 'API Request Errors', zh: 'API 请求错误' },
		symptom: {
			en: 'HTTP 400 Bad Request or similar errors when calling the LLM API.',
			zh: '调用 LLM API 时出现 HTTP 400 Bad Request 或类似的参数错误。',
		},
		color: 'amber',
		content: ApiErrorsContent,
	},
]

// ---------------------------------------------------------------------------
// Section content components
// ---------------------------------------------------------------------------

function FormatErrorsContent(isZh: boolean) {
	return (
		<ol className="list-decimal pl-5 space-y-4 text-gray-700 dark:text-gray-300">
			<li>
				<strong>{isZh ? '确认模型是否支持' : 'Verify model compatibility'}</strong>
				<p className="mt-1">
					{isZh
						? '并非所有模型都能正确处理 page-agent 的 tool 定义。请查看'
						: 'Not all models can handle page-agent tool definitions correctly. Check the '}
					<Link
						href="/features/models"
						className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
					>
						{isZh ? '已测试模型列表' : 'tested models list'}
					</Link>
					{isZh ? '。' : '.'}
				</p>
			</li>
			<li>
				<strong>
					{isZh ? '检查代理/网关的参数转发' : 'Check proxy/gateway parameter forwarding'}
				</strong>
				<p className="mt-1">
					{isZh
						? '如果使用了 API 代理或网关，请确保请求中的 '
						: 'If using an API proxy or gateway, make sure the '}
					<code>tools</code>
					{isZh
						? ' 字段被完整、无修改地转发给模型供应商。部分代理可能会剥离或修改此字段。'
						: ' parameter is forwarded to the model provider intact. Some proxies may strip or alter this field.'}
				</p>
			</li>
			<li>
				<strong>{isZh ? '寻求社区帮助' : 'Get community help'}</strong>
				<p className="mt-1">
					{isZh ? (
						<>
							如果以上步骤无法解决问题，欢迎在{' '}
							<a
								href="https://github.com/alibaba/page-agent/discussions"
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
							>
								GitHub Discussions
							</a>{' '}
							中反馈，附上模型名称和错误信息。
						</>
					) : (
						<>
							If the above steps don't help, join the{' '}
							<a
								href="https://github.com/alibaba/page-agent/discussions"
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
							>
								GitHub Discussions
							</a>{' '}
							with your model name and error details.
						</>
					)}
				</p>
			</li>
		</ol>
	)
}

function LowSuccessRateContent(isZh: boolean) {
	return (
		<>
			<p className="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">
				{isZh
					? '按以下顺序逐步排查，从最简单的情况开始：'
					: 'Follow this diagnostic funnel from simplest to most advanced:'}
			</p>
			<ol className="list-decimal pl-5 space-y-4 text-gray-700 dark:text-gray-300">
				<li>
					<strong>{isZh ? '先从简单指令开始' : 'Start with a simple instruction'}</strong>
					<p className="mt-1">
						{isZh
							? '给一个具体的、单步的简单指令（如"点击登录按钮"），看 Agent 能否完成。如果连简单操作都失败了，问题可能不在模型能力上。'
							: 'Give a concrete, single-step instruction (e.g. "click the login button"). If even simple actions fail, the issue is likely not model capability.'}
					</p>
				</li>
				<li>
					<strong>{isZh ? '尝试最强模型' : 'Try the strongest model available'}</strong>
					<p className="mt-1">
						{isZh
							? '切换到你能获取到的最先进、最大的模型，以排除是否是模型智能水平不足导致的问题。'
							: "Switch to the most capable model you have access to, to isolate whether it's a model intelligence issue."}
					</p>
				</li>
				<li>
					<strong>{isZh ? '优化指令质量' : 'Improve instruction quality'}</strong>
					<p className="mt-1">
						{isZh
							? '给出尽可能具体的指令。对于复杂任务，建议使用另一个 LLM 来预先拆分和细化用户的需求，然后逐步执行。'
							: "Be as specific as possible. For complex tasks, consider using another LLM to decompose and refine the user's request before execution."}
					</p>
				</li>
				<li>
					<strong>{isZh ? '提供充足的上下文' : 'Provide sufficient context'}</strong>
					<p className="mt-1">
						{isZh
							? '通过 instructions 配置注入网站背景描述、关键术语解释等上下文信息，帮助 Agent 更好地理解页面。'
							: 'Use the instructions config to inject website descriptions, key terminology, and background context to help the agent understand the page.'}
					</p>
				</li>
				<li>
					<strong>{isZh ? '检查 HTML 清洗结果' : 'Check HTML sanitization output'}</strong>
					<p className="mt-1">
						{isZh
							? '使用开发者工具检查清洗后的 HTML，确认关键信息、文本和可操作元素是否被正确保留。'
							: 'Inspect the sanitized HTML in dev tools to confirm that key information, text, and interactive elements are preserved correctly.'}
					</p>
				</li>
			</ol>
		</>
	)
}

function WrongElementContent(isZh: boolean) {
	return (
		<ol className="list-decimal pl-5 space-y-4 text-gray-700 dark:text-gray-300">
			<li>
				<strong>{isZh ? '了解现实局限' : 'Understand the reality'}</strong>
				<p className="mt-1">
					{isZh
						? '并非所有网站都提供了完善的语义化 HTML 和 accessibility 标签。对于此类网站，DOM 清洗可能无法产出足够好的结果。'
						: 'Not all websites provide proper semantic HTML and accessibility labels. For such sites, DOM sanitization may not produce good enough results.'}
				</p>
			</li>
			<li>
				<strong>{isZh ? '检查目标元素类型' : 'Check target element type'}</strong>
				<p className="mt-1">
					{isZh
						? '确认目标元素是否为图片、Canvas、或需要复杂交互（如拖拽、基于坐标的点击）的元素。这些本身就超出了当前的能力范围。'
						: 'Verify if the target is an image, Canvas, or requires complex interactions (drag-and-drop, coordinate-based clicking). These are beyond current capabilities.'}
				</p>
			</li>
			<li>
				<strong>{isZh ? '检查清洗后的 HTML' : 'Inspect sanitized HTML'}</strong>
				<p className="mt-1">
					{isZh
						? '检查清洗结果中是否存在关键信息丢失、可操作元素未被编号等问题。'
						: 'Look for missing key information or unnumbered interactive elements in the sanitized output.'}
				</p>
			</li>
			<li>
				<strong>{isZh ? '注入 accessibility 增强' : 'Inject accessibility improvements'}</strong>
				<p className="mt-1">
					{isZh
						? '通过注入脚本为网站添加 aria-label、语义化标签等 accessibility 属性，改善 DOM 清洗质量。'
						: 'Inject scripts to add aria-labels, semantic attributes, and other a11y improvements to enhance DOM sanitization quality.'}
				</p>
			</li>
			<li>
				<strong>{isZh ? '开发专用 Tool' : 'Build a custom Tool'}</strong>
				<p className="mt-1">
					{isZh ? (
						<>
							对于特定的、持续难以操作的元素，考虑开发{' '}
							<Link
								href="/features/custom-tools"
								className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
							>
								自定义 Tool
							</Link>{' '}
							来直接操作这些元素。
						</>
					) : (
						<>
							For consistently difficult elements, consider building a{' '}
							<Link
								href="/features/custom-tools"
								className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
							>
								custom Tool
							</Link>{' '}
							to interact with them directly.
						</>
					)}
				</p>
			</li>
		</ol>
	)
}

function ApiErrorsContent(isZh: boolean) {
	return (
		<div className="space-y-4 text-gray-700 dark:text-gray-300">
			<p>
				{isZh
					? '一些 LLM 供应商使用了与 OpenAI 不完全兼容的参数格式，导致请求参数校验失败。'
					: 'Some LLM providers use parameter formats that are not fully compatible with the OpenAI spec, causing request validation failures.'}
			</p>
			<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
				<p className="font-medium mb-2">
					{isZh ? '解决方案：使用 customFetch' : 'Solution: use customFetch'}
				</p>
				<p className="text-sm mb-3">
					{isZh
						? '通过 customFetch 配置拦截请求，在发送前调整参数格式以适配目标供应商的要求。'
						: 'Use the customFetch config to intercept requests and adapt parameters before sending them to the target provider.'}
				</p>
				<CodeEditor
					code={`const agent = new PageAgent({
  // ...
  customFetch: async (url, init) => {
    const body = JSON.parse(init.body)
    // Adapt parameters for your provider
    delete body.stream_options
    return fetch(url, { ...init, body: JSON.stringify(body) })
  },
})`}
				/>
			</div>
			<p className="text-sm">
				{isZh ? '参见 ' : 'See '}
				<Link
					href="/advanced/page-agent-core"
					className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
				>
					PageAgentCore API
				</Link>
				{isZh ? ' 了解 customFetch 的完整用法。' : ' for full customFetch documentation.'}
			</p>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Color mapping for symptom callouts
// ---------------------------------------------------------------------------

const SYMPTOM_COLORS = {
	red: 'border-red-400 bg-red-50 dark:bg-red-900/15 text-red-800 dark:text-red-200',
	amber: 'border-amber-400 bg-amber-50 dark:bg-amber-900/15 text-amber-800 dark:text-amber-200',
	orange:
		'border-orange-400 bg-orange-50 dark:bg-orange-900/15 text-orange-800 dark:text-orange-200',
	violet:
		'border-violet-400 bg-violet-50 dark:bg-violet-900/15 text-violet-800 dark:text-violet-200',
} as const

// ---------------------------------------------------------------------------
// Right-side TOC with IntersectionObserver
// ---------------------------------------------------------------------------

function useActiveSection(ids: string[]) {
	const [activeId, setActiveId] = useState(ids[0])
	const observerRef = useRef<IntersectionObserver | null>(null)

	useEffect(() => {
		observerRef.current?.disconnect()

		const visibleEntries = new Map<string, number>()

		observerRef.current = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visibleEntries.set(entry.target.id, entry.intersectionRatio)
					} else {
						visibleEntries.delete(entry.target.id)
					}
				}
				// Pick the first visible section in document order
				const firstVisible = ids.find((id) => visibleEntries.has(id))
				if (firstVisible) setActiveId(firstVisible)
			},
			{ rootMargin: '-80px 0px -60% 0px', threshold: [0, 0.25] }
		)

		for (const id of ids) {
			const el = document.getElementById(id)
			if (el) observerRef.current.observe(el)
		}

		return () => observerRef.current?.disconnect()
	}, [ids])

	return activeId
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TroubleshootingPage() {
	const { isZh } = useLanguage()
	const sectionIds = SECTIONS.map((s) => s.id)
	const activeId = useActiveSection(sectionIds)

	return (
		<div className="max-w-5xl mx-auto">
			{/* Header */}
			<div className="mb-10">
				<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Troubleshooting</h1>
			</div>

			{/* Two-column: content + TOC */}
			<div className="flex gap-8">
				{/* Main content */}
				<div className="flex-1 min-w-0 space-y-12">
					{SECTIONS.map((section) => (
						<section key={section.id} className="scroll-mt-24">
							<Heading
								id={section.id}
								className="text-2xl font-bold mb-4 text-gray-900 dark:text-white"
							>
								{isZh ? section.title.zh : section.title.en}
							</Heading>

							{/* Symptom callout */}
							<div
								className={`border-l-4 px-4 py-3 rounded-r-lg mb-6 ${SYMPTOM_COLORS[section.color]}`}
							>
								<span className="text-xs font-semibold uppercase tracking-wider opacity-70">
									{isZh ? '症状' : 'Symptom'}
								</span>
								<p className="mt-1 text-sm">{isZh ? section.symptom.zh : section.symptom.en}</p>
							</div>

							{/* Diagnostic steps */}
							<div className="prose-sm">{section.content(isZh)}</div>
						</section>
					))}
				</div>

				{/* Right TOC */}
				<aside className="hidden lg:block w-48 shrink-0">
					<div className="sticky top-24">
						<h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
							{isZh ? '目录' : 'On this page'}
						</h4>
						<nav className="space-y-1">
							{SECTIONS.map((section) => (
								<button
									key={section.id}
									type="button"
									onClick={() =>
										document
											.getElementById(section.id)
											?.scrollIntoView({ behavior: 'smooth', block: 'start' })
									}
									className={`block text-sm py-1 text-left transition-colors ${
										activeId === section.id
											? 'text-blue-600 dark:text-blue-400 font-medium'
											: 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
									}`}
								>
									{isZh ? section.title.zh : section.title.en}
								</button>
							))}
						</nav>
					</div>
				</aside>
			</div>
		</div>
	)
}
