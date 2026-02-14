import { Link } from 'wouter'

import { useLanguage } from '@/i18n/context'

export default function LimitationsPage() {
	const { isZh } = useLanguage()

	return (
		<div className="max-w-4xl mx-auto">
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
					{isZh ? '使用限制' : 'Limitations'}
				</h1>
				<p className="text-xl text-gray-600 dark:text-gray-300">
					{isZh
						? 'Page Agent 基于 DOM 理解网页并执行操作。这决定了它的能力边界。'
						: 'Page Agent understands web pages via DOM and performs actions accordingly. This defines its capability boundary.'}
				</p>
			</div>

			<div className="prose prose-lg dark:prose-invert max-w-none">
				{/* PageAgent.js vs PageAgentExt */}
				<h2 className="text-2xl font-bold mb-3">
					{isZh ? 'PageAgent.js vs PageAgentExt' : 'PageAgent.js vs PageAgentExt'}
				</h2>
				<p className="text-gray-600 dark:text-gray-300 mb-4">
					{isZh
						? 'PageAgent.js 是核心库，运行在页面内。PageAgentExt 是可选的浏览器扩展，提供额外的浏览器级控制能力。'
						: 'PageAgent.js is the core library running inside a page. PageAgentExt is an optional browser extension that adds browser-level control.'}
				</p>
				<div className="overflow-x-auto mb-6">
					<table className="w-full text-sm border-collapse">
						<thead>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="text-left py-3 pr-4"></th>
								<th className="text-left py-3 px-4 font-semibold">PageAgent.js</th>
								<th className="text-left py-3 pl-4 font-semibold">
									PageAgentExt{' '}
									<Link
										href="/docs/features/chrome-extension"
										className="text-xs font-normal text-blue-600 dark:text-blue-400 hover:underline"
									>
										{isZh ? '了解更多' : 'learn more'}
									</Link>
								</th>
							</tr>
						</thead>
						<tbody className="text-gray-600 dark:text-gray-300">
							<tr className="border-b border-gray-100 dark:border-gray-800">
								<td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
									{isZh ? '接入方式' : 'Integration'}
								</td>
								<td className="py-3 px-4">
									{isZh ? '网站开发者主动集成' : 'Site developer integrates the library'}
								</td>
								<td className="py-3 pl-4">
									{isZh ? '用户安装浏览器扩展' : 'User installs a browser extension'}
								</td>
							</tr>
							<tr className="border-b border-gray-100 dark:border-gray-800">
								<td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
									{isZh ? '可操作范围' : 'Scope'}
								</td>
								<td className="py-3 px-4">
									{isZh ? '当前页面（为 SPA 设计）' : 'Current page (designed for SPAs)'}
								</td>
								<td className="py-3 pl-4">
									{isZh ? '任意网页、多标签页' : 'Any web page, multi-tab'}
								</td>
							</tr>
							<tr>
								<td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
									{isZh ? '额外能力' : 'Extra capabilities'}
								</td>
								<td className="py-3 px-4">—</td>
								<td className="py-3 pl-4">
									{isZh ? '新建/切换/关闭标签页' : 'Open / switch / close tabs'}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				{/* Interaction Limitations */}
				<h2 className="text-2xl font-bold mb-3">
					{isZh ? '交互能力' : 'Interaction Capabilities'}
				</h2>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
					<div className="grid md:grid-cols-2 gap-6">
						<div>
							<h3 className="font-semibold mb-3 text-green-700 dark:text-green-400">
								{isZh ? '支持' : 'Supported'}
							</h3>
							<ul className="space-y-1.5 text-sm">
								{[
									isZh ? '点击、文本输入、选择' : 'Click, text input, select',
									isZh ? '页面滚动（垂直 / 水平）' : 'Scroll (vertical / horizontal)',
									isZh ? '表单提交、焦点切换' : 'Form submit, focus',
									isZh ? '执行 JavaScript（可选）' : 'Execute JavaScript (opt-in)',
								].map((text) => (
									<li key={text} className="flex items-center text-gray-700 dark:text-gray-300">
										<span className="mr-2 text-green-600 dark:text-green-400">✓</span>
										{text}
									</li>
								))}
							</ul>
						</div>
						<div>
							<h3 className="font-semibold mb-3 text-red-700 dark:text-red-400">
								{isZh ? '不支持' : 'Not supported'}
							</h3>
							<ul className="space-y-1.5 text-sm">
								{[
									isZh ? '悬停、拖拽、右键菜单' : 'Hover, drag & drop, right-click',
									isZh ? '键盘快捷键' : 'Keyboard shortcuts',
									isZh ? '坐标定位操作' : 'Position-based control',
									isZh ? '绘图操作' : 'Drawing',
								].map((text) => (
									<li key={text} className="flex items-center text-gray-700 dark:text-gray-300">
										<span className="mr-2 text-red-600 dark:text-red-400">✗</span>
										{text}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				{/* Understanding Limitations */}
				<h2 className="text-2xl font-bold mb-3">{isZh ? '理解能力' : 'Understanding'}</h2>
				<div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 mb-6">
					<p className="text-amber-800 dark:text-amber-200 mb-2 font-medium">
						{isZh
							? 'Page Agent 不使用多模态模型，不截图，没有视觉能力。仅通过 DOM 结构理解页面。'
							: 'Page Agent does not use multimodal models, does not take screenshots, and has no visual capability. It reads pages through DOM structure only.'}
					</p>
					<p className="text-amber-700 dark:text-amber-300 text-sm">
						{isZh
							? '图片、Canvas、WebGL、SVG 等视觉内容无法被识别。页面的语义化程度和可访问性直接影响 AI 的理解准确性。'
							: 'Images, Canvas, WebGL, SVG and other visual content cannot be recognized. Page semantic quality and accessibility directly affect AI accuracy.'}
					</p>
				</div>

				{/* Website Quality */}
				<h2 className="text-2xl font-bold mb-3">
					{isZh ? '网页质量影响' : 'Page Quality Matters'}
				</h2>
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
					<p className="text-gray-600 dark:text-gray-300 text-sm">
						{isZh
							? '反常识的交互逻辑、纯视觉的操作提示、快速出现消失的元素等都会降低自动化成功率。语义化的 HTML 和良好的可访问性会显著提升效果。'
							: 'Counter-intuitive interactions, visual-only cues, and rapidly appearing/disappearing elements reduce automation success. Semantic HTML and good accessibility significantly improve results.'}
					</p>
				</div>
			</div>
		</div>
	)
}
