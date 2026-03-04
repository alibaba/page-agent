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
					? '通过注册自定义工具，扩展 AI Agent 的能力边界。使用 Zod 定义输入接口，让 AI 安全调用你的业务逻辑。'
					: 'Extend AI Agent capabilities by registering custom tools. Define input schemas with Zod for safe business logic invocation.'}
			</p>

			<div className="space-y-8">
				<section>
					<Heading id="define-tools" className="text-2xl font-bold mb-4">
						{isZh ? '定义工具' : 'Define Tools'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '使用 tool() 辅助函数定义自定义工具，每个工具包含 description、inputSchema 和 execute 三个属性。'
							: 'Use the tool() helper to define custom tools with description, inputSchema, and execute.'}
					</p>

					<CodeEditor
						code={`import { z } from 'zod'
import { PageAgent, tool } from 'page-agent'

const pageAgent = new PageAgent({
  customTools: {
  
	// 
    add_to_cart: tool({
      description: 'Add a product to the shopping cart by its product ID.',
      inputSchema: z.object({
        productId: z.string(),
        quantity: z.number().min(1).default(1),
      }),
      execute: async function (input) {
        await fetch('/api/cart', {
          method: 'POST',
          body: JSON.stringify(input),
        })
        return \`Added \${input.quantity}x \${input.productId} to cart.\`
      },
    }),

	// 
    search_knowledge_base: tool({
      description: 'Search the internal knowledge base and return relevant articles.',
      inputSchema: z.object({
        query: z.string(),
        limit: z.number().max(10).default(3),
      }),
      execute: async function (input) {
        const res = await fetch(
          \`/api/kb?q=\${encodeURIComponent(input.query)}&limit=\${input.limit}\`
        )
        const articles = await res.json()
        return JSON.stringify(articles)
      },
    }),
  },
})`}
						language="javascript"
					/>
				</section>

				<section>
					<Heading id="override-remove" className="text-2xl font-bold mb-4">
						{isZh ? '覆盖与移除内置工具' : 'Override & Remove Built-in Tools'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '使用相同的名称可以覆盖内置工具的行为，设置为 null 则完全移除该工具。'
							: 'Use the same name to override a built-in tool, or set it to null to remove it entirely.'}
					</p>

					<CodeEditor
						code={`const pageAgent = new PageAgent({
  customTools: {
    scroll: null, // remove scroll tool
    execute_javascript: null, // remove script execution
  },
})`}
						language="javascript"
					/>
				</section>
			</div>
		</div>
	)
}
