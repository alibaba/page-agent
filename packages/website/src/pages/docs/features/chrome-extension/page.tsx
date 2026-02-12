import { siChromewebstore, siGithub } from 'simple-icons'

import CodeEditor from '@/components/CodeEditor'
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
					<h2 className="text-2xl font-bold mb-4">{isZh ? '核心特性' : 'Key Features'}</h2>
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
					<h2 className="text-2xl font-bold mb-4">{isZh ? '获取扩展' : 'Get the Extension'}</h2>
					<div className="flex flex-wrap gap-3">
						<a
							href={chromeWebStoreUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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
							className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d={siGithub.path} />
							</svg>
							{isZh ? 'GitHub Releases（更新版本）' : 'GitHub Releases (faster updates)'}
						</a>
					</div>
				</section>

				{/* Relationship with PageAgent.js */}
				<section>
					<h2 className="text-2xl font-bold mb-4">
						{isZh ? '与 PageAgent.js 的关系' : 'How It Relates to PageAgent.js'}
					</h2>
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
					<h2 className="text-2xl font-bold mb-4">
						{isZh ? '第三方接入' : 'Third-Party Integration'}
					</h2>
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
					<h2 className="text-2xl font-bold mb-4">{isZh ? 'API 参考' : 'API Reference'}</h2>

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
								📄 {isZh ? '英文版 API 文档' : 'API Documentation (English)'}
							</a>
							<a
								href="https://github.com/alibaba/page-agent/blob/main/packages/extension/docs/extension_api_zh.md"
								target="_blank"
								rel="noopener noreferrer"
								className="block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
							>
								📄 {isZh ? '中文版 API 文档' : 'API Documentation (Chinese)'}
							</a>
						</div>
					</section>

					{/* TypeScript Declaration */}
					<h2 className="text-2xl font-bold mb-4">
						{isZh ? 'TypeScript 类型声明' : 'TypeScript Declaration'}
					</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '推荐把 `execute` 的类型声明加入你的项目，获得完整类型提示。'
							: 'Add this `execute` declaration to your project for full type support.'}
					</p>

					<CodeEditor
						code={
							isZh
								? `import type {
	AgentActivity,
	AgentStatus,
	ExecutionResult,
	HistoricalEvent
} from '@page-agent/core'

interface ExecuteConfig {
	baseURL: string   // LLM API 端点
	apiKey: string    // API 密钥
	model: string     // 模型名称

	includeInitialTab?: boolean
	onStatusChange?: (status: AgentStatus) => void
	onActivity?: (activity: AgentActivity) => void
	onHistoryUpdate?: (history: HistoricalEvent[]) => void
	onDispose?: () => void
}

type Execute = (task: string, config: ExecuteConfig) => Promise<ExecutionResult>

declare global {
	interface Window {
		PAGE_AGENT_EXT_VERSION?: string
		PAGE_AGENT_EXT?: {
			version: string
			execute: Execute
			dispose: () => void
		}
	}
}`
								: `import type {
	AgentActivity,
	AgentStatus,
	ExecutionResult,
	HistoricalEvent
} from '@page-agent/core'

interface ExecuteConfig {
	baseURL: string   // LLM API endpoint
	apiKey: string    // API key
	model: string     // Model name

	includeInitialTab?: boolean
	onStatusChange?: (status: AgentStatus) => void
	onActivity?: (activity: AgentActivity) => void
	onHistoryUpdate?: (history: HistoricalEvent[]) => void
	onDispose?: () => void
}

type Execute = (task: string, config: ExecuteConfig) => Promise<ExecutionResult>

declare global {
	interface Window {
		PAGE_AGENT_EXT_VERSION?: string
		PAGE_AGENT_EXT?: {
			version: string
			execute: Execute
			dispose: () => void
		}
	}
}`
						}
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
		onStatusChange: status => console.log('状态变化:', status),
		onActivity: activity => console.log('活动:', activity),
		onHistoryUpdate: history => console.log('历史更新:', history),
		onDispose: () => console.log('已停止')
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
		onStatusChange: status => console.log('Status change:', status),
		onActivity: activity => console.log('Activity:', activity),
		onHistoryUpdate: history => console.log('History update:', history),
		onDispose: () => console.log('Disposed')
	}
)

console.log(result) // Task execution result`
						}
						language="javascript"
					/>

					<h3 className="text-xl font-semibold mt-6 mb-3">PAGE_AGENT_EXT.dispose()</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '停止当前正在运行的任务。停止后 Agent 可以重新使用。'
							: 'Stop the current running task. The agent can be reused after disposal.'}
					</p>

					<CodeEditor
						code={
							isZh
								? `// 停止当前任务
window.PAGE_AGENT_EXT.dispose()`
								: `// Stop current task execution
window.PAGE_AGENT_EXT.dispose()`
						}
						language="javascript"
					/>
				</section>

				{/* Integration Guide */}
				<section>
					<h2 className="text-2xl font-bold mb-4">
						{isZh
							? '将 MultiPageAgent 集成你自己的插件'
							: 'Integrate MultiPageAgent into Your Extension'}
					</h2>
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
