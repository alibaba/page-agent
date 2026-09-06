import { PDF_NET_OPERATOR_PLAYBOOK } from './pdf-net-playbook.js'

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/

export class ResumableTaskRunner {
	constructor({ hub, workspace, llmConfig = {} } = {}) {
		if (!hub) throw new Error('A PageAgent hub is required')
		if (!workspace) throw new Error('A PDF workspace is required')
		this.hub = hub
		this.workspace = workspace
		this.llmConfig = llmConfig
		this.configPending = Object.keys(llmConfig).length > 0
	}

	async execute({ task, jobId, autoResume = true }) {
		if (!task?.trim()) throw new Error('Task is required')
		const resumeContext = autoResume ? await this.workspace.buildResumeContext(jobId) : ''
		const resolvedJobId =
			autoResume && resumeContext
				? jobId || resumeContext.match(/^PDF JOB\s+(\S+)/m)?.[1]
				: undefined
		const prompt = resumeContext
			? `${task.trim()}\n\n<durable_pdf_resume>\n${resumeContext}\n</durable_pdf_resume>\n\n${PDF_NET_OPERATOR_PLAYBOOK}`
			: task.trim()

		const config = this.configPending ? this.llmConfig : undefined
		const result = await this.hub.executeTask(prompt, config)
		if (config) {
			this.configPending = false
		}

		if (resolvedJobId) {
			if (result.success) {
				const completion = parseCompletionEvidence(result.data)
				if (completion.error) {
					await this.workspace.checkpoint(resolvedJobId, {
						error: 'Browser completion evidence was missing or malformed.',
						nextAction:
							'Verify and download the edited PDF, then report artifactPath and completedOperationIds. Do not advance or mark the browser step complete without that evidence.',
					})
				} else {
					try {
						await this.workspace.checkpointBrowserCompletion(resolvedJobId, completion.evidence)
					} catch {
						await this.workspace.checkpoint(resolvedJobId, {
							error:
								'Browser completion evidence did not match the current pending operations or artifact policy.',
							nextAction:
								'Obtain and validate the downloaded PDF artifact plus exact current pending operation IDs before advancing this checkpoint.',
						})
					}
				}
			} else if (result.reason === 'user_stop') {
				await this.workspace.pause(
					resolvedJobId,
					'PageAgent was deliberately stopped by the user; explicit resume is required.'
				)
			} else {
				await this.workspace.checkpoint(resolvedJobId, {
					error:
						'PageAgent stopped before completion; inspect the immediate tool result for details.',
					nextAction:
						'Retry PageAgent from the previous durable checkpoint and inspect the bounded error history for diagnostics.',
				})
			}
		}
		return result
	}

	async continueJob(jobId) {
		const context = await this.workspace.buildResumeContext(jobId, { includePaused: true })
		if (!context) throw new Error('No active PDF job is available to resume')
		const resolvedJobId = jobId || context.match(/^PDF JOB\s+(\S+)/m)?.[1]
		await this.workspace.resume(resolvedJobId)
		const nextAction = context.match(/^Next action:\s*(.+)$/m)?.[1] || 'Continue the PDF job.'
		return this.execute({
			task: `Resume the active PDF editing workflow. Perform only this bounded unit: ${nextAction}`,
			jobId: resolvedJobId,
		})
	}
}

function truncate(value, limit = 2000) {
	const text = String(value || '')
	return text.length <= limit ? text : `${text.slice(0, limit)}…`
}

function parseCompletionEvidence(value) {
	let evidence
	try {
		evidence = typeof value === 'string' ? JSON.parse(value) : value
	} catch {
		return {
			error: 'PageAgent success requires JSON artifactPath and completedOperationIds evidence.',
		}
	}
	const artifactPath = evidence?.artifactPath
	const completedOperationIds = evidence?.completedOperationIds
	const summary = evidence?.summary
	if (
		!evidence ||
		typeof evidence !== 'object' ||
		Array.isArray(evidence) ||
		typeof artifactPath !== 'string' ||
		!artifactPath.trim() ||
		artifactPath.length > 4096 ||
		CONTROL_CHARACTER_PATTERN.test(artifactPath) ||
		!Array.isArray(completedOperationIds) ||
		completedOperationIds.length < 1 ||
		completedOperationIds.length > 20 ||
		completedOperationIds.some(
			(id) => typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(id)
		) ||
		new Set(completedOperationIds).size !== completedOperationIds.length ||
		(summary !== undefined &&
			(typeof summary !== 'string' ||
				summary.length > 2000 ||
				CONTROL_CHARACTER_PATTERN.test(summary)))
	) {
		return {
			error: 'PageAgent success requires valid artifactPath and completedOperationIds evidence.',
		}
	}
	return {
		evidence: {
			artifactPath: artifactPath.trim(),
			completedOperationIds,
			summary: summary || 'browser step completed',
		},
	}
}
