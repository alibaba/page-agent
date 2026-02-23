import CodeEditor from '@/components/CodeEditor'
import { CDN_DEMO_CN_URL, CDN_DEMO_URL } from '@/constants'
import { useLanguage } from '@/i18n/context'

export default function QuickStart() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">Quick Start</h1>

			<p className=" mb-6 leading-relaxed">
				{isZh ? '几分钟内完成 page-agent 的集成。' : 'Integrate page-agent in minutes.'}
			</p>

			<h2 className="text-2xl font-bold mb-3">{isZh ? '安装步骤' : 'Installation Steps'}</h2>

			<div className="space-y-4 mb-6">
				{/* Demo CDN - One Line */}
				<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
						{isZh ? '🚀 快速体验（Demo CDN）' : '🚀 Quick Try (Demo CDN)'}
					</h3>
					<div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded mb-3 text-sm">
						<span className="text-yellow-800 dark:text-yellow-200">
							⚠️ {isZh ? '仅用于技术评估' : 'For evaluation only'}
						</span>
					</div>
					<CodeEditor
						code={`<script src="DEMO_CDN_URL" crossorigin="true"></script>`}
						language="html"
					/>
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="text-left py-2 px-3 font-semibold w-28">
									{isZh ? '镜像' : 'Mirrors'}
								</th>
								<th className="text-left py-2 px-3 font-semibold">URL</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-b border-gray-100 dark:border-gray-800">
								<td className="py-2 px-3">{isZh ? '全球' : 'Global'}</td>
								<td className="py-2 px-3 font-mono text-xs break-all">{CDN_DEMO_URL}</td>
							</tr>
							<tr>
								<td className="py-2 px-3">{isZh ? '中国' : 'China'}</td>
								<td className="py-2 px-3 font-mono text-xs break-all">{CDN_DEMO_CN_URL}</td>
							</tr>
						</tbody>
					</table>
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
