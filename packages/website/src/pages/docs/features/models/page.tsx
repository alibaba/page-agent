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
					code={`// OpenAI-compatible services (e.g., Alibaba Bailian)
const pageAgent = new PageAgent({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: 'your-api-key',
  model: 'qwen3.5-plus'
});

// Self-hosted models (e.g., Ollama)
const pageAgent = new PageAgent({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'NA',
  model: 'qwen3:14b'
});

`}
				/>
			</section>

			{/* Free Testing API Section */}
			<section className="mb-10">
				<Heading id="free-testing-api">{isZh ? '免费测试接口' : 'Free Testing API'}</Heading>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '以下免费测试接口仅供 PageAgent.js 和 PageAgent Extension 的技术评估和测试使用。'
						: 'The following free testing endpoint is provided for testing and technical evaluation.'}
				</p>
				<div className="my-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
					<p className="text-xs text-gray-600 dark:text-gray-400">
						{isZh
							? '⚠️ 仅供技术评估和研发用途，禁止用于生产环境。数据通过中国大陆服务器处理。请勿输入任何个人身份信息或敏感数据。使用即表示您同意'
							: '⚠️ Strictly for technical evaluation and R&D only. Data is processed via servers in Mainland China. Do not input any PII or sensitive data. By using this API you agree to the'}{' '}
						<a
							href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-500 hover:underline"
						>
							{isZh ? '使用条款' : 'Terms of Use'}
						</a>
					</p>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-5 border border-gray-200 dark:border-gray-800">
					<h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
						Qwen (Alibaba Cloud China)
					</h3>
					<p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
						{isZh
							? '通过阿里云函数计算（中国大陆）转发至百炼 Qwen 模型'
							: 'Proxied via Alibaba Cloud FC (Mainland China) to BaiLian Qwen models'}
						{' · '}
						<a
							href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-500 hover:underline"
						>
							{isZh ? '使用条款' : 'Terms of Use'}
						</a>
					</p>
					<CodeEditor
						code={`# qwen3.5-plus (default for demos) or qwen3.5-flash (lighter)
LLM_BASE_URL="https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run"
LLM_MODEL_NAME="qwen3.5-plus"
LLM_API_KEY="NA"`}
					/>
				</div>
			</section>

			{/* Ollama Section */}
			<section className="mb-10">
				<Heading id="ollama">Ollama</Heading>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '已在 Ollama 0.15 + qwen3:14b (RTX3090 24GB) 上测试通过。'
						: 'Tested on Ollama 0.15 with qwen3:14b (RTX3090 24GB).'}
				</p>
				<CodeEditor
					code={`LLM_BASE_URL="http://localhost:11434/v1"
LLM_API_KEY="NA"
LLM_MODEL_NAME="qwen3:14b"`}
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
