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
					<Heading id="zod-version" className="text-2xl font-bold mb-4">
						{isZh ? 'Zod 版本' : 'Zod Version'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? 'Page Agent 使用 Zod 定义工具的输入 schema。支持 Zod 3 (>=3.25.0) 和 Zod 4，请从 zod/v4 子路径导入。不支持 Zod Mini。'
							: 'Page Agent uses Zod for tool input schemas. Both Zod 3 (>=3.25.0) and Zod 4 are supported. Always import from the zod/v4 subpath. Zod Mini is not supported.'}
					</p>
					<CodeEditor
						code={`// Zod 3 (>=3.25.0) or Zod 4
import { z } from 'zod/v4'`}
						language="javascript"
					/>
				</section>

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
						code={`import { z } from 'zod/v4'
import { PageAgent, tool } from 'page-agent'

const pageAgent = new PageAgent({
  customTools: {
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
					<Heading id="approval-required" className="text-2xl font-bold mb-4">
						{isZh ? '工具审批' : 'Tool Approval'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '高风险工具可以直接在工具定义上声明 requiresApproval。使用内置 Panel 时，Page Agent 会自动显示 Approve / Deny UI，并在用户确认前暂停执行。'
							: 'High-risk tools can declare requiresApproval directly in the tool definition. When you use the built-in Panel, Page Agent automatically renders an Approve / Deny UI and pauses execution until the user decides.'}
					</p>

					<CodeEditor
						code={`import { z } from 'zod/v4'
import { PageAgent, tool } from 'page-agent'

const pageAgent = new PageAgent({
  customTools: {
    send_email: tool({
      description: 'Send an outbound email to the current customer.',
      requiresApproval: {
        title: 'Email approval required',
        message: 'This action will send a real email.',
      },
      inputSchema: z.object({
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
      }),
      execute: async function (input) {
        await fetch('/api/send-email', {
          method: 'POST',
          body: JSON.stringify(input),
        })
        return 'Email sent successfully.'
      },
    }),
  },
})`}
						language="javascript"
					/>
				</section>

				<section>
					<Heading id="approval-flow" className="text-2xl font-bold mb-4">
						{isZh ? '审批流程如何工作' : 'How Approval Works'}
					</Heading>
					<div className="space-y-3 text-gray-600 dark:text-gray-300">
						<p>
							{isZh
								? '1. LLM 选择某个带有 requiresApproval 的工具。'
								: '1. The LLM selects a tool marked with requiresApproval.'}
						</p>
						<p>
							{isZh
								? '2. PageAgent 在真正执行工具前触发审批。'
								: '2. PageAgent intercepts the tool before it actually runs.'}
						</p>
						<p>
							{isZh
								? '3. 如果你使用内置 Panel，面板会自动显示工具名、描述、输入参数和 Approve / Deny 按钮。'
								: '3. If you use the built-in Panel, the panel automatically shows the tool name, description, input payload, and Approve / Deny buttons.'}
						</p>
						<p>
							{isZh
								? '4. Approve 后工具继续执行；Deny 后工具不会执行，Agent 会收到拒绝结果并继续下一步推理。'
								: '4. Approve lets the tool continue; Deny prevents execution and returns a rejection result back to the agent for the next reasoning step.'}
						</p>
					</div>
				</section>

				<section>
					<Heading id="headless-approval" className="text-2xl font-bold mb-4">
						{isZh ? '无内置 Panel 时' : 'Without the Built-in Panel'}
					</Heading>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{isZh
							? '如果你不使用内置 Panel，也可以自己接管审批。设置 agent.onApproveTool 返回 true / false 即可。'
							: 'If you do not use the built-in Panel, you can handle approval yourself by setting agent.onApproveTool and returning true or false.'}
					</p>

					<CodeEditor
						code={`pageAgent.onApproveTool = async (request) => {
  return window.confirm(
    [
      request.title || 'Allow this tool to run?',
      \`Tool: \${request.toolName}\`,
      \`Description: \${request.description}\`,
      JSON.stringify(request.input, null, 2),
    ].join('\\n\\n')
  )
}`}
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
