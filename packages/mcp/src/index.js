#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { exec } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { platform } from 'node:os'
import * as z from 'zod/v4'

import { HubBridge } from './hub-bridge.js'
import { registerPdfTools } from './pdf-tools.js'
import { PdfWorkspace } from './pdf-workspace.js'
import { PyMuPdfBackend } from './pymupdf-backend.js'
import { ResumableTaskRunner } from './task-runner.js'

const env = process.env
const port = parseInt(env.PORT || '38401')
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

/** @type {Record<string, string>} */
const llmConfig = {}
if (env.LLM_BASE_URL) llmConfig.baseURL = env.LLM_BASE_URL
if (env.LLM_MODEL_NAME) llmConfig.model = env.LLM_MODEL_NAME
if (env.LLM_API_KEY) llmConfig.apiKey = env.LLM_API_KEY

// --- Hub bridge (HTTP + WebSocket) ---

const hub = new HubBridge(port)
await hub.start()
const pdfWorkspace = new PdfWorkspace({ backend: new PyMuPdfBackend() })
const taskRunner = new ResumableTaskRunner({ hub, workspace: pdfWorkspace, llmConfig })

// Open launcher in default browser
const url = `http://localhost:${port}`
const cmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start ""' : 'xdg-open'
if (env.PAGE_AGENT_NO_LAUNCH !== '1') {
	exec(`${cmd} "${url}"`, (err) => {
		if (err) console.error(`[page-agent-mcp] Could not open browser: ${err.message}`)
	})
}

// --- MCP server (stdio) ---

const mcpServer = new McpServer({ name: 'page-agent', version })

mcpServer.registerTool(
	'execute_task',
	{
		description:
			"Execute a task in the user's browser. Active PDF-job memory is injected automatically unless autoResume is false.",
		inputSchema: {
			task: z
				.string()
				.describe(
					'Task description. Give specific instructions, a bounded unit of work, and the information to return.'
				),
			jobId: z.string().optional().describe('PDF job to resume; defaults to the active job.'),
			autoResume: z
				.boolean()
				.optional()
				.describe('Set false for browser work unrelated to the active PDF job.'),
		},
	},
	async ({ task, jobId, autoResume = true }) => {
		try {
			const result = await taskRunner.execute({ task, jobId, autoResume })
			return {
				content: [
					{
						type: 'text',
						text: result.success
							? `Task completed.\n\n${result.data}`
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
		description: 'Check the current status of the Page Agent hub.',
	},
	async () => {
		const activeJob = await pdfWorkspace.getActiveJob()
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							connected: hub.connected,
							busy: hub.busy,
							activePdfJob: activeJob
								? { jobId: activeJob.jobId, nextAction: activeJob.nextAction }
								: null,
						},
						null,
						2
					),
				},
			],
		}
	}
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

registerPdfTools(mcpServer, { z, workspace: pdfWorkspace, runner: taskRunner })

const transport = new StdioServerTransport()
await mcpServer.connect(transport)
console.error('[page-agent-mcp] MCP server ready (stdio)')
