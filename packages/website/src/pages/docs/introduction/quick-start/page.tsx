import { useState } from 'react'

import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { CDN_DEMO_CN_URL, CDN_DEMO_URL } from '@/constants'
import { useLanguage } from '@/i18n/context'

export default function QuickStart() {
	const { isZh } = useLanguage()
	const [cdnSource, setCdnSource] = useState<'international' | 'china'>(
		isZh ? 'china' : 'international'
	)
	const cdnBase = cdnSource === 'china' ? CDN_DEMO_CN_URL : CDN_DEMO_URL
	const cdnUrl = `${cdnBase}?lang=${isZh ? 'zh-CN' : 'en-US'}`

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">Quick Start</h1>

			<p className=" mb-6 leading-relaxed">
				{isZh ? '几分钟内完成 page-agent 的集成。' : 'Integrate page-agent in minutes.'}
			</p>

			<Heading id="installation-steps" className="text-2xl font-bold mb-3">
				{isZh ? '安装步骤' : 'Installation Steps'}
			</Heading>

			<div className="space-y-4 mb-6">
				{/* Demo CDN - One Line */}
				<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
						{isZh ? '🚀 快速体验（Demo CDN）' : '🚀 Quick Try (Demo CDN)'}
					</h3>
					<div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded mb-3 text-sm">
						<span className="text-yellow-800 dark:text-yellow-200">
							⚠️{' '}
							{isZh ? (
								<>
									该 Demo CDN 使用了免费的测试 LLM API，使用即表示您同意其
									<a
										href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use"
										target="_blank"
										rel="noopener noreferrer"
										className="underline"
									>
										使用条款
									</a>
								</>
							) : (
								<>
									This demo CDN uses our free testing LLM API. By using it you agree to the{' '}
									<a
										href="https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md#2-testing-api-and-demo-disclaimer--terms-of-use"
										target="_blank"
										rel="noopener noreferrer"
										className="underline"
									>
										Terms of Use
									</a>
								</>
							)}
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<label htmlFor="cdn-source" className="text-gray-700 dark:text-gray-300">
							{isZh ? '镜像：' : 'Mirror:'}
						</label>
						<select
							id="cdn-source"
							value={cdnSource}
							onChange={(e) => setCdnSource(e.target.value as 'international' | 'china')}
							className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200"
						>
							<option value="international">jsdelivr CDN {isZh ? '（全球）' : '(Global)'}</option>
							<option value="china">npmmirror CDN {isZh ? '（中国）' : '(China)'}</option>
						</select>
					</div>
					<CodeEditor
						code={`<script src="${cdnUrl}" crossorigin="anonymous"></script>`}
						language="html"
					/>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						{isZh
							? '添加 autoInit=false 参数可只加载脚本，不自动创建 Demo Agent，之后可通过 new window.PageAgent(...) 手动初始化，并使用自定义 LLM。'
							: 'Add the autoInit=false parameter to load the script without creating the demo agent automatically. You can then instantiate it with new window.PageAgent(...) and your own LLMs.'}
					</p>
				</div>

				{/* NPM - Recommended */}
				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						{isZh ? '📦 NPM 安装（推荐）' : '📦 NPM Install (Recommended)'}
					</h3>
					<CodeEditor
						code={`// npm install page-agent

import { PageAgent } from 'page-agent'`}
						language="bash"
					/>
				</div>

				<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
						{isZh ? '2. 初始化配置' : '2. Initialize Configuration'}
					</h3>
					<CodeEditor
						code={`const agent = new PageAgent({
  model: 'qwen3.5-plus',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: 'YOUR_API_KEY',
  language: '${isZh ? 'zh-CN' : 'en-US'}'
})`}
						language="javascript"
					/>
				</div>

				<div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-300">
						{isZh ? '3. 开始使用' : '3. Start Using'}
					</h3>
					<CodeEditor
						code={`// ${isZh ? '程序化执行自然语言指令' : 'Execute natural language instructions programmatically'}
await agent.execute('${isZh ? '点击提交按钮，然后填写用户名为张三' : 'Click submit button, then fill username as John'}');

// ${isZh ? '或者' : 'Or:'}
// ${isZh ? '显示对话框让用户输入指令' : 'Show panel for user to input instructions'}
agent.panel.show()
`}
						language="javascript"
					/>
				</div>
			</div>
		</div>
	)
}
