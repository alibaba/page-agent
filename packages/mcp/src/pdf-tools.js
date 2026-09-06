import path from 'node:path'

import { redactSecrets } from './pdf-job-utils.js'

const operationSchema = (z) => {
	const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/)
	const page = z.number().int().positive()
	const occurrence = z.number().int().min(1).max(100)
	const search = z.string().min(1).max(2000)
	const text = z.string().min(1).max(20_000)
	const optionalText = z.string().max(20_000)
	const coordinate = z.number().min(0).max(100_000).optional()
	const extent = z.number().positive().max(100_000).optional()
	const fontSize = z.number().min(1).max(200).optional()
	const color = z.array(z.number().min(0).max(1)).length(3).optional()
	const base = { id, page }
	return z.discriminatedUnion('type', [
		z
			.object({
				...base,
				type: z.literal('replace_text'),
				search,
				replacement: optionalText,
				occurrence,
				fontSize,
				color,
				fillColor: color,
			})
			.strict(),
		z
			.object({
				...base,
				type: z.literal('redact_text'),
				search,
				occurrence,
				fillColor: color,
			})
			.strict(),
		z
			.object({
				...base,
				type: z.literal('add_text'),
				text,
				x: coordinate,
				y: coordinate,
				width: extent,
				height: extent,
				fontSize,
				color,
			})
			.strict(),
		z.object({ ...base, type: z.literal('add_note'), text, x: coordinate, y: coordinate }).strict(),
		z.object({ ...base, type: z.literal('highlight_text'), search, occurrence }).strict(),
		z
			.object({
				...base,
				type: z.literal('rotate_page'),
				angle: z.union([z.literal(90), z.literal(180), z.literal(270)]),
			})
			.strict(),
	])
}

function summary(workspace, state) {
	const counts = state.operations.reduce((groups, operation) => {
		groups[operation.status] ||= []
		groups[operation.status].push(operation)
		return groups
	}, {})
	return {
		jobId: state.jobId,
		status: state.status,
		revision: state.revision,
		pageCount: state.source.pageCount,
		currentVersion: state.currentVersion,
		workingPdf: state.workingPdf,
		memoryFile: path.join(workspace.jobDirectory(state.jobId), 'memory.md'),
		completedPages: state.completedPageRanges,
		pendingPages: state.pendingPageRanges,
		operations: Object.fromEntries(
			Object.entries(counts).map(([status, operations]) => [status, operations.length])
		),
		nextAction: state.nextAction,
		validation: state.validation,
	}
}

function text(value, isError = false) {
	return {
		content: [
			{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) },
		],
		...(isError ? { isError: true } : {}),
	}
}

function safe(handler) {
	return async (input) => {
		try {
			return await handler(input)
		} catch (error) {
			return text(`Error: ${redactSecrets(error.message)}`, true)
		}
	}
}

export function registerPdfTools(mcpServer, { z, workspace, runner }) {
	const jobId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/)
	const note = z.string().max(20_000)
	mcpServer.registerTool(
		'pdf_create_job',
		{
			description: 'Create a durable, resumable PDF editing job and page manifest.',
			inputSchema: {
				sourcePath: z.string().describe('Absolute path to the source PDF.'),
				instructions: z.string().min(1).max(20_000).describe('Complete editing requirements.'),
				jobId: jobId.optional(),
			},
		},
		safe(async (input) => text(summary(workspace, await workspace.createJob(input))))
	)

	mcpServer.registerTool(
		'pdf_job_status',
		{
			description: 'Read compact durable state for a PDF job; defaults to the active job.',
			inputSchema: { jobId: jobId.optional() },
		},
		safe(async ({ jobId }) => {
			const state = jobId ? await workspace.getJob(jobId) : await workspace.getActiveJob()
			return state ? text(summary(workspace, state)) : text('No active PDF job.')
		})
	)

	mcpServer.registerTool(
		'pdf_queue_operations',
		{
			description:
				'Queue idempotent, page-scoped PDF edits. Reusing an ID with changed data is rejected.',
			inputSchema: { jobId, operations: z.array(operationSchema(z)).min(1).max(100) },
		},
		safe(async ({ jobId, operations }) =>
			text(summary(workspace, await workspace.queueOperations(jobId, operations)))
		)
	)

	mcpServer.registerTool(
		'pdf_apply_next_batch',
		{
			description: 'Apply and validate the next bounded operation batch as one atomic PDF version.',
			inputSchema: { jobId, limit: z.number().int().min(1).max(20).optional() },
		},
		safe(async ({ jobId, limit }) =>
			text(summary(workspace, await workspace.applyNextBatch(jobId, { limit })))
		)
	)

	mcpServer.registerTool(
		'pdf_checkpoint',
		{
			description: 'Atomically record progress, an error/retry note, and the exact next action.',
			inputSchema: {
				jobId,
				note: note.optional(),
				error: note.optional(),
				nextAction: note.optional(),
			},
		},
		safe(async ({ jobId, ...update }) =>
			text(summary(workspace, await workspace.checkpoint(jobId, update)))
		)
	)

	mcpServer.registerTool(
		'pdf_resume_job',
		{
			description:
				'Return the compact resume context or automatically execute its exact next browser action.',
			inputSchema: { jobId: jobId.optional(), executeBrowserStep: z.boolean().optional() },
		},
		safe(async ({ jobId, executeBrowserStep = false }) => {
			if (executeBrowserStep) return text(await runner.continueJob(jobId))
			const context = await workspace.buildResumeContext(jobId)
			return text(context || 'No active PDF job is available to resume.')
		})
	)

	mcpServer.registerTool(
		'pdf_complete_job',
		{
			description:
				'Mark a fully applied and validated PDF job complete and clear the active pointer.',
			inputSchema: { jobId, note: note.optional() },
		},
		safe(async ({ jobId, note }) => text(summary(workspace, await workspace.complete(jobId, note))))
	)
}
