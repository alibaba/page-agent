import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import { PyMuPdfBackend } from '../src/pymupdf-backend.js'

const run = promisify(execFile)
const python =
	process.env.PDF_PYTHON ||
	path.join(process.env.HOME || '', '.hermes', 'tools-venvs', 'pageagent-pdf', 'bin', 'python')

function parsed(result) {
	return JSON.parse(result.content[0].text)
}

test('MCP protocol exposes and executes the durable 21-page PDF workflow', async (t) => {
	try {
		await run(python, ['-c', 'import pymupdf'])
	} catch {
		t.skip(`PyMuPDF unavailable in ${python}`)
		return
	}
	const directory = await mkdtemp(path.join(tmpdir(), 'page-agent-mcp-integration-'))
	const source = path.join(directory, 'source.pdf')
	await run(python, [
		'-c',
		[
			'import pymupdf, sys',
			'doc=pymupdf.open()',
			'[(lambda p,n: p.insert_text((72,72), f"Page {n} original MCP text"))(doc.new_page(), n) for n in range(1,22)]',
			'doc.save(sys.argv[1])',
		].join(';'),
		source,
	])

	const cleanEnvironment = Object.fromEntries(
		Object.entries(process.env).filter(([, value]) => typeof value === 'string')
	)
	const serverEnvironment = {
		...cleanEnvironment,
		PAGE_AGENT_NO_LAUNCH: '1',
		PDF_PYTHON: python,
		PDF_WORKSPACE_ROOT: path.join(directory, 'jobs'),
	}
	const connectClient = async () => {
		const transport = new StdioClientTransport({
			command: process.execPath,
			args: [path.resolve('src/index.js')],
			env: { ...serverEnvironment, PORT: String(41_000 + Math.floor(Math.random() * 10_000)) },
			stderr: 'pipe',
		})
		const connected = new Client({ name: 'pdf-integration-test', version: '1.0.0' })
		await connected.connect(transport)
		return connected
	}
	let client = await connectClient()
	t.after(async () => client?.close())

	const tools = await client.listTools()
	const names = new Set(tools.tools.map((tool) => tool.name))
	for (const name of [
		'pdf_create_job',
		'pdf_job_status',
		'pdf_queue_operations',
		'pdf_apply_next_batch',
		'pdf_checkpoint',
		'pdf_resume_job',
		'pdf_complete_job',
	]) {
		assert.ok(names.has(name), `missing MCP tool ${name}`)
	}

	const created = parsed(
		await client.callTool({
			name: 'pdf_create_job',
			arguments: {
				sourcePath: source,
				instructions: 'Update page 17 and preserve all 21 pages.',
				jobId: 'mcp-e2e',
			},
		})
	)
	assert.equal(created.pageCount, 21)
	assert.equal(created.pendingPages, '1-21')

	await client.callTool({
		name: 'pdf_queue_operations',
		arguments: {
			jobId: 'mcp-e2e',
			operations: [
				{
					id: 'replace-p17',
					type: 'replace_text',
					page: 17,
					search: 'original MCP text',
					replacement: 'updated through MCP',
					occurrence: 1,
				},
			],
		},
	})
	const applied = parsed(
		await client.callTool({
			name: 'pdf_apply_next_batch',
			arguments: { jobId: 'mcp-e2e', limit: 5 },
		})
	)
	assert.equal(applied.currentVersion, 1)
	assert.ok(applied.validation.checks.every((check) => check.passed))

	const status = parsed(
		await client.callTool({ name: 'pdf_job_status', arguments: { jobId: 'mcp-e2e' } })
	)
	assert.equal(status.operations.completed, 1)
	const inspected = await new PyMuPdfBackend({ python }).inspect(status.workingPdf)
	assert.match(inspected.pages[16].text, /updated through MCP/)
	assert.equal(inspected.pageCount, 21)

	await client.close()
	client = await connectClient()
	const resumed = parsed(await client.callTool({ name: 'pdf_job_status', arguments: {} }))
	assert.equal(resumed.jobId, 'mcp-e2e')
	assert.equal(resumed.currentVersion, 1)
	assert.equal(resumed.nextAction, 'Validate the edited PDF and mark the job complete.')
})
