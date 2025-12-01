import { useTranslation } from 'react-i18next'

import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'

export default function CustomTools() {
	const { t } = useTranslation('docs')

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{t('custom_tools.title')}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{t('custom_tools.subtitle')}
			</p>

			<div className="space-y-8">
				<section>
					<h2 className="text-2xl font-bold mb-4">{t('custom_tools.registration')}</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{t('custom_tools.registration_desc')}
					</p>

					<CodeEditor
						code={`import zod from 'zod'
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
    ask_user: null // never ask user questions
}
	
const pageAgent = new PageAgent({customTools})
`}
						language="javascript"
					/>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">{t('custom_tools.page_filter')}</h2>

					<BetaNotice />

					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{t('custom_tools.page_filter_desc')}
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
					<h2 className="text-2xl font-bold mb-4">{t('custom_tools.best_practices')}</h2>
					<div className="space-y-4">
						<div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
							<h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
								{t('custom_tools.bp_performance')}
							</h3>
							<ul className="text-gray-600 dark:text-gray-300 space-y-1 text-sm">
								<li>{t('custom_tools.bp_1')}</li>
								<li>{t('custom_tools.bp_2')}</li>
								<li>{t('custom_tools.bp_3')}</li>
							</ul>
						</div>
					</div>
				</section>
			</div>
		</div>
	)
}
