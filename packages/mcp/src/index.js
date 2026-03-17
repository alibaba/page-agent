#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { exec } from 'node:child_process'
import { platform } from 'node:os'
import * as z from 'zod/v4'

import { HubBridge } from './hub-bridge.js'

const env = process.env
const port = parseInt(env.PORT || '38401')

/** @type {Record<string, string>} */
const llmConfig = {}
if (env.LLM_API_KEY) llmConfig.apiKey = env.LLM_API_KEY
if (env.LLM_BASE_URL) llmConfig.baseURL = env.LLM_BASE_URL
if (env.LLM_MODEL_NAME) llmConfig.model = env.LLM_MODEL_NAME

// --- Hub bridge (HTTP + WebSocket) ---

const hub = new HubBridge(port)
await hub.start()

// Open launcher in default browser
const url = `http://localhost:${port}`
const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start ""' : 'xdg-open'
exec(`${cmd} "${url}"`, (err) => {
	if (err) console.error(`[page-agent-mcp] Could not open browser: ${err.message}`)
})

// --- MCP server (stdio) ---

const mcpServer = new McpServer({ name: 'page-agent', version: '1.5.8' })

mcpServer.registerTool(
	'execute_task',
	{
		description:
			'Execute a browser automation task described in natural language. ' +
			'The Page Agent extension will control the browser to complete the task. ' +
			'Blocks until the task is complete.',
		inputSchema: { task: z.string().describe('Task description in natural language') },
	},
	async ({ task }) => {
		try {
			const config = Object.keys(llmConfig).length > 0 ? llmConfig : undefined
			const result = await hub.executeTask(task, config)
			return {
				content: [
					{
						type: 'text',
						text: result.success
							? `Task completed successfully.\n\n${result.data}`
							: `Task failed.\n\n${result.data}`,
					},
				],
			}
		} catch (err) {
			return {
				content: [{ type: 'text', text: `Error: ${err.message}` }],
				isError: true,
			}
		}
	}
)

mcpServer.registerTool(
	'get_status',
	{
		description: 'Check the current status of the Page Agent hub connection and agent.',
	},
	async () => ({
		content: [
			{
				type: 'text',
				text: JSON.stringify({ connected: hub.connected, busy: hub.busy }, null, 2),
			},
		],
	})
)

mcpServer.registerTool(
	'stop_task',
	{
		description: 'Stop the currently running browser automation task.',
	},
	async () => {
		hub.stopTask()
		return { content: [{ type: 'text', text: 'Stop signal sent.' }] }
	}
)

const transport = new StdioServerTransport()
await mcpServer.connect(transport)
console.error('[page-agent-mcp] MCP server ready (stdio)')
