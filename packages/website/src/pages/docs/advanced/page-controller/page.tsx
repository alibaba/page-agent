import { Link } from 'wouter'

import { APIDivider, APIReference } from '@/components/APIReference'
import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function PageControllerDocs() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">PageController</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? 'PageController 负责 DOM 提取和元素交互，独立于 LLM。它将页面状态结构化为 LLM 可消费的格式，并执行元素级操作。'
					: 'PageController handles DOM extraction and element interaction, independent of LLM. It structures page state into LLM-consumable format and executes element-level actions.'}
			</p>

			{/* Basic Usage */}
			<section className="mb-10">
				<Heading id="basic-usage">{isZh ? '基本用法' : 'Basic Usage'}</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? 'PageAgent 接受 PageController 配置项：'
						: 'PageAgent accepts PageController options:'}
				</p>
				<CodeEditor
					language="typescript"
					code={`import { PageAgent } from 'page-agent'

const agent = new PageAgent({
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-5.2',

  // PageController options
  enableMask: true,
  viewportExpansion: 0,
})`}
				/>
				<p className="text-gray-600 dark:text-gray-400 mt-4">
					{isZh
						? 'PageAgentCore 接受 PageController 实例：'
						: 'PageAgentCore accepts a PageController instance:'}
				</p>
				<CodeEditor
					language="typescript"
					code={`import { PageAgentCore } from '@page-agent/core'
import { PageController } from '@page-agent/page-controller'

const pageController = new PageController({
  enableMask: true,
  viewportExpansion: -1,  // extract full page
})

const agent = new PageAgentCore({
  pageController,
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-5.2',
})`}
				/>
			</section>

			<APIDivider title={isZh ? '配置' : 'Configuration'} />

			{/* Configuration */}
			<section className="mb-10">
				<Heading id="configuration">PageControllerConfig</Heading>
				<APIReference
					properties={[
						{
							name: 'enableMask',
							type: 'boolean',
							defaultValue: 'false',
							description: isZh
								? '启用视觉遮罩覆盖层，在自动化期间阻止用户操作页面。通过 PageAgent 创建时默认为 true。'
								: 'Enable visual mask overlay that blocks user interaction during automation. Defaults to true when created via PageAgent.',
						},
						{
							name: 'viewportExpansion',
							type: 'number',
							defaultValue: '0',
							description: isZh
								? '向视口外扩展提取的像素数。设为 -1 表示提取整个页面。'
								: 'Pixels to expand extraction beyond viewport. Set to -1 to extract the entire page.',
						},
						{
							name: 'interactiveBlacklist',
							type: '(Element | (() => Element))[]',
							description: isZh
								? '要排除的交互元素列表。支持元素引用或返回元素的函数（延迟求值）。'
								: 'Elements to exclude from interaction. Supports element references or functions returning elements (lazy evaluation).',
						},
						{
							name: 'interactiveWhitelist',
							type: '(Element | (() => Element))[]',
							description: isZh
								? '要强制包含的交互元素列表。支持元素引用或返回元素的函数。'
								: 'Elements to force include for interaction. Supports element references or functions returning elements.',
						},
						{
							name: 'includeAttributes',
							type: 'string[]',
							description: isZh
								? '在 DOM 提取中包含的额外 HTML 属性（如 data-testid）。默认已包含常见属性如 role, aria-label 等。'
								: 'Additional HTML attributes to include in DOM extraction (e.g. data-testid). Common attributes like role, aria-label are included by default.',
						},
					]}
				/>
			</section>

			<APIDivider title={isZh ? '方法' : 'Methods'} />

			{/* Methods */}
			<section className="mb-10">
				<Heading id="methods">{isZh ? '方法' : 'Methods'}</Heading>

				<h3 className="text-lg font-semibold mt-6 mb-3">{isZh ? '状态查询' : 'State Queries'}</h3>
				<APIReference
					variant="methods"
					properties={[
						{
							name: 'getBrowserState()',
							type: 'Promise<BrowserState>',
							description: isZh
								? '获取结构化的浏览器状态（URL、标题、简化 HTML 等），自动调用 updateTree() 刷新 DOM。这是 Agent 在每步使用的主要方法。'
								: 'Get structured browser state (URL, title, simplified HTML, etc.), automatically calls updateTree() to refresh DOM. This is the primary method the agent uses each step.',
						},
						{
							name: 'updateTree()',
							type: 'Promise<string>',
							description: isZh
								? '刷新 DOM 树并返回简化 HTML。通常不需要手动调用 —— getBrowserState() 会自动调用。'
								: 'Refresh DOM tree and return simplified HTML. Usually not needed manually — getBrowserState() calls it automatically.',
						},
						{
							name: 'getCurrentUrl()',
							type: 'Promise<string>',
							description: isZh ? '获取当前页面 URL。' : 'Get current page URL.',
						},
					]}
				/>

				<h3 className="text-lg font-semibold mt-6 mb-3">{isZh ? '元素操作' : 'Element Actions'}</h3>
				<APIReference
					variant="methods"
					properties={[
						{
							name: 'clickElement(index)',
							type: 'Promise<ActionResult>',
							description: isZh
								? '按索引点击元素。索引来自简化 HTML 中的 [N] 标记。'
								: 'Click element by index. Index comes from [N] markers in simplified HTML.',
						},
						{
							name: 'inputText(index, text)',
							type: 'Promise<ActionResult>',
							description: isZh ? '向输入框元素填入文本。' : 'Input text into a form element.',
						},
						{
							name: 'selectOption(index, optionText)',
							type: 'Promise<ActionResult>',
							description: isZh ? '在下拉框中选择选项。' : 'Select option in a dropdown element.',
						},
						{
							name: 'scroll(options)',
							type: 'Promise<ActionResult>',
							description: isZh
								? '垂直滚动页面或指定元素。'
								: 'Scroll page or specific element vertically.',
						},
						{
							name: 'scrollHorizontally(options)',
							type: 'Promise<ActionResult>',
							description: isZh
								? '水平滚动页面或指定元素。'
								: 'Scroll page or specific element horizontally.',
						},
					]}
				/>

				<h3 className="text-lg font-semibold mt-6 mb-3">{isZh ? '遮罩控制' : 'Mask Control'}</h3>
				<APIReference
					variant="methods"
					properties={[
						{
							name: 'showMask()',
							type: 'Promise<void>',
							description: isZh
								? '显示视觉遮罩。需要 enableMask: true。'
								: 'Show visual mask overlay. Requires enableMask: true.',
						},
						{
							name: 'hideMask()',
							type: 'Promise<void>',
							description: isZh ? '隐藏视觉遮罩。' : 'Hide visual mask overlay.',
						},
					]}
				/>

				<h3 className="text-lg font-semibold mt-6 mb-3">{isZh ? '生命周期' : 'Lifecycle'}</h3>
				<APIReference
					variant="methods"
					properties={[
						{
							name: 'dispose()',
							type: 'void',
							description: isZh
								? '清理所有资源（DOM 高亮、遮罩等）。Agent 销毁时自动调用。'
								: 'Clean up all resources (DOM highlights, mask, etc.). Called automatically when agent disposes.',
						},
					]}
				/>
			</section>

			<APIDivider title={isZh ? '类型定义' : 'Type Definitions'} />

			{/* BrowserState */}
			<section className="mb-10">
				<Heading id="browser-state">BrowserState</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? 'getBrowserState() 返回的结构化浏览器状态，直接用于构建 LLM prompt。'
						: 'Structured browser state returned by getBrowserState(), used directly to build LLM prompts.'}
				</p>
				<CodeEditor
					language="typescript"
					code={`interface BrowserState {
  url: string
  title: string
  header: string   // page info + scroll position
  content: string  // simplified HTML of interactive elements
  footer: string   // scroll hint
}`}
				/>
			</section>

			{/* ActionResult */}
			<section className="mb-10">
				<Heading id="action-result">ActionResult</Heading>
				<CodeEditor
					language="typescript"
					code={`interface ActionResult {
  success: boolean
  message: string
}`}
				/>
			</section>

			{/* Custom PageController */}
			<section className="mb-10">
				<Heading id="custom-implementation">
					{isZh ? '自定义实现' : 'Custom Implementation'}
				</Heading>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{isZh
						? '在非浏览器环境（如 Puppeteer、Playwright），你可以实现自定义 PageController。需要实现 Agent 使用的核心方法：'
						: 'In non-browser environments (e.g. Puppeteer, Playwright), you can implement a custom PageController. Implement the core methods used by the agent:'}
				</p>
				<CodeEditor
					language="typescript"
					code={`import { PageAgentCore } from '@page-agent/core'
import type { PageController } from '@page-agent/page-controller'

class PuppeteerPageController implements PageController {
  async getBrowserState() { /* ... */ }
  async clickElement(index: number) { /* ... */ }
  async inputText(index: number, text: string) { /* ... */ }
  async scroll(options: { down: boolean; numPages: number }) { /* ... */ }
  // ... other methods
}

const agent = new PageAgentCore({
  pageController: new PuppeteerPageController(),
  baseURL: 'https://api.openai.com/v1',
  apiKey: 'your-api-key',
  model: 'gpt-5.2',
})`}
				/>
			</section>
		</div>
	)
}
