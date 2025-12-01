import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'

export default function DataMasking() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">数据脱敏</h1>

			<BetaNotice />

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
				保护敏感数据，确保 AI 处理过程中的数据安全。
			</p>

			<h2 className="text-2xl font-bold mb-3">脱敏策略</h2>

			<div className="space-y-4 mb-6">
				<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
						🔒 自动脱敏
					</h3>
					<p className="text-gray-600 dark:text-gray-300">
						自动识别并脱敏手机号、身份证号、银行卡号等敏感信息。
					</p>
				</div>

				<div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
					<h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-300">
						⚙️ 自定义规则
					</h3>
					<p className="text-gray-600 dark:text-gray-300">
						支持自定义脱敏规则，适应不同业务场景的数据保护需求。
					</p>
				</div>
			</div>

			<CodeEditor
				code={`// 数据脱敏配置
// @todo
const rules = [
	{ pattern: /\\d{11}/, replacement: '***-****-****' },
	{ pattern: /\\d{4}-\\d{4}-\\d{4}-\\d{4}/, replacement: '****-****-****-****' }
]
pageAgent.maskData(rules)`}
			/>
		</div>
	)
}
