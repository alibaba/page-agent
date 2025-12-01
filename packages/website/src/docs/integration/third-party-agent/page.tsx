import CodeEditor from '@/components/CodeEditor'

export default function ThirdPartyAgentPage() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">接入第三方 Agent</h1>
			<p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-300">
				将 pageAgent 作为工具接入你的答疑助手或 Agent 系统，成为你 Agent 的眼和手。
			</p>

			<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
				<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">💡 核心价值</h3>
				<p className="text-blue-800 dark:text-blue-200">
					让你的答疑机器人不再只是"嘴巴"，而是拥有"眼睛"和"手"的完整智能体。
				</p>
			</div>

			<h2 className="text-2xl font-bold mb-4">集成方式</h2>

			<div className="space-y-4 mb-6">
				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						1. Function Calling
					</h3>
					<CodeEditor
						code={`// 定义工具
const pageAgentTool = {
  name: "page_agent",
  description: "执行网页操作",
  parameters: {
    type: "object",
    properties: {
      instruction: { type: "string", description: "操作指令" }
    },
    required: ["instruction"]
  },
  execute: async (params) => {
    const result = await pageAgent.execute(params.instruction)
    return { success: result.success, message: result.message }
  }
}

// 注册到你的 agent 中`}
						language="javascript"
					/>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-4">应用场景</h2>
			<div className="grid md:grid-cols-2 gap-4 mb-6">
				<div className="bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
					<h4 className="font-semibold mb-2 text-gray-900 dark:text-white">🤖 智能客服系统</h4>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						客服机器人帮用户直接操作系统，如"帮我提交工单"
					</p>
				</div>
				<div className="bg-linear-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
					<h4 className="font-semibold mb-2 text-gray-900 dark:text-white">📋 业务流程助手</h4>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						引导新员工完成复杂流程，如"完成客户入职"
					</p>
				</div>
				<div className="bg-linear-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
					<h4 className="font-semibold mb-2 text-gray-900 dark:text-white">🎯 个人效率助手</h4>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						跨网站帮你完成任务，如"预订会议室"
					</p>
				</div>
				<div className="bg-linear-to-br from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
					<h4 className="font-semibold mb-2 text-gray-900 dark:text-white">🔧 运维自动化</h4>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						通过自然语言操作管理后台，如"重启服务器"
					</p>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-4">最佳实践</h2>
			<div className="space-y-4 mb-6">
				<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">错误处理</h3>
					<CodeEditor code={`// @TODO`} language="javascript" />
				</div>

				<div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">权限控制</h3>
					<CodeEditor code={`// @TODO`} language="javascript" />
				</div>
			</div>

			<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
				<h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
					⚠️ 注意事项
				</h3>
				<ul className="text-yellow-800 dark:text-yellow-200 space-y-1 text-sm">
					<li>• 确保目标网站允许自动化操作</li>
					<li>• 实现适当的频率限制</li>
					<li>• 敏感操作建议要求人工确认</li>
				</ul>
			</div>

			<div className="bg-linear-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg">
				<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">🎉 开始集成</h3>
				<p className="mb-3 text-gray-700 dark:text-gray-300">
					通过这种方式，你的 Agent 系统就能真正成为用户的智能助手。
				</p>
				<a
					href="/docs/integration/configuration"
					className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
				>
					查看配置选项 →
				</a>
			</div>
		</div>
	)
}
