import BetaNotice from '@/components/BetaNotice'

export default function SecurityPermissions() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">安全与权限</h1>

			<BetaNotice />

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				page-agent 提供四种安全机制，确保 AI 操作在可控范围内进行。
			</p>

			<div className="space-y-6">
				<section>
					<h2 className="text-2xl font-bold mb-3">元素操作黑白名单</h2>
					<div className="space-y-3">
						<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
								🚫 操作黑名单
							</h3>
							<p className="text-gray-600 dark:text-gray-300">
								禁止 AI 操作敏感元素，如删除按钮、支付按钮等。
							</p>
						</div>
						<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-green-900 dark:text-green-300">
								✅ 操作白名单
							</h3>
							<p className="text-gray-600 dark:text-gray-300">明确定义 AI 可以操作的元素范围。</p>
						</div>
					</div>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-3">URL 黑白名单</h2>
					<div className="space-y-3">
						<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
								🚫 URL 黑名单
							</h3>
							<p className="text-gray-600 dark:text-gray-300">禁止 AI 访问敏感页面和危险链接。</p>
						</div>
						<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-green-900 dark:text-green-300">
								✅ URL 白名单
							</h3>
							<p className="text-gray-600 dark:text-gray-300">限制 AI 只能访问预定义的安全页面。</p>
						</div>
					</div>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-3">Instruction 安全约束</h2>
					<div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-300">
							⚠️ 高危操作控制
						</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-3">
							在 AI 指令中明确列举高危操作，通过两种策略进行控制：
						</p>
						<div className="space-y-2">
							<div className="pl-3 border-l-2 border-red-400">
								<p className="font-medium text-red-700 dark:text-red-300">完全禁止操作</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									对极高风险操作明确禁止执行
								</p>
							</div>
							<div className="pl-3 border-l-2 border-orange-400">
								<p className="font-medium text-orange-700 dark:text-orange-300">需用户确认操作</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									对中等风险操作要求用户明确同意
								</p>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	)
}
