import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'

export default function BestPractices() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">最佳实践</h1>

			<BetaNotice />

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
				使用 page-agent 的最佳实践和常见问题解决方案。
			</p>

			<h2 className="text-2xl font-bold mb-3">性能优化</h2>

			<div className="space-y-4 mb-6">
				<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-300">
						⚡ 减少 API 调用
					</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-3">
						合并多个操作指令，减少与 AI 模型的交互次数。
					</p>

					<CodeEditor
						code={`// 推荐：合并操作
await pageAgent.execute('填写表单：姓名张三，邮箱test@example.com，然后提交');

// 不推荐：分别操作
await pageAgent.execute('填写姓名张三');
await pageAgent.execute('填写邮箱test@example.com');
await pageAgent.execute('点击提交按钮');`}
					/>
				</div>

				<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
						🎯 精确的元素描述
					</h3>
					<p className="text-gray-600 dark:text-gray-300">
						使用具体、明确的元素描述，提高操作成功率。
					</p>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-3">安全建议</h2>

			<div className="space-y-3 mb-6">
				<div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
					<h3 className="font-semibold mb-1 text-red-900 dark:text-red-300">重要操作保护</h3>
					<p className="text-gray-600 dark:text-gray-300">对删除、支付等敏感操作设置黑名单保护。</p>
				</div>

				<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
					<h3 className="font-semibold mb-1 text-yellow-900 dark:text-yellow-300">数据脱敏</h3>
					<p className="text-gray-600 dark:text-gray-300">启用数据脱敏功能，保护用户隐私信息。</p>
				</div>
			</div>

			<h2 className="text-2xl font-bold mb-3">调试技巧</h2>

			<CodeEditor code={`// TODO`} />
		</div>
	)
}
