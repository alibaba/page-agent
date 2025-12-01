import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'

export default function CdnSetup() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">CDN 引入</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
				通过 CDN 快速集成 page-agent，无需复杂的构建配置。
			</p>

			<h2 className="text-2xl font-bold mb-3">快速开始</h2>

			<CodeEditor
				className="mb-8"
				code={`
// 仅供测试使用，稳定 CDN 待定
<script src="https://hwcxiuzfylggtcktqgij.supabase.co/storage/v1/object/public/demo-public/v0.0.4/page-agent.js" crossorigin="true" type="text/javascript"></script>

<script>
	window.pageAgent.panel.show()
</script>`}
			/>

			<div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
				<h3 className="text-lg font-semibold mb-2 text-yellow-900 dark:text-yellow-300">
					⚠️ 注意事项
				</h3>
				<ul className="text-gray-600 dark:text-gray-300 space-y-1">
					<li>• 生产环境建议使用固定版本号</li>
					<li>• 确保 HTTPS 环境下使用</li>
					<li>• 配置 CSP 策略允许脚本执行</li>
				</ul>
			</div>
		</div>
	)
}
