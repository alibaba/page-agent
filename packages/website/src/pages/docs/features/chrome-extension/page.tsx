import { siChromewebstore, siGithub } from 'simple-icons'

import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function ChromeExtension() {
	const { isZh } = useLanguage()
	const chromeWebStoreUrl =
		'https://chromewebstore.google.com/detail/page-agent-ext/akldabonmimlicnjlflnapfeklbfemhj'
	const githubReleasesUrl = 'https://github.com/alibaba/page-agent/releases'

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{isZh ? 'Chrome 扩展' : 'Chrome Extension'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? '可选的 Chrome 扩展。PageAgent.js 继续负责页面内自动化；扩展 API 额外提供多页面任务、浏览器级控制，以及从浏览器外部发起任务的能力。'
					: 'An optional Chrome extension. PageAgent.js keeps handling in-page automation, while the extension API adds multi-page tasks, browser-level control, and tasks initiated from outside the browser.'}
			</p>

			<div className="space-y-8 mt-8">
				{/* Features */}
				<section>
					<Heading id="key-features" className="text-2xl font-bold mb-4">
						{isZh ? '核心特性' : 'Key Features'}
					</Heading>
					<div className="grid md:grid-cols-3 gap-4">
						<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<h3 className="font-semibold mb-2">🔓 {isZh ? '多页任务' : 'Multi-Page Tasks'}</h3>
							<p className="text-gray-600 dark:text-gray-300 text-sm">
								{isZh
									? '跨多个页面和标签页连续执行任务，不再受限于单页上下文。'
									: 'Run tasks across multiple pages and tabs without being limited to a single page context.'}
							</p>
						</div>
						<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<h3 className="font-semibold mb-2">
								🧭 {isZh ? '浏览器级控制' : 'Browser-Level Control'}
							</h3>
							<p className="text-gray-600 dark:text-gray-300 text-sm">
								{isZh
									? '支持跨标签导航、页面切换和更完整的浏览器自动化能力。'
									: 'Enable richer browser automation, including cross-tab navigation and page switching.'}
							</p>
						</div>
						<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<h3 className="font-semibold mb-2">
								🔌 {isZh ? '开放集成接口' : 'Open Integration API'}
							</h3>
							<p className="text-gray-600 dark:text-gray-300 text-sm">
								{isZh
									? '用户主动授权后，页面 JS、本地 Agent 或云端 Agent 可通过扩展发起多页面任务。'
									: 'With explicit user authorization, page JS, local agents, or cloud agents can trigger multi-page tasks through the extension.'}
							</p>
						</div>
					</div>
				</section>

				{/* Install */}
				<section>
					<Heading id="get-the-extension" className="text-2xl font-bold mb-4">
						{isZh ? '获取扩展' : 'Get the Extension'}
					</Heading>
					<div className="flex flex-wrap gap-3">
						<a
							href={chromeWebStoreUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white! font-medium rounded-lg transition-colors"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d={siChromewebstore.path} />
							</svg>
							{isZh ? '从 Chrome 应用商店安装' : 'Install from Chrome Web Store'}
						</a>
						<a
							href={githubReleasesUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white! font-medium rounded-lg transition-colors"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d={siGithub.path} />
							</svg>
							{isZh ? 'GitHub Releases（更新版本）' : 'GitHub Releases (faster updates)'}
						</a>
					</div>
				</section>

				{/* Quick Start */}
				<section>
					<Heading id="quick-start" className="text-2xl font-bold mb-4">
						{isZh ? '快速开始' : 'Quick Start'}
					</Heading>
					<div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4 text-gray-600 dark:text-gray-300">
						<ol className="list-decimal pl-5 space-y-2">
							<li>
								{isZh
									? '安装扩展，然后打开侧边栏。'
									: 'Install the extension, then open the side panel.'}
							</li>
							<li>
								{isZh
									? '在扩展设置中填入你自己的模型配置，或继续使用测试接口做体验。'
									: 'Fill in your own model configuration in the extension settings, or keep the testing endpoint for evaluation.'}
							</li>
							<li>
								{isZh
									? '首次推荐先在一个简单网页上执行短任务，确认模型、权限和响应速度都正常。'
									: 'Start with a short task on a simple page first, so you can verify model access, permissions, and response speed.'}
							</li>
							<li>
								{isZh
									? '当你需要从 Claude Desktop、Codex 或其他本地 Agent 发起浏览器任务时，再接入 MCP。'
									: 'Add MCP only when you want Claude Desktop, Codex, or another local agent to trigger browser tasks.'}
							</li>
						</ol>
					</div>
				</section>

				{/* Provider setup */}
				<section>
					<Heading id="provider-setup" className="text-2xl font-bold mb-4">
						{isZh ? '模型与 Provider 配置' : 'Model and Provider Setup'}
					</Heading>
					<div className="grid md:grid-cols-2 gap-4">
						<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<h3 className="font-semibold mb-2">OpenAI-compatible</h3>
							<p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
								{isZh
									? '适用于 OpenAI、兼容 OpenAI 的网关、Ollama、LM Studio 等。只要能提供 baseURL + model，通常就能接入。'
									: 'Works for OpenAI, OpenAI-compatible gateways, Ollama, LM Studio, and similar runtimes. If you have a baseURL and model name, it usually fits here.'}
							</p>
							<CodeEditor
								code={`baseURL: 'http://127.0.0.1:11434/v1'
model: 'qwen3:14b'
apiKey: '' // optional for local runtimes`}
								language="typescript"
							/>
						</div>
						<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
							<h3 className="font-semibold mb-2">{isZh ? '通过 MCP 接入本地 Agent' : 'Use MCP for local agents'}</h3>
							<p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
								{isZh
									? '如果你想从 Claude Desktop、Codex、Copilot 等桌面 Agent 发起浏览器任务，推荐走 MCP。扩展负责浏览器控制，Agent 负责自然语言编排。'
									: 'If you want Claude Desktop, Codex, Copilot, or another desktop agent to drive the browser, use MCP. The extension handles browser control, while the agent handles natural-language orchestration.'}
							</p>
							<a
								href="/docs/features/mcp-server"
								className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
							>
								{isZh ? '查看 MCP Server 文档' : 'Read the MCP Server docs'}
							</a>
						</div>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mt-4">
						{isZh
							? '更完整的模型配置示例（OpenAI、Claude、Gemini、Ollama、LM Studio）见模型文档。扩展本身不限制供应商，只要求请求参数与目标 API 兼容。'
							: 'For more complete model examples, including OpenAI, Claude, Gemini, Ollama, and LM Studio, see the models docs. The extension itself is provider-agnostic as long as the request format matches the target API.'}
						<a
							href="/docs/features/models"
							className="ml-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
						>
							{isZh ? '查看模型配置文档' : 'Read the model setup guide'}
						</a>
					</p>
				</section>

				{/* Large pages and menu-heavy sites */}
				<section>
					<Heading id="large-pages-and-heavy-menus" className="text-2xl font-bold mb-4">
						{isZh ? '菜单很多的页面怎么处理' : 'Handling pages with many menus'}
					</Heading>
					<div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-lg space-y-3 text-gray-700 dark:text-gray-300">
						<p>
							{isZh
								? '当页面里有大量菜单、下拉层或复杂组件时，问题通常不是“扩展没装好”，而是单次上下文过大、模型推理不稳定，或者任务描述太宽泛。'
								: 'When a page has many menus, dropdown layers, or complex widgets, the bottleneck is usually not extension installation. It is more often context size, model quality, or prompts that are too broad.'}
						</p>
						<ul className="list-disc pl-5 space-y-2">
							<li>
								{isZh
									? '优先使用更强的模型，或使用上下文窗口更大的本地模型。'
									: 'Prefer a stronger model, or a local model with a larger context window.'}
							</li>
							<li>
								{isZh
									? '把任务拆成更短的步骤，例如先打开一级菜单，再继续下一步。'
									: 'Break the task into shorter steps, for example opening the first menu level before asking for the next action.'}
							</li>
							<li>
								{isZh
									? '如果任务需要跨标签页、弹出新页或从桌面 Agent 发起，使用扩展或 MCP，而不是纯页面内模式。'
									: 'Use the extension or MCP, rather than pure in-page mode, when the task spans tabs, opens new pages, or starts from a desktop agent.'}
							</li>
							<li>
								{isZh
									? '若你使用 Ollama 或 LM Studio，请确认跨域配置和上下文大小已经按模型文档设置好。'
									: 'If you use Ollama or LM Studio, confirm that CORS and context settings are configured as described in the model docs.'}
							</li>
						</ul>
					</div>
				</section>

				{/* Relationship with PageAgent.js */}
				<section>
					<Heading id="how-it-relates-to-page-agent-js" className="text-2xl font-bold mb-4">
						{isZh ? '与 PageAgent.js 的关系' : 'How It Relates to PageAgent.js'}
					</Heading>
					<div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 text-gray-600 dark:text-gray-300">
						<p>
							{isZh
								? 'PageAgent.js 本身即可在页面内完成自动化。Chrome 扩展是可选的能力扩展。'
								: 'PageAgent.js already works for in-page automation. The Chrome extension is optional, not a dependency.'}
						</p>
						<p>
							{isZh
								? '通过扩展，你可以执行多页面任务、控制浏览器，以及从浏览器外部（本地服务或云端服务）发起任务。'
								: 'With the extension, you can perform multi-page tasks, browser-level control, and tasks triggered outside the browser (local or cloud services).'}
						</p>
					</div>
				</section>

				{/* Third-party Integration */}
				<section>
					<Heading id="third-party-integration" className="text-2xl font-bold mb-4">
						{isZh ? '第三方接入' : 'Third-Party Integration'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '通过页面 JavaScript 调用 `window.PAGE_AGENT_EXT`，你的应用可以发起跨页面任务并控制浏览器行为。'
							: 'By calling `window.PAGE_AGENT_EXT` from page JavaScript, your app can trigger multi-page tasks and control browser behavior.'}
					</p>

					<h3 className="text-xl font-semibold mb-3">
						{isZh ? '授权与安全' : 'Authorization and Security'}
					</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '扩展权限范围较广（例如页面访问、导航、多标签控制）。若被滥用，可能危害用户隐私。为此，调用能力由 Token 保护，用户必须主动将 Token 提供给其信任的应用。'
							: 'The extension has broad permissions (such as page access, navigation, and multi-tab control). If abused, it can harm user privacy. That is why access is protected by a token, and users must actively share the token only with applications they trust.'}
					</p>

					<CodeEditor
						code={
							isZh
								? `// 1) 用户在扩展侧边栏获取 auth token
// 2) 仅在可信应用中设置该 token
// 3) token 匹配后，扩展会暴露 window.PAGE_AGENT_EXT

// ⚠️ 不要把 token 提供给不可信页面或脚本
localStorage.setItem('PageAgentExtUserAuthToken', '<从扩展中获取的-token>')`
								: `// 1) Get auth token from the extension side panel
// 2) Set it only in trusted applications
// 3) After token match, extension exposes window.PAGE_AGENT_EXT

// ⚠️ Never provide the token to untrusted pages or scripts
localStorage.setItem('PageAgentExtUserAuthToken', '<your-token-from-extension>')`
						}
						language="javascript"
					/>
				</section>

				{/* API Reference */}
				<section>
					<Heading id="api-reference" className="text-2xl font-bold mb-4">
						{isZh ? 'API 参考' : 'API Reference'}
					</Heading>

					{/* AI Assistant Instructions */}
					<section className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
						<h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-2">
							🤖 {isZh ? '给 AI 编程助手的文档' : 'Instructions for Your AI Assistant'}
						</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-3 text-sm">
							{isZh
								? '如果你在使用 AI 编程助手（如 Cursor、GitHub Copilot），可以将以下文档链接提供给它，让它更好地理解和使用 Page Agent 扩展 API：'
								: 'If you are using an AI coding assistant (like Cursor, GitHub Copilot), share these documentation links with it for better understanding of Page Agent Extension API:'}
						</p>
						<div className="space-y-2">
							<a
								href="https://github.com/alibaba/page-agent/blob/main/packages/extension/docs/extension_api.md"
								target="_blank"
								rel="noopener noreferrer"
								className="block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
							>
								📄 {isZh ? 'API 文档' : 'API Documentation'}
							</a>
						</div>
					</section>

					{/* TypeScript Declaration */}
					<Heading id="typescript-declaration" className="text-2xl font-bold mb-4">
						{isZh ? 'TypeScript 类型声明' : 'TypeScript Declaration'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '推荐把 `execute` 的类型声明加入你的项目，获得完整类型提示。'
							: 'Add this `execute` declaration to your project for full type support.'}
					</p>

					<CodeEditor
						code={`import type {
	AgentActivity,
	AgentStatus,
	ExecutionResult,
	HistoricalEvent
} from '@page-agent/core'

interface ExecuteConfig {
	baseURL: string   // LLM API endpoint
	model: string     // Model name
	apiKey?: string   // LLM AK

	systemInstruction?: string // Global system-level instructions
	includeInitialTab?: boolean
	experimentalIncludeAllTabs?: boolean // Control all unpinned tabs in the window
	onStatusChange?: (status: AgentStatus) => void
	onActivity?: (activity: AgentActivity) => void
	onHistoryUpdate?: (history: HistoricalEvent[]) => void
}

type Execute = (task: string, config: ExecuteConfig) => Promise<ExecutionResult>

declare global {
	interface Window {
		PAGE_AGENT_EXT_VERSION?: string
		PAGE_AGENT_EXT?: {
			version: string
			execute: Execute
			stop: () => void
		}
	}
}`}
						language="typescript"
					/>

					<h3 className="text-xl font-semibold mt-6 mb-3">PAGE_AGENT_EXT.execute(task, config)</h3>

					<CodeEditor
						code={
							isZh
								? `// 使用配置执行任务
const result = await window.PAGE_AGENT_EXT.execute(
	'在 GitHub 上搜索 "page-agent" 并打开第一个结果',
	{
		baseURL: 'https://api.openai.com/v1',
		apiKey: 'your-api-key',
		model: 'gpt-5.2',
		// includeInitialTab: false, // 设为 false 排除初始标签页
		// experimentalIncludeAllTabs: true, // 控制窗口内所有非固定标签页
		onStatusChange: status => console.log('状态变化:', status),
		onActivity: activity => console.log('活动:', activity),
		onHistoryUpdate: history => console.log('历史更新:', history)
	}
)

console.log(result) // 任务执行结果`
								: `// Execute a task with configuration
const result = await window.PAGE_AGENT_EXT.execute(
	'Search for "page-agent" on GitHub and open the first result',
	{
		baseURL: 'https://api.openai.com/v1',
		apiKey: 'your-api-key',
		model: 'gpt-5.2',
		// includeInitialTab: false, // Set to false to exclude initial tab
		// experimentalIncludeAllTabs: true, // Control all unpinned tabs in the window
		onStatusChange: status => console.log('Status change:', status),
		onActivity: activity => console.log('Activity:', activity),
		onHistoryUpdate: history => console.log('History update:', history)
	}
)

console.log(result) // Task execution result`
						}
						language="javascript"
					/>

					<h3 className="text-xl font-semibold mt-6 mb-3">PAGE_AGENT_EXT.stop()</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh ? '停止当前正在运行的任务。' : 'Stop the current running task.'}
					</p>

					<CodeEditor
						code={
							isZh
								? `// 停止当前任务
window.PAGE_AGENT_EXT.stop()`
								: `// Stop current task execution
window.PAGE_AGENT_EXT.stop()`
						}
						language="javascript"
					/>
				</section>

				{/* Integration Guide */}
				<section>
					<Heading
						id="integrate-multipageagent-into-your-extension"
						className="text-2xl font-bold mb-4"
					>
						{isZh
							? '将 MultiPageAgent 集成你自己的插件'
							: 'Integrate MultiPageAgent into Your Extension'}
					</Heading>
					<div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 text-gray-600 dark:text-gray-300 mb-4">
						<p>
							{isZh
								? '如果你在做自己的浏览器扩展或桌面壳，可以把 MultiPageAgent 当成浏览器控制层。一个常见结构是：侧边栏收集配置，background 转发消息，content script 负责页面侧执行。'
								: 'If you are building your own browser extension or desktop shell, treat MultiPageAgent as the browser-control layer. A common structure is: side panel for configuration, background entry for routing, and content scripts for page-side execution.'}
						</p>
						<p>
							{isZh
								? '建议先复用 Page Agent 现有 background entry 和 extension API，再根据自己的产品需求替换 UI、授权方式或任务来源。'
								: 'Start by reusing Page Agent’s current background entry and extension API, then swap in your own UI, auth flow, or task source as needed.'}
						</p>
					</div>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '建议先阅读扩展 API 文档，再参考 background entry implementation。'
							: 'Start with the extension API docs, then use the background entry implementation as a reference.'}
						<a
							href="https://github.com/alibaba/page-agent/blob/main/packages/extension/src/entrypoints/background.ts"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d={siGithub.path} />
							</svg>
							packages/extension/src/entrypoints/background.ts
						</a>
					</p>
				</section>
			</div>
		</div>
	)
}
