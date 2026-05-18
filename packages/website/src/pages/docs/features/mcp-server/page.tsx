import BetaNotice from '@/components/BetaNotice'
import CodeEditor from '@/components/CodeEditor'
import { Heading } from '@/components/Heading'

export default function McpServerPage() {
	return (
		<div>
			<h1 className="text-4xl font-bold mb-6">MCP Server (Beta)</h1>
			<BetaNotice />
			<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
				Use the MCP server to let your local agent send natural-language browser tasks to Page Agent
				Ext.
			</p>

			<section className="mb-10">
				<Heading id="quick-start" className="text-2xl font-bold mb-4">
					How to use
				</Heading>
				<div className="space-y-4">
					<div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
						<p className="text-sm text-blue-900 dark:text-blue-200 leading-7">
							1. Install Page Agent Ext in Chrome.
							<br />
							2. Add the MCP server to your local agent client.
							<br />
							3. Start the client and approve the Hub connection in the browser when prompted.
							<br />
							4. Ask your agent to do something in the browser. The client will call execute_task
							for you.
						</p>
					</div>

					<CodeEditor
						code={`{
  "mcpServers": {
    "page-agent": {
      "command": "npx",
      "args": ["-y", "@page-agent/mcp"],
      "env": {
        "LLM_BASE_URL": "https://api.openai.com/v1",
        "LLM_API_KEY": "sk-xxx",
        "LLM_MODEL_NAME": "gpt-5.2"
      }
    }
  }
}`}
						language="json"
					/>
				</div>
			</section>

			<section className="mb-10">
				<Heading id="the-hub" className="text-2xl font-bold mb-4">
					The Hub
				</Heading>

				<p className="text-gray-700 dark:text-gray-300 leading-relaxed">
					The Hub is the control center for communication between Page Agent Ext and external
					callers.
				</p>
				<p className="text-gray-700 dark:text-gray-300 leading-relaxed">
					When the MCP server starts, it opens a local launcher page. The launcher asks the
					extension to open the Hub tab, and the Hub receives tasks from your local agent. MCP uses
					this path, but the Hub itself is the extension's general external communication entry
					point.
				</p>
			</section>
		</div>
	)
}
