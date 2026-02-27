import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function ThirdPartyAgentPage() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">
				{isZh ? '接入第三方 Agent' : 'Third-party Agent Integration'}
			</h1>
			<p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-300">
				{isZh
					? '将 pageAgent 作为工具接入你的答疑助手或 Agent 系统，成为你 Agent 的眼和手。'
					: 'Integrate pageAgent as a tool in your support assistant or Agent system, becoming the eyes and hands of your Agent.'}
			</p>

			<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
				<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
					{isZh ? '💡 核心价值' : '💡 Core Value'}
				</h3>
				<p className="text-blue-800 dark:text-blue-200">
					{isZh
						? '让你的答疑机器人不再只是"嘴巴"，而是拥有"眼睛"和"手"的完整智能体。'
						: 'Transform your support bot from just a "mouth" into a complete intelligent agent with "eyes" and "hands".'}
				</p>
			</div>

			<Heading id="integration-method" level={2} className="text-2xl font-bold mb-4">
				{isZh ? '集成方式' : 'Integration Method'}
			</Heading>

			<div className="space-y-4 mb-6">
				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						1. Function Calling
					</h3>
					<CodeEditor
						code={`// ${isZh ? '定义工具' : 'Define tool'}
const pageAgentTool = {
  name: "page_agent",
  description: "${isZh ? '执行网页操作' : 'Execute web page operations'}",
  parameters: {
    type: "object",
    properties: {
      instruction: { type: "string", description: "${isZh ? '操作指令' : 'Operation instruction'}" }
    },
    required: ["instruction"]
  },
  execute: async (params) => {
    const result = await pageAgent.execute(params.instruction)
    return { success: result.success, message: result.data }
  }
}

// ${isZh ? '注册到你的 agent 中' : 'Register to your agent'}`}
						language="javascript"
					/>
				</div>
			</div>

			<Heading id="use-cases" level={2} className="text-2xl font-bold mb-4">
				{isZh ? '应用场景' : 'Use Cases'}
			</Heading>
			<div className="grid md:grid-cols-2 gap-4 mb-6">
				<div className="bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
					<h4 className="font-semibold mb-2 text-gray-900 dark:text-white">
						{isZh ? '🤖 智能客服系统' : '🤖 Smart Customer Service'}
					</h4>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						{isZh
							? '客服机器人帮用户直接操作系统，如"帮我提交工单"'
							: 'Support bots directly operate systems for users, e.g., "Help me submit a ticket"'}
					</p>
				</div>
				<div className="bg-linear-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
					<h4 className="font-semibold mb-2 text-gray-900 dark:text-white">
						{isZh ? '📋 业务流程助手' : '📋 Business Process Assistant'}
					</h4>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						{isZh
							? '引导新员工完成复杂流程，如"完成客户入职"'
							: 'Guide new employees through complex processes, e.g., "Complete customer onboarding"'}
					</p>
				</div>
				<div className="bg-linear-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
					<h4 className="font-semibold mb-2 text-gray-900 dark:text-white">
						{isZh ? '🎯 个人效率助手' : '🎯 Personal Productivity Assistant'}
					</h4>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						{isZh
							? '跨网站帮你完成任务，如"预订会议室"'
							: 'Complete tasks across websites, e.g., "Book a meeting room"'}
					</p>
				</div>
				<div className="bg-linear-to-br from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg">
					<h4 className="font-semibold mb-2 text-gray-900 dark:text-white">
						{isZh ? '🔧 运维自动化' : '🔧 DevOps Automation'}
					</h4>
					<p className="text-sm text-gray-600 dark:text-gray-300">
						{isZh
							? '通过自然语言操作管理后台，如"重启服务器"'
							: 'Operate admin panels via natural language, e.g., "Restart server"'}
					</p>
				</div>
			</div>

			<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
				<h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
					{isZh ? '⚠️ 注意事项' : '⚠️ Notes'}
				</h3>
				<ul className="text-yellow-800 dark:text-yellow-200 space-y-1 text-sm">
					<li>
						•{' '}
						{isZh
							? '确保目标网站允许自动化操作'
							: 'Ensure target website allows automated operations'}
					</li>
					<li>• {isZh ? '实现适当的频率限制' : 'Implement appropriate rate limiting'}</li>
					<li>
						•{' '}
						{isZh
							? '敏感操作建议要求人工确认'
							: 'Recommend human confirmation for sensitive operations'}
					</li>
				</ul>
			</div>
		</div>
	)
}
