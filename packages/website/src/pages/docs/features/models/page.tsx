import { Fragment } from 'react'

import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

const BASELINE = new Set([
	'gpt-5.1',
	'claude-haiku-4.5',
	'gemini-3-flash',
	'deepseek-3.2',
	'qwen3.5-plus',
	'qwen3.5-flash',
])

// Models grouped by brand, newest first
const MODEL_GROUPS: Record<string, string[]> = {
	Qwen: [
		'qwen3.5-plus',
		'qwen3.5-flash',
		'qwen3-coder-next',
		'qwen-3-max',
		'qwen-3-plus',
		'qwen3:14b (ollama)',
	],
	OpenAI: ['gpt-5.4', 'gpt-5.2', 'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4.1-mini'],
	DeepSeek: ['deepseek-3.2'],
	Google: ['gemini-3-pro', 'gemini-3-flash', 'gemini-2.5'],
	Anthropic: [
		'claude-opus-4.6',
		'claude-opus-4.5',
		'claude-sonnet-4.5',
		'claude-haiku-4.5',
		'claude-sonnet-3.5',
	],
	xAI: ['grok-4.1-fast', 'grok-4', 'grok-code-fast'],
	MoonshotAI: ['kimi-k2.5'],
	'Z.AI': ['glm-5', 'glm-4.7'],
}

const ModelBadge = ({ model, baseline }: { model: string; baseline?: boolean }) => (
	<div
		className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-colors ${
			baseline
				? 'bg-emerald-500 text-white shadow-sm'
				: 'bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
		}`}
	>
		{model}
		{baseline && <span className="ml-1">⭐</span>}
	</div>
)

export default function Models() {
	const { isZh } = useLanguage()

	return (
		<div className="max-w-4xl">
			<h1 className="text-4xl font-bold mb-4">{isZh ? '模型' : 'Models'}</h1>
			<p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
				{isZh
					? '当前支持符合 OpenAI 接口规范且支持 tool call 的模型,包括公有云服务和私有部署方案。'
					: 'Supports models that comply with OpenAI API specification and support tool calls, including public cloud services and private deployments.'}
			</p>

			{/* Models Section */}
			<section className="mb-10">
				<Heading id="tested-models" className="text-2xl font-semibold mb-3">
					{isZh ? '已测试模型' : 'Tested Models'}
				</Heading>
				<div className="bg-linear-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30 rounded-xl p-6 border border-emerald-200/50 dark:border-emerald-800/50">
					<div className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-3 items-start">
						{Object.entries(MODEL_GROUPS).map(([brand, models]) => (
							<Fragment key={brand}>
								<span className="text-xs font-semibold text-gray-500 dark:text-gray-400 pt-2">
									{brand}
								</span>
								<div className="flex flex-wrap gap-2">
									{models.map((model) => (
										<ModelBadge key={model} model={model} baseline={BASELINE.has(model)} />
									))}
								</div>
							</Fragment>
						))}
					</div>
				</div>
			</section>

			{/* Tips Section */}
			<section className="mb-10">
				<h2 className="text-2xl font-semibold mb-4">{isZh ? '提示' : 'Tips'}</h2>
				<div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
					<ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
						<li>
							{isZh
								? '⭐ 推荐使用 ToolCall 能力强的轻量级模型'
								: '⭐ Recommended: Fast, lightweight models with strong ToolCall capabilities'}
						</li>
						<li>
							{isZh
								? 'ToolCall 能力较弱的模型可能返回错误的格式，常见错误能够自动恢复，建议设置较高的 temperature'
								: 'Models with weaker ToolCall capabilities may return incorrect formats. Common errors usually auto-recover. Higher temperature recommended'}
						</li>
						<li>
							{isZh
								? '小模型或者无法适应复杂 Tool 定义的模型，通常效果不佳'
								: 'Small models or those unable to handle complex tool definitions typically perform poorly'}
						</li>
					</ul>
				</div>
			</section>

			{/* Configuration Section */}
			<section className="mb-10">
				<Heading id="configuration">{isZh ? '配置方式' : 'Configuration'}</Heading>
				<CodeEditor
					code={`// OpenAI-compatible services
const pageAgent = new PageAgent({
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-4.1-mini'
});

// Self-hosted models (e.g., Ollama)
const pageAgent = new PageAgent({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'NA',
  model: 'llama3.2'
});

`}
				/>
			</section>

			{/* Ollama Section */}
			<section className="mb-10">
				<Heading id="ollama">Ollama</Heading>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '需要支持 tool_call 的模型，建议使用 10B 参数以上的模型。'
						: 'Requires tool_call capable models. Models with 10B+ parameters are recommended.'}
				</p>
				<CodeEditor
					code={`LLM_BASE_URL="http://localhost:11434/v1"
LLM_API_KEY="NA"
LLM_MODEL_NAME="llama3.2"`}
				/>
				<div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
					<h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
						{isZh ? '⚠️ 注意事项' : '⚠️ Important Notes'}
					</h3>
					<ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
						<li>
							{isZh
								? '确保 OLLAMA_ORIGINS 设置为 * 以避免 403 错误'
								: 'Add * to OLLAMA_ORIGINS to avoid 403 errors'}
						</li>
						<li>
							{isZh
								? '小于 10B 参数的模型通常效果不佳'
								: 'Models smaller than 10B are unlikely to be strong enough'}
						</li>
						<li>{isZh ? '需要支持 tool_call 的模型' : 'Requires tool_call capable models'}</li>
						<li>
							{isZh
								? '确保上下文长度大于输入 token 数，否则 Ollama 会静默截断 prompt。普通页面约需 15k token，随步骤增加。默认 4k 上下文长度无法正常工作'
								: 'Ensure context length exceeds input tokens, or Ollama will silently truncate prompts. ~15k tokens for a typical page, increases with steps. Default 4k context length will NOT work'}
						</li>
					</ul>
				</div>

				<div className="mt-4">
					<h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
						{isZh ? '建议启动参数' : 'Recommended Startup'}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
						{isZh
							? '启动 Ollama 时建议配置以下环境变量：扩大上下文窗口、允许跨域访问、监听所有网络接口。'
							: 'Start Ollama with these environment variables: larger context window, allow cross-origin access, and listen on all interfaces.'}
					</p>

					<div className="space-y-2">
						<p className="text-xs font-medium text-gray-500 dark:text-gray-400">macOS / Linux</p>
						<CodeEditor
							code={`OLLAMA_CONTEXT_LENGTH=64000 OLLAMA_HOST=0.0.0.0:11434 OLLAMA_ORIGINS="*" ollama serve`}
						/>

						<p className="text-xs font-medium text-gray-500 dark:text-gray-400 pt-2">
							Windows (PowerShell)
						</p>
						<CodeEditor
							code={`$env:OLLAMA_CONTEXT_LENGTH=64000; $env:OLLAMA_HOST="0.0.0.0:11434"; $env:OLLAMA_ORIGINS="*"; ollama serve`}
						/>
					</div>
				</div>
			</section>

			{/* Production Authentication */}
			<section className="mb-10">
				<Heading id="production-authentication" className="text-2xl font-semibold mb-4">
					{isZh ? '🔐 生产环境鉴权' : '🔐 Production Authentication'}
				</Heading>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
					{isZh
						? '如果你只是将它用作个人助手，可以直接连接你的 LLM 服务。'
						: 'If you only use it as a personal assistant, you can connect to your LLM service directly.'}
				</p>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
					{isZh ? (
						<>
							如果你计划将它集成到你的 Web 应用中，建议搭建一个后端代理来转发 LLM 请求，并使用{' '}
							<code>customFetch</code> 携带 Cookie 或其他鉴权信息：
						</>
					) : (
						<>
							If you plan to integrate it into your web app, it's better to have a backend proxy for
							the LLM and use <code>customFetch</code> to authenticate the request with cookies or
							other methods:
						</>
					)}
				</p>
				<CodeEditor
					code={`const agent = new PageAgent({
  baseURL: '/api/llm-proxy',
  apiKey: 'NA',
  model: 'gpt-5.1',
  customFetch: (url, init) =>
    fetch(url, { ...init, credentials: 'include' }),
});`}
				/>
				<div className="mt-4 bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500 p-4 rounded-r-lg">
					<p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
						{isZh
							? '⚠️ 永远不要把真实的 LLM API Key 提交到前端代码中'
							: '⚠️ NEVER commit real LLM API keys to your frontend code'}
					</p>
				</div>
			</section>
		</div>
	)
}
