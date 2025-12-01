import { useTranslation } from 'react-i18next'

import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'

export default function ModelIntegration() {
	const { t } = useTranslation('docs')

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{t('model_integration.title')}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
				{t('model_integration.subtitle')}
			</p>

			<h2 className="text-2xl font-bold mb-3">{t('model_integration.recommended')}</h2>

			<div className="grid md:grid-cols-3 gap-4 mb-6">
				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						{t('model_integration.model_gpt4_title')}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
						{t('model_integration.model_gpt4_badge')}
					</p>
					<ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
						<li>{t('model_integration.model_gpt4_1')}</li>
						<li>{t('model_integration.model_gpt4_2')}</li>
						<li>{t('model_integration.model_gpt4_3')}</li>
					</ul>
				</div>

				<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
						{t('model_integration.model_deepseek_title')}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
						{t('model_integration.model_deepseek_badge')}
					</p>
					<ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
						<li>{t('model_integration.model_deepseek_1')}</li>
						<li>{t('model_integration.model_deepseek_2')}</li>
						<li>{t('model_integration.model_deepseek_3')}</li>
					</ul>
				</div>

				<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
						{t('model_integration.model_qwen_title')}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
						{t('model_integration.model_qwen_badge')}
					</p>
					<ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
						<li>{t('model_integration.model_qwen_1')}</li>
						<li>{t('model_integration.model_qwen_2')}</li>
						<li>{t('model_integration.model_qwen_3')}</li>
					</ul>
				</div>

				<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
						{t('model_integration.model_gemini_title')}
					</h3>
					<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
						{t('model_integration.model_gemini_badge')}
					</p>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-3">{t('model_integration.available')}</h2>

			<div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg mb-6">
				<h3 className="text-lg font-semibold mb-3 text-emerald-900 dark:text-emerald-300">
					{t('model_integration.available_verified')}
				</h3>
				<div className="flex flex-wrap gap-2">
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						gpt-4.1-mini/4.1/5
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						grok-4/grok-code-fast
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						qwen3
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						deepseek-v3.1/3.2
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						claude-sonnet-4/4.5/haiku-4.5
					</span>
					<span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 px-3 py-1 text-sm">
						gemini-2.5
					</span>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-3">{t('model_integration.tips')}</h2>

			<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-6">
				<ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-5">
					<li>{t('model_integration.tip_1')}</li>
					<li>{t('model_integration.tip_2')}</li>
					<li>{t('model_integration.tip_3')}</li>
				</ul>
			</div>

			<h2 className="text-2xl font-bold mb-3">{t('model_integration.security')}</h2>

			<div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 mb-4">
				<p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
					{t('model_integration.security_warning')}
				</p>
			</div>

			<p className="text-gray-600 dark:text-gray-300 mb-4">
				{t('model_integration.security_desc')}
			</p>

			<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
				<h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-300">
					{t('model_integration.security_backend_proxy')}
				</h3>
				<p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
					{t('model_integration.security_backend_desc')}
				</p>
				<ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-none pl-0">
					<li>{t('model_integration.security_method_1')}</li>
					<li>{t('model_integration.security_method_2')}</li>
					<li>{t('model_integration.security_method_3')}</li>
				</ul>
			</div>

			<h2 className="text-2xl font-bold mb-3">{t('model_integration.configuration')}</h2>

			<CodeEditor
				code={`
// 百炼等其他兼容服务
const pageAgent = new PageAgent({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: 'your-api-key',
  model: 'qwen-plus'
});

// 私有部署模型
const pageAgent = new PageAgent({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'N/A',  // Ollama 通常使用任意值
  model: 'qwen3:latest'
});

// 测试接口
// @note: 限流，限制 prompt 内容，限制来源，随时变更，请替换成你自己的
// @note: 使用 DeepSeek-chat(3.2) 官方版本，使用协议和隐私策略见 DeepSeek 网站
const DEMO_MODEL = 'PAGE-AGENT-FREE-TESTING-RANDOM'
const DEMO_BASE_URL = 'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy'
const DEMO_API_KEY = 'PAGE-AGENT-FREE-TESTING-RANDOM'
`}
			/>
		</div>
	)
}
