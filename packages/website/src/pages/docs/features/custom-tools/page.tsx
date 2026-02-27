import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function CustomTools() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{isZh ? '自定义工具' : 'Custom Tools'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? '通过注册自定义工具，扩展 AI Agent 的能力边界。使用 Zod 定义严格的输入接口，让 AI 安全调用你的业务逻辑。'
					: 'Extend AI Agent capabilities by registering custom tools. Use Zod to define strict input schemas for safe business logic calls.'}
			</p>

			<div className="space-y-8">
				<section>
					<Heading id="tool-registration" level={2} className="text-2xl font-bold mb-4">
						{isZh ? '工具注册' : 'Tool Registration'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '每个自定义工具需要定义四个核心属性：name、description、input schema 和 execute 函数。'
							: 'Each custom tool requires four core properties: name, description, input schema, and execute function.'}
					</p>

					<CodeEditor
						code={`import * as zod from 'zod'
import { PageAgent, tool } from 'page-agent'

// override internal tool
const customTools = {
  ask_user: tool({
    description:
      'Ask the user or parent model a question and wait for their answer. Use this if you need more information or clarification.',
    inputSchema: zod.object({
      question: zod.string(),
    }),
    execute: async function (this: PageAgent, input) {
      const answer = await do_some_thing(input.question)
      return "✅ Received user answer: " + answer
    },
  })
}

// remove internal tool
const customTools = {
  scroll: null, // never scroll
}
	
const pageAgent = new PageAgent({customTools})
`}
						language="javascript"
					/>
				</section>

				<section>
					<Heading id="page-filter" level={2} className="text-2xl font-bold mb-4">
						{isZh ? '页面过滤器' : 'Page Filter'}
					</Heading>

					<BetaNotice />

					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '通过 pageFilter 属性控制工具在哪些页面可见，提升安全性和用户体验。'
							: 'Control tool visibility on specific pages via the pageFilter property to enhance security and UX.'}
					</p>

					<CodeEditor
						code={`pageAgent.registerTool({
  name: 'approveOrder',
  description: '审批订单',
  input: z.object({
    orderId: z.string(),
    approved: z.boolean()
  }),
  execute: async (params) => {
    // 审批逻辑
  },
  // 可选：页面过滤器
  pageFilter: {
    // 只在订单管理页面显示
    include: ['/admin/orders', '/admin/orders/*'],
    // 排除特定页面
    exclude: ['/admin/orders/archived']
  }
})`}
						language="javascript"
					/>
				</section>

				<section>
					<Heading id="best-practices" level={2} className="text-2xl font-bold mb-4">
						{isZh ? '最佳实践' : 'Best Practices'}
					</Heading>
					<div className="space-y-4">
						<div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
								{isZh ? '⚡ 性能优化' : '⚡ Performance Optimization'}
							</h3>
							<ul className="text-gray-600 dark:text-gray-300 space-y-1 text-sm">
								<li>
									{isZh
										? '• 使用 pageFilter 减少不必要的工具加载'
										: '• Use pageFilter to reduce unnecessary tool loading'}
								</li>
								<li>
									{isZh
										? '• 在 execute 函数中实现适当的缓存机制'
										: '• Implement appropriate caching in execute functions'}
								</li>
								<li>
									{isZh
										? '• 避免在工具中执行耗时的同步操作'
										: '• Avoid long-running sync operations in tools'}
								</li>
							</ul>
						</div>
					</div>
				</section>
			</div>
		</div>
	)
}
