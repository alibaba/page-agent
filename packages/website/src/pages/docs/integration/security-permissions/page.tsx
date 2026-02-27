import BetaNotice from '@/components/BetaNotice'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function SecurityPermissions() {
	const { isZh } = useLanguage()

	return (
		<div>
			<BetaNotice />

			<h1 className="text-4xl font-bold mb-6">{isZh ? '安全与权限' : 'Security & Permissions'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? 'page-agent 提供多种安全机制，确保 AI 操作在可控范围内进行。'
					: 'page-agent provides multiple security mechanisms to ensure AI operations stay within controlled boundaries.'}
			</p>

			<div className="space-y-6">
				<section>
					<Heading
						id="element-interaction-allowlist-blocklist"
						level={2}
						className="text-2xl font-bold mb-3"
					>
						{isZh ? '元素操作黑白名单' : 'Element Interaction Allowlist/Blocklist'}
					</Heading>
					<div className="space-y-3">
						<div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
								🚫 {isZh ? '操作黑名单' : 'Blocklist'}
							</h3>
							<p className="text-gray-600 dark:text-gray-300">
								{isZh
									? '禁止 AI 操作敏感元素，如删除按钮、支付按钮等。'
									: 'Prevent AI from interacting with sensitive elements like delete buttons, payment buttons, etc.'}
							</p>
						</div>
						<div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-green-900 dark:text-green-300">
								✅ {isZh ? '操作白名单' : 'Allowlist'}
							</h3>
							<p className="text-gray-600 dark:text-gray-300">
								{isZh
									? '明确定义 AI 可以操作的元素范围。'
									: 'Explicitly define which elements AI can interact with.'}
							</p>
						</div>
					</div>
				</section>

				<section>
					<Heading
						id="instruction-safety-constraints"
						level={2}
						className="text-2xl font-bold mb-3"
					>
						{isZh ? 'Instruction 安全约束' : 'Instruction Safety Constraints'}
					</Heading>
					<div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
						<h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-300">
							⚠️ {isZh ? '高危操作控制' : 'High-Risk Operation Control'}
						</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-3">
							{isZh
								? '在 AI 指令中明确列举高危操作，通过两种策略进行控制：'
								: 'Define high-risk operations in AI instructions and control them through two strategies:'}
						</p>
						<div className="space-y-2">
							<div className="pl-3 border-l-2 border-red-400">
								<p className="font-medium text-red-700 dark:text-red-300">
									{isZh ? '完全禁止操作' : 'Completely Forbidden'}
								</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{isZh
										? '对极高风险操作明确禁止执行'
										: 'Explicitly prohibit execution of extremely high-risk operations'}
								</p>
							</div>
							<div className="pl-3 border-l-2 border-orange-400">
								<p className="font-medium text-orange-700 dark:text-orange-300">
									{isZh ? '需用户确认操作' : 'Requires User Confirmation'}
								</p>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{isZh
										? '对中等风险操作要求用户明确同意'
										: 'Require explicit user consent for medium-risk operations'}
								</p>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	)
}
