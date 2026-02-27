import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'
import { useLanguage } from '@/i18n/context'

export default function Instructions() {
	const { isZh } = useLanguage()

	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">{isZh ? '知识注入' : 'Instructions'}</h1>

			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				{isZh
					? '通过 instructions 配置，为 AI 注入系统级指导和页面级上下文，让它更好地理解你的业务场景。'
					: 'Use the instructions config to inject system-level directives and page-specific context, helping the AI better understand your application.'}
			</p>

			{/* System Instructions */}
			<section className="mb-12">
				<Heading id="system-instructions" level={2} className="text-3xl font-bold mb-6">
					{isZh ? '系统级指导 (System Instructions)' : 'System Instructions'}
				</Heading>

				<p className="text-gray-600 dark:text-gray-300 mb-6">
					{isZh
						? '全局提示词，应用于所有任务。定义 AI 的角色、工作风格和行为边界。'
						: "Global directives applied to all tasks. Define the AI's role, working style, and behavioral boundaries."}
				</p>

				<CodeEditor
					className="mb-6"
					code={`const agent = new PageAgent({
  // ...other config
  instructions: {
    system: \`
You are a professional e-commerce assistant.

Guidelines:
- Always confirm before submitting orders
- Double-check prices and quantities
- Report errors immediately instead of retrying blindly
\`
  }
})`}
				/>
			</section>

			{/* Page Instructions */}
			<section className="mb-12">
				<Heading id="page-instructions" level={2} className="text-3xl font-bold mb-6">
					{isZh ? '页面级指导 (Page Instructions)' : 'Page Instructions'}
				</Heading>

				<p className="text-gray-600 dark:text-gray-300 mb-6">
					{isZh
						? '动态回调函数，在每个 step 执行前调用，根据当前页面 URL 返回特定提示词。适用于为不同页面提供针对性的操作引导。'
						: 'A dynamic callback invoked before each step. Returns page-specific instructions based on the current URL. Useful for providing targeted guidance on different pages.'}
				</p>

				<CodeEditor
					className="mb-6"
					code={`const agent = new PageAgent({
  // ...other config
  instructions: {
    system: 'You are an order management assistant.',

    getPageInstructions: (url) => {
      if (url.includes('/checkout')) {
        return \`
This is the checkout page.
- Verify shipping address before proceeding
- Check if any discounts are applied
- Confirm the total amount with the user
\`
      }

      if (url.includes('/products')) {
        return \`
This is the product listing page.
- Use filters to narrow down search results
- Check stock availability before adding to cart
\`
      }

      return undefined // No special instructions for other pages
    }
  }
})`}
				/>
			</section>

			{/* How It Works */}
			<section className="mb-12">
				<Heading id="how-it-works" level={2} className="text-3xl font-bold mb-6">
					{isZh ? '工作原理' : 'How It Works'}
				</Heading>

				<p className="text-gray-600 dark:text-gray-300 mb-4">
					{isZh
						? '在每个执行步骤之前，page-agent 会将 instructions 拼接到用户提示词中：'
						: 'Before each execution step, page-agent prepends the instructions to the user prompt:'}
				</p>

				<CodeEditor
					language="xml"
					className="mb-6"
					code={`<instructions>
<system_instructions>
You are a professional e-commerce assistant.
...
</system_instructions>
<page_instructions>
This is the checkout page.
...
</page_instructions>
</instructions>

<!-- followed by agent state, history, and browser state -->`}
				/>

				<ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
					<li>
						{isZh
							? '如果 system 为空，则不输出 <system_instructions> 标签'
							: 'If system is empty, the <system_instructions> tag is omitted'}
					</li>
					<li>
						{isZh
							? '如果 getPageInstructions 返回空值，则不输出 <page_instructions> 标签'
							: 'If getPageInstructions returns empty, the <page_instructions> tag is omitted'}
					</li>
				</ul>
			</section>
		</div>
	)
}
