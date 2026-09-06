import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { constants, createReadStream } from 'node:fs'
import {
	copyFile,
	lstat,
	mkdir,
	open,
	readFile,
	readdir,
	realpath,
	rename,
	rm,
	stat,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import {
	assertJobId,
	atomicWrite,
	containsSecret,
	readJson,
	redactSecrets,
	renderMemory,
	stableStringify,
	summarizePages,
	writeJson,
} from './pdf-job-utils.js'

const OPERATION_TYPES = new Set([
	'replace_text',
	'redact_text',
	'add_text',
	'add_note',
	'highlight_text',
	'rotate_page',
])
const MAX_OPERATIONS_PER_QUEUE = 100
const MAX_OPERATIONS_PER_JOB = 100
const MAX_OPERATION_ATTEMPTS = 3
const MAX_PDF_BYTES = 512 * 1024 * 1024
const MAX_PDF_VERSIONS = 100
const MAX_WORKSPACE_BYTES = 4 * 1024 * 1024 * 1024
const MAX_HISTORY_ENTRIES = 100
const MAX_PAGES = 10_000
const MAX_INSTRUCTIONS_LENGTH = 20_000
const MAX_PAGE_TEXT_LENGTH = 5_000_000
const MAX_TOTAL_PAGE_TEXT_LENGTH = 50_000_000
const COMMON_OPERATION_FIELDS = new Set(['id', 'type', 'page'])
const OPERATION_FIELDS = {
	replace_text: new Set(['search', 'replacement', 'occurrence', 'fontSize', 'color', 'fillColor']),
	redact_text: new Set(['search', 'occurrence', 'fillColor']),
	add_text: new Set(['text', 'x', 'y', 'width', 'height', 'fontSize', 'color']),
	add_note: new Set(['text', 'x', 'y']),
	highlight_text: new Set(['search', 'occurrence']),
	rotate_page: new Set(['angle']),
}
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const execFileAsync = promisify(execFile)
const safeStoredText = (value) =>
	redactSecrets(String(value ?? '')).slice(0, MAX_INSTRUCTIONS_LENGTH)
const appendBounded = (items, item) => {
	items.push(item)
	if (items.length > MAX_HISTORY_ENTRIES) items.splice(0, items.length - MAX_HISTORY_ENTRIES)
}

export class PdfWorkspace {
	constructor({
		rootDir = process.env.PDF_WORKSPACE_ROOT || path.join(os.homedir(), '.page-agent', 'pdf-jobs'),
		backend,
		now = () => new Date(),
		idFactory = () => `pdf-${Date.now()}-${randomUUID().slice(0, 8)}`,
		allowedArtifactRoots,
		maxWorkspaceBytes = MAX_WORKSPACE_BYTES,
	} = {}) {
		if (!backend) throw new Error('A PDF backend is required')
		if (
			!Number.isSafeInteger(maxWorkspaceBytes) ||
			maxWorkspaceBytes < 1 ||
			maxWorkspaceBytes > MAX_WORKSPACE_BYTES
		) {
			throw new Error(`maxWorkspaceBytes must be between 1 and ${MAX_WORKSPACE_BYTES}`)
		}
		this.rootDir = path.resolve(rootDir)
		this.backend = backend
		this.now = now
		this.idFactory = idFactory
		this.maxWorkspaceBytes = maxWorkspaceBytes
		this.allowedArtifactRoots = (
			allowedArtifactRoots || [path.join(os.homedir(), 'Downloads'), os.tmpdir(), this.rootDir]
		).map((root) => path.resolve(root))
		this.processStartedAt = this.#processStartIdentity(process.pid)
	}

	jobDirectory(jobId) {
		return path.join(this.rootDir, assertJobId(jobId))
	}

	async createJob({ sourcePath, instructions, jobId = this.idFactory() }) {
		assertJobId(jobId)
		if (!instructions?.trim()) throw new Error('PDF edit instructions are required')
		if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
			throw new Error(`PDF edit instructions exceed ${MAX_INSTRUCTIONS_LENGTH} characters`)
		}
		const resolvedSource = await realpath(path.resolve(sourcePath))
		if (containsSecret({ sourcePath: resolvedSource, workspaceRoot: this.rootDir })) {
			throw new Error('PDF source and workspace paths must not contain credential-like values')
		}
		const sourceInfo = await stat(resolvedSource)
		if (
			!sourceInfo.isFile() ||
			sourceInfo.size < 1 ||
			path.extname(resolvedSource).toLowerCase() !== '.pdf'
		) {
			throw new Error('sourcePath must be a nonempty regular PDF file')
		}
		if (sourceInfo.size > MAX_PDF_BYTES)
			throw new Error(`Source PDF exceeds ${MAX_PDF_BYTES} bytes`)

		await mkdir(this.rootDir, { recursive: true, mode: 0o700 })
		const jobDir = this.jobDirectory(jobId)
		try {
			await mkdir(jobDir, { mode: 0o700 })
		} catch (error) {
			if (error.code === 'EEXIST') throw new Error(`PDF job already exists: ${jobId}`)
			throw error
		}

		const sourceCopy = path.join(jobDir, 'source.pdf')
		const versionsDir = path.join(jobDir, 'versions')
		const pagesDir = path.join(jobDir, 'pages')
		await mkdir(versionsDir, { recursive: true, mode: 0o700 })
		await mkdir(pagesDir, { recursive: true, mode: 0o700 })
		await copyFile(resolvedSource, sourceCopy)
		await this.#syncFile(sourceCopy)
		const initialVersion = path.join(versionsDir, 'version-0000.pdf')
		await copyFile(sourceCopy, initialVersion)
		await this.#syncFile(initialVersion)
		await this.#syncDirectory(versionsDir)
		await this.#syncDirectory(jobDir)

		const inspection = await this.backend.inspect(sourceCopy)
		if (inspection.encrypted === true) {
			throw new Error('Encrypted PDFs are not supported')
		}
		if (
			!Number.isInteger(inspection.pageCount) ||
			inspection.pageCount < 1 ||
			inspection.pageCount > MAX_PAGES
		) {
			throw new Error('PDF backend returned an invalid page count')
		}
		if (!Array.isArray(inspection.pages) || inspection.pages.length !== inspection.pageCount) {
			throw new Error('PDF backend returned an incomplete page manifest')
		}
		const manifestPages = []
		const seenPages = new Set()
		let totalPageTextLength = 0
		for (const pageInfo of inspection.pages) {
			if (
				!Number.isInteger(pageInfo.page) ||
				pageInfo.page < 1 ||
				pageInfo.page > inspection.pageCount ||
				seenPages.has(pageInfo.page) ||
				!Number.isFinite(pageInfo.width) ||
				pageInfo.width <= 0 ||
				!Number.isFinite(pageInfo.height) ||
				pageInfo.height <= 0
			) {
				throw new Error('PDF backend returned invalid page metadata')
			}
			seenPages.add(pageInfo.page)
			if (pageInfo.text !== undefined && typeof pageInfo.text !== 'string') {
				throw new Error(`Page ${pageInfo.page} extracted text must be a string`)
			}
			const pageText = pageInfo.text || ''
			if (pageText.length > MAX_PAGE_TEXT_LENGTH) {
				throw new Error(`Page ${pageInfo.page} extracted text exceeds the safety limit`)
			}
			totalPageTextLength += pageText.length
			if (totalPageTextLength > MAX_TOTAL_PAGE_TEXT_LENGTH) {
				throw new Error(`Extracted page text exceeds ${MAX_TOTAL_PAGE_TEXT_LENGTH} characters`)
			}
			const textName = `${String(pageInfo.page).padStart(4, '0')}.txt`
			await atomicWrite(path.join(pagesDir, textName), pageText)
			manifestPages.push({
				page: pageInfo.page,
				width: pageInfo.width,
				height: pageInfo.height,
				charCount: pageText.length,
				textPath: path.join('pages', textName),
				snippet: pageText.replace(/\s+/g, ' ').slice(0, 240),
			})
		}
		await writeJson(path.join(jobDir, 'manifest.json'), {
			schemaVersion: 1,
			pageCount: inspection.pageCount,
			pages: manifestPages,
		})

		const timestamp = this.now().toISOString()
		const sourceSha256 = await this.#sha256(sourceCopy)
		const state = {
			schemaVersion: 1,
			jobId,
			status: 'active',
			revision: 1,
			createdAt: timestamp,
			updatedAt: timestamp,
			instructions: redactSecrets(instructions.trim()),
			source: {
				path: resolvedSource,
				sha256: sourceSha256,
				pageCount: inspection.pageCount,
			},
			currentVersion: 0,
			workingPdf: initialVersion,
			completedPageRanges: 'none',
			pendingPageRanges: `1-${inspection.pageCount}`,
			operations: [],
			artifacts: [
				{ type: 'source', path: sourceCopy, sha256: sourceSha256 },
				{ type: 'pdf', path: initialVersion, version: 0, sha256: sourceSha256 },
			],
			validation: { checks: [], lastRunAt: null },
			notes: [],
			errors: [],
			nextAction: 'Queue structured PDF edit operations, then apply the next bounded batch.',
		}
		await this.#persist(state)
		await this.#withActivePointerLock(() =>
			writeJson(path.join(this.rootDir, 'active-job.json'), { jobId })
		)
		return state
	}

	async getJob(jobId) {
		const state = await this.#readState(jobId)
		const interrupted = state.operations.filter((operation) => operation.status === 'running')
		if (interrupted.length === 0) return state
		const lockOwner = await this.#readLockOwner(path.join(this.jobDirectory(jobId), '.state.lock'))
		if (await this.#lockOwnerIsAlive(lockOwner)) return state
		return this.#withJobLock(jobId, async () => {
			const current = await this.#readState(jobId)
			const abandoned = current.operations.filter((operation) => operation.status === 'running')
			await this.#cleanupOrphanedVersions(jobId, current)
			for (const operation of abandoned) {
				operation.status = 'pending'
				operation.lastError = 'Recovered after an interrupted MCP process.'
			}
			if (abandoned.length > 0) {
				appendBounded(current.errors, {
					at: this.now().toISOString(),
					message: 'Recovered interrupted operations.',
				})
				current.nextAction = 'Retry the recovered pending operation batch.'
				await this.#touchAndPersist(current)
			}
			return current
		})
	}

	async getActiveJob({ includePaused = false } = {}) {
		return this.#withActivePointerLock(async () => {
			const pointerPath = path.join(this.rootDir, 'active-job.json')
			try {
				const pointer = await readJson(pointerPath)
				const state = await this.getJob(pointer.jobId)
				if (state.status === 'active' || (includePaused && state.status === 'paused')) return state
				if (state.status === 'paused') return null
				const current = await readJson(pointerPath)
				if (current.jobId === pointer.jobId) await rm(pointerPath, { force: true })
				return null
			} catch (error) {
				if (error.code === 'ENOENT') return null
				throw error
			}
		})
	}

	async queueOperations(jobId, operations) {
		if (
			!Array.isArray(operations) ||
			operations.length === 0 ||
			operations.length > MAX_OPERATIONS_PER_QUEUE
		) {
			throw new Error(`Between 1 and ${MAX_OPERATIONS_PER_QUEUE} PDF operations are required`)
		}
		return this.#withJobLock(jobId, async () => {
			const state = await this.#readState(jobId)
			if (state.status !== 'active') throw new Error(`PDF job is not active: ${jobId}`)
			const normalized = operations.map((candidate) =>
				this.#normalizeOperation(candidate, state.source.pageCount)
			)
			const additions = []
			const comparable = ({
				status,
				attempts,
				createdAt,
				completedAt,
				lastError,
				outputVersion,
				...rest
			}) => rest
			for (const operation of normalized) {
				const existing =
					state.operations.find((item) => item.id === operation.id) ||
					additions.find((item) => item.id === operation.id)
				if (existing) {
					if (stableStringify(comparable(existing)) !== stableStringify(comparable(operation))) {
						throw new Error(`operation ID conflict: ${operation.id}`)
					}
					continue
				}
				additions.push(operation)
			}
			if (state.operations.length + additions.length > MAX_OPERATIONS_PER_JOB) {
				throw new Error(`A PDF job may contain at most ${MAX_OPERATIONS_PER_JOB} operations`)
			}
			state.operations.push(...additions)
			state.nextAction = `Apply the next pending operation batch (${state.operations.filter((item) => item.status === 'pending').length} pending).`
			this.#updateRanges(state)
			await this.#touchAndPersist(state)
			return state
		})
	}

	async checkpoint(jobId, { note, nextAction, error } = {}) {
		for (const [label, value] of Object.entries({ note, nextAction, error })) {
			if (value !== undefined && typeof value !== 'string') {
				throw new Error(`Checkpoint ${label} must be a string`)
			}
			if (value?.length > MAX_INSTRUCTIONS_LENGTH) {
				throw new Error(`Checkpoint ${label} exceeds ${MAX_INSTRUCTIONS_LENGTH} characters`)
			}
		}
		return this.#withJobLock(jobId, async () => {
			const state = await this.#readState(jobId)
			const timestamp = this.now().toISOString()
			if (note) appendBounded(state.notes, { at: timestamp, message: safeStoredText(note) })
			if (error) appendBounded(state.errors, { at: timestamp, message: safeStoredText(error) })
			if (nextAction) state.nextAction = safeStoredText(nextAction)
			await this.#touchAndPersist(state)
			return state
		})
	}

	async checkpointBrowserCompletion(
		jobId,
		{ artifactPath, completedOperationIds, summary = 'browser step completed' } = {}
	) {
		if (
			typeof artifactPath !== 'string' ||
			!artifactPath.trim() ||
			artifactPath.length > 4096 ||
			!Array.isArray(completedOperationIds) ||
			completedOperationIds.length < 1 ||
			completedOperationIds.length > 20 ||
			completedOperationIds.some(
				(id) => typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(id)
			) ||
			new Set(completedOperationIds).size !== completedOperationIds.length ||
			typeof summary !== 'string' ||
			summary.length > 2000
		) {
			throw new Error('Invalid browser completion evidence')
		}
		const openedArtifact = await this.#openAllowedBrowserArtifact(artifactPath.trim())
		try {
			return await this.#withJobLock(jobId, async () => {
				const state = await this.#readState(jobId)
				if (state.status !== 'active') throw new Error(`PDF job is not active: ${jobId}`)
				const pendingIds = new Set(
					state.operations.filter((operation) => operation.status === 'pending').map(({ id }) => id)
				)
				if (completedOperationIds.some((id) => !pendingIds.has(id))) {
					throw new Error('Browser completion IDs must identify only current pending operations')
				}
				if (state.currentVersion >= MAX_PDF_VERSIONS) {
					throw new Error(`PDF job reached the ${MAX_PDF_VERSIONS}-version limit`)
				}
				await this.#cleanupOrphanedVersions(jobId, state)
				const recoveryState = structuredClone(state)
				const nextVersion = state.currentVersion + 1
				const versionsDir = path.join(this.jobDirectory(jobId), 'versions')
				const finalPath = path.join(
					versionsDir,
					`version-${String(nextVersion).padStart(4, '0')}.pdf`
				)
				const temporaryPath = `${finalPath}.${randomUUID()}.browser.tmp.pdf`
				let promoted = false
				try {
					await this.#copyOpenFile(openedArtifact, temporaryPath)
					const snapshotInfo = await stat(temporaryPath)
					if (
						!snapshotInfo.isFile() ||
						snapshotInfo.size < 1 ||
						snapshotInfo.size > MAX_PDF_BYTES
					) {
						throw new Error('Copied browser artifact failed its size check')
					}
					const workspaceBytes = await this.#artifactBytes(state)
					if (workspaceBytes + snapshotInfo.size > this.maxWorkspaceBytes) {
						throw new Error(`PDF job workspace exceeds ${this.maxWorkspaceBytes} bytes`)
					}
					const inspection = await this.backend.inspect(temporaryPath)
					if (inspection.encrypted === true) {
						throw new Error('Encrypted browser artifacts are not supported')
					}
					if (inspection.pageCount !== state.source.pageCount) {
						throw new Error('Browser artifact changed the PDF page count')
					}
					const outputSha256 = await this.#sha256(temporaryPath)
					await rename(temporaryPath, finalPath)
					promoted = true
					await this.#syncDirectory(versionsDir)
					const completedAt = this.now().toISOString()
					for (const operation of state.operations) {
						if (!completedOperationIds.includes(operation.id)) continue
						operation.status = 'completed'
						operation.completedAt = completedAt
						operation.outputVersion = nextVersion
					}
					state.currentVersion = nextVersion
					state.workingPdf = finalPath
					state.validation = {
						pageCount: inspection.pageCount,
						checks: [
							{ name: 'openable', passed: true },
							{ name: 'page_count_preserved', passed: true },
						],
						lastRunAt: completedAt,
					}
					state.artifacts.push({
						type: 'pdf',
						path: finalPath,
						version: nextVersion,
						sha256: outputSha256,
					})
					appendBounded(state.notes, {
						at: completedAt,
						message: `Validated PageAgent browser artifact promoted for completed operations: ${completedOperationIds.join(', ')}.`,
					})
					this.#updateRanges(state)
					const pending = state.operations.filter(
						(operation) => operation.status === 'pending'
					).length
					state.nextAction = pending
						? `Continue with the next bounded PDF operation batch (${pending} operations remain).`
						: 'Validate the edited PDF and mark the job complete.'
					await this.#touchAndPersist(state)
					return state
				} catch (error) {
					Object.assign(state, recoveryState)
					if (promoted) {
						try {
							await this.#persist(state)
						} catch (recoveryError) {
							let persistedState
							try {
								persistedState = await readJson(path.join(this.jobDirectory(jobId), 'state.json'))
							} catch {
								// Preserve the promoted artifact when authoritative recovery cannot be proven.
							}
							if (!persistedState || stableStringify(persistedState) !== stableStringify(state)) {
								throw new Error(
									`${error.message}; browser rollback state restoration failed: ${recoveryError.message}; promoted artifact preserved at ${finalPath}`
								)
							}
						}
					}
					let cleanupError = null
					for (const cleanupPath of [temporaryPath, ...(promoted ? [finalPath] : [])]) {
						try {
							await rm(cleanupPath, { force: true })
						} catch (candidateError) {
							cleanupError ||= candidateError
						}
					}
					if (cleanupError) {
						throw new Error(
							`${error.message}; browser artifact rollback cleanup failed: ${cleanupError.message}`
						)
					}
					throw error
				} finally {
					await rm(temporaryPath, { force: true }).catch(() => {})
				}
			})
		} finally {
			await openedArtifact.handle.close()
		}
	}

	async pause(jobId, note) {
		return this.#withJobLock(jobId, async () => {
			const state = await this.#readState(jobId)
			if (state.status === 'completed') throw new Error(`PDF job is already completed: ${jobId}`)
			state.status = 'paused'
			if (note) {
				appendBounded(state.notes, {
					at: this.now().toISOString(),
					message: safeStoredText(note),
				})
			}
			await this.#touchAndPersist(state)
			return state
		})
	}

	async resume(jobId) {
		return this.#withJobLock(jobId, async () => {
			const state = await this.#readState(jobId)
			if (state.status === 'completed') throw new Error(`PDF job is already completed: ${jobId}`)
			if (state.status === 'paused') {
				state.status = 'active'
				await this.#touchAndPersist(state)
			}
			return state
		})
	}

	async applyNextBatch(jobId, { limit = 5 } = {}) {
		if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
			throw new Error('Batch limit must be between 1 and 20')
		}
		return this.#withJobLock(jobId, async () => {
			const state = await this.#readState(jobId)
			if (state.status !== 'active') throw new Error(`PDF job is not active: ${jobId}`)
			const canonicalInput = await this.#canonicalJobFile(jobId, state.workingPdf, 'workingPdf')
			await this.#cleanupOrphanedVersions(jobId, state, canonicalInput.path)
			const pending = state.operations.filter((item) => item.status === 'pending')
			if (pending.length === 0) return state
			if (state.currentVersion >= MAX_PDF_VERSIONS) {
				throw new Error(`PDF job reached the ${MAX_PDF_VERSIONS}-version limit`)
			}
			const exhausted = pending.find((item) => item.attempts >= MAX_OPERATION_ATTEMPTS)
			if (exhausted) {
				throw new Error(
					`Operation ${exhausted.id} reached the retry limit (${MAX_OPERATION_ATTEMPTS})`
				)
			}
			const batch = pending.slice(0, limit)
			for (const operation of batch) {
				operation.status = 'running'
				operation.attempts += 1
				operation.lastError = null
			}
			state.nextAction = `Applying ${batch.length} operation(s) to version ${state.currentVersion}.`
			await this.#touchAndPersist(state)
			const recoveryState = structuredClone(state)

			const nextVersion = state.currentVersion + 1
			const versionsDir = path.join(this.jobDirectory(jobId), 'versions')
			const finalPath = path.join(
				versionsDir,
				`version-${String(nextVersion).padStart(4, '0')}.pdf`
			)
			const temporaryPath = `${finalPath}.${randomUUID()}.tmp.pdf`
			const inputSnapshotPath = path.join(versionsDir, `.${randomUUID()}.input.tmp.pdf`)
			try {
				const inputArtifact = state.artifacts.find((item) => item.path === state.workingPdf)
				await copyFile(canonicalInput.path, inputSnapshotPath, constants.COPYFILE_EXCL)
				await this.#syncFile(inputSnapshotPath)
				if (
					!inputArtifact?.sha256 ||
					(await this.#sha256(inputSnapshotPath)) !== inputArtifact.sha256
				) {
					throw new Error('Working PDF failed its integrity check before editing')
				}
				const validation = await this.backend.apply(inputSnapshotPath, temporaryPath, batch)
				this.#validateValidation(validation, true)
				await this.#syncFile(temporaryPath)
				const outputInfo = await stat(temporaryPath)
				if (!outputInfo.isFile() || outputInfo.size < 1 || outputInfo.size > MAX_PDF_BYTES) {
					throw new Error(`Generated PDF must contain between 1 and ${MAX_PDF_BYTES} bytes`)
				}
				const workspaceBytes = await this.#artifactBytes(state)
				if (workspaceBytes + outputInfo.size > this.maxWorkspaceBytes) {
					throw new Error(`PDF job workspace exceeds ${this.maxWorkspaceBytes} bytes`)
				}
				const outputSha256 = await this.#sha256(temporaryPath)
				await rename(temporaryPath, finalPath)
				await this.#syncDirectory(versionsDir)
				const completedAt = this.now().toISOString()
				for (const operation of batch) {
					operation.status = 'completed'
					operation.completedAt = completedAt
					operation.outputVersion = nextVersion
				}
				state.currentVersion = nextVersion
				state.workingPdf = finalPath
				state.validation = { ...validation, lastRunAt: completedAt }
				state.artifacts.push({
					type: 'pdf',
					path: finalPath,
					version: nextVersion,
					sha256: outputSha256,
				})
				this.#updateRanges(state)
				const pending = state.operations.filter((item) => item.status === 'pending').length
				state.nextAction = pending
					? `Apply the next bounded batch (${pending} operations remain).`
					: 'Validate the edited PDF and mark the job complete.'
				await this.#touchAndPersist(state)
				return state
			} catch (error) {
				for (const key of Object.keys(state)) delete state[key]
				Object.assign(state, recoveryState)
				const failureMessage = error.message
				const recoveredBatch = state.operations.filter((operation) =>
					batch.some((batchOperation) => batchOperation.id === operation.id)
				)
				for (const operation of recoveredBatch) {
					operation.status = 'pending'
					operation.lastError = safeStoredText(failureMessage)
				}
				appendBounded(state.errors, {
					at: this.now().toISOString(),
					message: safeStoredText(failureMessage),
				})
				state.nextAction = safeStoredText(`Retry ${batch[0].id} after resolving: ${failureMessage}`)
				this.#updateRanges(state)
				try {
					await this.#touchAndPersist(state)
				} catch (recoveryError) {
					let persistedState
					try {
						persistedState = await readJson(path.join(this.jobDirectory(jobId), 'state.json'))
					} catch {
						// Preserve generated output when authoritative recovery cannot be proven.
					}
					if (!persistedState || stableStringify(persistedState) !== stableStringify(state)) {
						throw new Error(
							`${error.message}; rollback state restoration failed: ${recoveryError.message}; generated output preserved at ${finalPath}`
						)
					}
				}
				const cleanupErrors = []
				for (const outputPath of [temporaryPath, finalPath]) {
					try {
						await rm(outputPath, { force: true })
					} catch (cleanupError) {
						cleanupErrors.push(cleanupError.message)
					}
				}
				if (cleanupErrors.length) {
					throw new Error(`${error.message}; rollback cleanup failed: ${cleanupErrors.join('; ')}`)
				}
				throw error
			} finally {
				await rm(inputSnapshotPath, { force: true }).catch(() => {})
			}
		})
	}

	async buildResumeContext(jobId, { includePaused = false } = {}) {
		const state = jobId ? await this.getJob(jobId) : await this.getActiveJob({ includePaused })
		if (!state || state.status === 'completed' || (state.status === 'paused' && !includePaused))
			return ''
		const pending = state.operations.filter((item) => item.status === 'pending').slice(0, 20)
		return [
			`PDF JOB ${state.jobId} (revision ${state.revision}, status ${state.status})`,
			`Source: ${state.source.path}`,
			`Working copy: ${state.workingPdf}`,
			`Pages: ${state.source.pageCount}; completed: ${state.completedPageRanges}; pending: ${state.pendingPageRanges}`,
			`Requested edits: ${state.instructions}`,
			`Next action: ${state.nextAction}`,
			'Pending operations:',
			...(pending.length
				? pending.map((item) => `- ${item.id}: ${item.type} on page ${item.page}`)
				: ['- none queued']),
			`Durable memory: ${path.join(this.jobDirectory(state.jobId), 'memory.md')}`,
			'Do not restart completed work. Continue from the exact next action and checkpoint after this unit.',
		].join('\n')
	}

	async complete(jobId, note = 'PDF job completed and validated.') {
		if (typeof note !== 'string' || note.length > MAX_INSTRUCTIONS_LENGTH) {
			throw new Error(
				`Completion note must be a string of at most ${MAX_INSTRUCTIONS_LENGTH} characters`
			)
		}
		const state = await this.#withJobLock(jobId, async () => {
			const current = await this.#readState(jobId)
			if (!current.operations.some((item) => item.status === 'completed')) {
				throw new Error('Cannot complete a job without at least one completed operation')
			}
			if (current.operations.some((item) => item.status !== 'completed')) {
				throw new Error('Cannot complete a job while operations remain pending')
			}
			if (
				!current.validation?.checks?.length ||
				current.validation.checks.some((check) => check.passed !== true)
			) {
				throw new Error('Cannot complete a job without successful validation')
			}
			const workingArtifact = current.artifacts.find((item) => item.path === current.workingPdf)
			if (
				!workingArtifact?.sha256 ||
				(await this.#sha256(current.workingPdf)) !== workingArtifact.sha256
			) {
				throw new Error('Cannot complete a job because the working PDF failed its integrity check')
			}
			current.status = 'completed'
			current.nextAction = 'No further action; deliver the validated working PDF.'
			appendBounded(current.notes, {
				at: this.now().toISOString(),
				message: safeStoredText(note),
			})
			await this.#touchAndPersist(current)
			return current
		})
		await this.#withActivePointerLock(async () => {
			const pointerPath = path.join(this.rootDir, 'active-job.json')
			try {
				const pointer = await readJson(pointerPath)
				if (pointer.jobId === jobId) await rm(pointerPath, { force: true })
			} catch (error) {
				if (error.code !== 'ENOENT') throw error
			}
		})
		return state
	}

	#normalizeOperation(candidate, pageCount) {
		if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
			throw new Error('Invalid PDF operation')
		}
		if (containsSecret(candidate)) {
			throw new Error(
				'PDF operations must not contain API keys, bearer tokens, passwords, or secrets'
			)
		}
		const id = assertJobId(candidate.id)
		if (!OPERATION_TYPES.has(candidate.type)) {
			throw new Error(`Unsupported PDF operation type: ${candidate.type}`)
		}
		const allowedFields = new Set([...COMMON_OPERATION_FIELDS, ...OPERATION_FIELDS[candidate.type]])
		const unknownField = Object.keys(candidate).find((field) => !allowedFields.has(field))
		if (unknownField)
			throw new Error(`Unknown operation field for ${candidate.type}: ${unknownField}`)
		if (!Number.isInteger(candidate.page) || candidate.page < 1 || candidate.page > pageCount) {
			throw new Error(`page must be between 1 and ${pageCount}`)
		}
		if (['replace_text', 'redact_text', 'highlight_text'].includes(candidate.type)) {
			if (
				typeof candidate.search !== 'string' ||
				!candidate.search ||
				candidate.search.length > 2000
			) {
				throw new Error(`${candidate.type} requires search text of at most 2000 characters`)
			}
			if (
				!Number.isInteger(candidate.occurrence) ||
				candidate.occurrence < 1 ||
				candidate.occurrence > 100
			) {
				throw new Error(`${candidate.type} occurrence is required and must be between 1 and 100`)
			}
		}
		if (
			candidate.type === 'replace_text' &&
			(typeof candidate.replacement !== 'string' || candidate.replacement.length > 20_000)
		) {
			throw new Error('replace_text requires replacement text of at most 20000 characters')
		}
		if (
			['add_text', 'add_note'].includes(candidate.type) &&
			(typeof candidate.text !== 'string' || !candidate.text || candidate.text.length > 20_000)
		) {
			throw new Error(`${candidate.type} requires text of at most 20000 characters`)
		}
		for (const field of ['x', 'y']) {
			if (
				candidate[field] !== undefined &&
				(!Number.isFinite(candidate[field]) || candidate[field] < 0 || candidate[field] > 100_000)
			) {
				throw new Error(`Invalid PDF geometry: ${field} must be between 0 and 100000`)
			}
		}
		for (const field of ['width', 'height']) {
			if (
				candidate[field] !== undefined &&
				(!Number.isFinite(candidate[field]) || candidate[field] <= 0 || candidate[field] > 100_000)
			) {
				throw new Error(`Invalid PDF geometry: ${field} must be greater than 0 and at most 100000`)
			}
		}
		if (
			candidate.fontSize !== undefined &&
			(!Number.isFinite(candidate.fontSize) || candidate.fontSize < 1 || candidate.fontSize > 200)
		) {
			throw new Error('fontSize must be between 1 and 200')
		}
		for (const field of ['color', 'fillColor']) {
			if (
				candidate[field] !== undefined &&
				(!Array.isArray(candidate[field]) ||
					candidate[field].length !== 3 ||
					candidate[field].some((value) => !Number.isFinite(value) || value < 0 || value > 1))
			) {
				throw new Error(`${field} must contain three values between 0 and 1`)
			}
		}
		if (candidate.type === 'rotate_page' && ![90, 180, 270].includes(candidate.angle)) {
			throw new Error('rotate_page angle must be 90, 180, or 270')
		}
		return {
			...candidate,
			id,
			status: 'pending',
			attempts: 0,
			createdAt: this.now().toISOString(),
			lastError: null,
		}
	}

	#updateRanges(state) {
		const completedPages = state.operations
			.filter((item) => item.status === 'completed')
			.map((item) => item.page)
		const pendingPages = state.operations
			.filter((item) => item.status !== 'completed')
			.map((item) => item.page)
		state.completedPageRanges = summarizePages(completedPages)
		state.pendingPageRanges = state.operations.length
			? summarizePages(pendingPages)
			: `1-${state.source.pageCount}`
	}

	async #readState(jobId) {
		const state = await readJson(path.join(this.jobDirectory(jobId), 'state.json'))
		if (
			containsSecret(state) ||
			state?.schemaVersion !== 1 ||
			state.jobId !== jobId ||
			!Number.isInteger(state.revision) ||
			state.revision < 1 ||
			!['active', 'paused', 'completed'].includes(state.status) ||
			!Number.isInteger(state.currentVersion) ||
			state.currentVersion < 0 ||
			state.currentVersion > MAX_PDF_VERSIONS ||
			!Number.isInteger(state.source?.pageCount) ||
			state.source.pageCount < 1 ||
			state.source.pageCount > MAX_PAGES ||
			!/^([a-f0-9]{64})$/.test(state.source?.sha256 || '') ||
			typeof state.source?.path !== 'string' ||
			typeof state.instructions !== 'string' ||
			state.instructions.length > MAX_INSTRUCTIONS_LENGTH ||
			typeof state.nextAction !== 'string' ||
			state.nextAction.length > MAX_INSTRUCTIONS_LENGTH ||
			!Array.isArray(state.operations) ||
			state.operations.length > MAX_OPERATIONS_PER_JOB ||
			!Array.isArray(state.artifacts) ||
			state.artifacts.length > MAX_PDF_VERSIONS + 2 ||
			!Array.isArray(state.validation?.checks) ||
			state.validation.checks.length > MAX_HISTORY_ENTRIES ||
			!Array.isArray(state.notes) ||
			state.notes.length > MAX_HISTORY_ENTRIES ||
			!Array.isArray(state.errors) ||
			state.errors.length > MAX_HISTORY_ENTRIES
		) {
			throw new Error(`Invalid or unsupported PDF job state: ${jobId}`)
		}
		const operationIds = new Set()
		for (const operation of state.operations) {
			this.#validatePersistedOperation(operation, state.source.pageCount, state.currentVersion)
			if (operationIds.has(operation.id))
				throw new Error(`Duplicate operation ID in PDF job ${jobId}`)
			operationIds.add(operation.id)
		}
		this.#validateValidation(state.validation)
		for (const collection of [state.notes, state.errors]) {
			for (const entry of collection) {
				if (
					!entry ||
					typeof entry !== 'object' ||
					typeof entry.at !== 'string' ||
					typeof entry.message !== 'string' ||
					entry.message.length > MAX_INSTRUCTIONS_LENGTH
				) {
					throw new Error(`Invalid history entry in PDF job ${jobId}`)
				}
			}
		}
		await this.#assertJobPath(jobId, state.workingPdf, 'workingPdf')
		let artifactBytes = 0
		for (const artifact of state.artifacts) {
			if (
				!artifact ||
				typeof artifact !== 'object' ||
				!['source', 'pdf'].includes(artifact.type) ||
				!/^[a-f0-9]{64}$/.test(artifact.sha256 || '') ||
				(artifact.type === 'pdf' &&
					(!Number.isInteger(artifact.version) ||
						artifact.version < 0 ||
						artifact.version > state.currentVersion))
			) {
				throw new Error(`Invalid artifact in PDF job ${jobId}`)
			}
			artifactBytes += await this.#assertJobPath(jobId, artifact.path, 'artifact')
			if (artifactBytes > this.maxWorkspaceBytes) {
				throw new Error(`PDF job workspace exceeds ${this.maxWorkspaceBytes} bytes`)
			}
		}
		const currentArtifact = state.artifacts.find(
			(item) => item.type === 'pdf' && item.version === state.currentVersion
		)
		if (!currentArtifact || currentArtifact.path !== state.workingPdf) {
			throw new Error(`Working PDF does not match the current version in PDF job ${jobId}`)
		}
		return state
	}

	#validatePersistedOperation(operation, pageCount, currentVersion) {
		if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
			throw new Error('Invalid persisted PDF operation')
		}
		const metadata = new Set([
			'status',
			'attempts',
			'createdAt',
			'completedAt',
			'lastError',
			'outputVersion',
		])
		const allowed = new Set([
			...COMMON_OPERATION_FIELDS,
			...(OPERATION_FIELDS[operation.type] || []),
			...metadata,
		])
		if (Object.keys(operation).some((field) => !allowed.has(field))) {
			throw new Error('Invalid persisted PDF operation field')
		}
		const payload = Object.fromEntries(
			Object.entries(operation).filter(([field]) => !metadata.has(field))
		)
		this.#normalizeOperation(payload, pageCount)
		if (
			!['pending', 'running', 'completed'].includes(operation.status) ||
			!Number.isInteger(operation.attempts) ||
			operation.attempts < 0 ||
			operation.attempts > MAX_OPERATION_ATTEMPTS ||
			typeof operation.createdAt !== 'string' ||
			(operation.lastError !== null &&
				(typeof operation.lastError !== 'string' ||
					operation.lastError.length > MAX_INSTRUCTIONS_LENGTH))
		) {
			throw new Error('Invalid persisted PDF operation metadata')
		}
		if (operation.status === 'completed') {
			if (
				typeof operation.completedAt !== 'string' ||
				!Number.isInteger(operation.outputVersion) ||
				operation.outputVersion < 1 ||
				operation.outputVersion > currentVersion
			) {
				throw new Error('Invalid completed PDF operation metadata')
			}
		} else if (operation.completedAt !== undefined || operation.outputVersion !== undefined) {
			throw new Error('Invalid incomplete PDF operation metadata')
		}
	}

	#validateValidation(validation, requirePassed = false) {
		if (
			!validation ||
			typeof validation !== 'object' ||
			Array.isArray(validation) ||
			containsSecret(validation) ||
			Object.keys(validation).some(
				(field) => !['checks', 'pageCount', 'lastRunAt'].includes(field)
			) ||
			!Array.isArray(validation.checks) ||
			validation.checks.length > MAX_HISTORY_ENTRIES ||
			(requirePassed && validation.checks.length === 0) ||
			(validation.pageCount !== undefined &&
				(!Number.isInteger(validation.pageCount) ||
					validation.pageCount < 1 ||
					validation.pageCount > MAX_PAGES)) ||
			(validation.lastRunAt !== undefined &&
				validation.lastRunAt !== null &&
				typeof validation.lastRunAt !== 'string')
		) {
			throw new Error('Invalid PDF validation result')
		}
		for (const check of validation.checks) {
			if (
				!check ||
				typeof check !== 'object' ||
				Array.isArray(check) ||
				Object.keys(check).some((field) => !['name', 'passed'].includes(field)) ||
				typeof check.name !== 'string' ||
				check.name.length > MAX_INSTRUCTIONS_LENGTH ||
				typeof check.passed !== 'boolean' ||
				(requirePassed && !check.passed)
			) {
				throw new Error('Invalid PDF validation check')
			}
		}
	}

	async #assertJobPath(jobId, candidate, label) {
		return (await this.#canonicalJobFile(jobId, candidate, label)).size
	}

	async #canonicalJobFile(jobId, candidate, label) {
		if (typeof candidate !== 'string') throw new Error(`Invalid ${label} path in PDF job ${jobId}`)
		const lexicalJobDir = path.resolve(this.jobDirectory(jobId))
		const lexicalRelative = path.relative(lexicalJobDir, path.resolve(candidate))
		if (lexicalRelative.startsWith('..') || path.isAbsolute(lexicalRelative)) {
			throw new Error(`Invalid ${label} path in PDF job ${jobId}: path escapes PDF job`)
		}
		const jobDir = await realpath(lexicalJobDir)
		let linkInfo
		try {
			linkInfo = await lstat(candidate)
		} catch (error) {
			throw new Error(`Invalid ${label} path in PDF job ${jobId}: ${error.message}`)
		}
		if (linkInfo.isSymbolicLink()) {
			throw new Error(`Invalid ${label} path in PDF job ${jobId}: symbolic links are not allowed`)
		}
		let resolved
		try {
			resolved = await realpath(candidate)
		} catch (error) {
			throw new Error(`Invalid ${label} path in PDF job ${jobId}: ${error.message}`)
		}
		const relative = path.relative(jobDir, resolved)
		if (relative.startsWith('..') || path.isAbsolute(relative)) {
			throw new Error(`${label} path escapes PDF job ${jobId}`)
		}
		const info = await stat(resolved)
		if (!info.isFile()) throw new Error(`Invalid ${label} file in PDF job ${jobId}`)
		if (info.size < 1 || info.size > MAX_PDF_BYTES) {
			throw new Error(`Invalid ${label} size in PDF job ${jobId}`)
		}
		return { path: resolved, size: info.size }
	}

	async #cleanupOrphanedVersions(jobId, state, canonicalWorkingPdf) {
		const versionsDir = path.join(this.jobDirectory(jobId), 'versions')
		const versionsRoots = [path.resolve(versionsDir), await realpath(versionsDir)]
		const protectedPaths = new Set()
		const protectPathAndAncestors = (candidate) => {
			const resolvedCandidate = path.resolve(candidate)
			for (const root of versionsRoots) {
				let current = resolvedCandidate
				while (current !== root) {
					const relative = path.relative(root, current)
					if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) break
					protectedPaths.add(current)
					const parent = path.dirname(current)
					if (parent === current) break
					current = parent
				}
			}
		}
		if (canonicalWorkingPdf) protectPathAndAncestors(canonicalWorkingPdf)
		for (const artifact of state.artifacts) {
			const artifactPath = path.resolve(artifact.path)
			if (!artifactPath.startsWith(`${path.resolve(versionsDir)}${path.sep}`)) continue
			protectPathAndAncestors(artifactPath)
			protectPathAndAncestors(await realpath(artifactPath))
		}
		let changed = false
		for (const entry of await readdir(versionsDir, { withFileTypes: true })) {
			const candidate = path.join(versionsDir, entry.name)
			let canonicalCandidate
			try {
				canonicalCandidate = await realpath(candidate)
			} catch (error) {
				if (error.code !== 'ENOENT') throw error
			}
			if (
				protectedPaths.has(path.resolve(candidate)) ||
				(canonicalCandidate && protectedPaths.has(path.resolve(canonicalCandidate)))
			) {
				continue
			}
			await rm(candidate, { force: true, recursive: entry.isDirectory() })
			changed = true
		}
		if (changed) await this.#syncDirectory(versionsDir)
	}

	async #touchAndPersist(state) {
		state.revision += 1
		state.updatedAt = this.now().toISOString()
		await this.#persist(state)
	}

	async #persist(state) {
		const jobDir = this.jobDirectory(state.jobId)
		await writeJson(path.join(jobDir, 'state.json'), state)
		await atomicWrite(path.join(jobDir, 'memory.md'), renderMemory(state))
	}
	async #sha256(filePath) {
		const hash = createHash('sha256')
		const stream = createReadStream(filePath)
		for await (const chunk of stream) hash.update(chunk)
		return hash.digest('hex')
	}

	async #openAllowedBrowserArtifact(artifactPath) {
		if (!Number.isInteger(constants.O_NOFOLLOW)) {
			throw new Error('Secure browser artifact ingestion is unavailable on this platform')
		}
		const requestedArtifact = path.resolve(artifactPath)
		let handle
		try {
			handle = await open(requestedArtifact, constants.O_RDONLY | constants.O_NOFOLLOW)
		} catch (error) {
			if (error?.code === 'ELOOP') {
				throw new Error('Browser artifact symbolic links are not allowed')
			}
			throw error
		}
		try {
			const info = await handle.stat({ bigint: true })
			if (
				!info.isFile() ||
				info.size < 1n ||
				info.size > BigInt(MAX_PDF_BYTES) ||
				path.extname(requestedArtifact).toLowerCase() !== '.pdf'
			) {
				throw new Error('Browser artifact must be a nonempty regular PDF file')
			}
			const resolvedArtifact = await realpath(requestedArtifact)
			const resolvedInfo = await stat(resolvedArtifact, { bigint: true })
			if (resolvedInfo.dev !== info.dev || resolvedInfo.ino !== info.ino) {
				throw new Error('Browser artifact changed during validation')
			}
			const allowedRoots = await Promise.all(
				this.allowedArtifactRoots.map(async (root) => {
					try {
						return await realpath(root)
					} catch {
						return root
					}
				})
			)
			if (
				!allowedRoots.some((root) => {
					const relative = path.relative(root, resolvedArtifact)
					return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
				})
			) {
				throw new Error('Browser artifact path is outside the allowed download roots')
			}
			const sha256 = await this.#hashOpenFile(handle, info)
			return { handle, info, sha256 }
		} catch (error) {
			await handle.close().catch(() => {})
			throw error
		}
	}

	async #hashOpenFile(handle, expectedInfo) {
		const expectedSize = Number(expectedInfo.size)
		const buffer = Buffer.allocUnsafe(Math.min(1024 * 1024, expectedSize))
		const hash = createHash('sha256')
		let position = 0
		while (position < expectedSize) {
			const length = Math.min(buffer.length, expectedSize - position)
			const { bytesRead } = await handle.read(buffer, 0, length, position)
			if (bytesRead < 1) throw new Error('Browser artifact changed during validation')
			hash.update(buffer.subarray(0, bytesRead))
			position += bytesRead
		}
		const after = await handle.stat({ bigint: true })
		if (
			after.dev !== expectedInfo.dev ||
			after.ino !== expectedInfo.ino ||
			after.size !== expectedInfo.size ||
			after.mtimeNs !== expectedInfo.mtimeNs ||
			after.ctimeNs !== expectedInfo.ctimeNs
		) {
			throw new Error('Browser artifact changed during validation')
		}
		return hash.digest('hex')
	}

	async #copyOpenFile(source, destinationPath) {
		const destination = await open(
			destinationPath,
			constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
			0o600
		)
		const expectedSize = Number(source.info.size)
		const buffer = Buffer.allocUnsafe(Math.min(1024 * 1024, expectedSize))
		const hash = createHash('sha256')
		let position = 0
		try {
			while (position < expectedSize) {
				const length = Math.min(buffer.length, expectedSize - position)
				const { bytesRead } = await source.handle.read(buffer, 0, length, position)
				if (bytesRead < 1) throw new Error('Browser artifact changed while being copied')
				hash.update(buffer.subarray(0, bytesRead))
				let written = 0
				while (written < bytesRead) {
					const result = await destination.write(
						buffer,
						written,
						bytesRead - written,
						position + written
					)
					if (result.bytesWritten < 1) throw new Error('Browser artifact copy made no progress')
					written += result.bytesWritten
				}
				position += bytesRead
			}
			const after = await source.handle.stat({ bigint: true })
			if (
				hash.digest('hex') !== source.sha256 ||
				after.dev !== source.info.dev ||
				after.ino !== source.info.ino ||
				after.size !== source.info.size ||
				after.mtimeNs !== source.info.mtimeNs
			) {
				throw new Error('Browser artifact changed while being copied')
			}
			await destination.sync()
		} catch (error) {
			await destination.close().catch(() => {})
			await rm(destinationPath, { force: true }).catch(() => {})
			throw error
		}
		await destination.close()
	}

	async #syncFile(filePath) {
		const handle = await open(filePath, 'r')
		try {
			await handle.sync()
		} finally {
			await handle.close()
		}
	}

	async #artifactBytes(state) {
		let total = 0
		for (const filePath of new Set(state.artifacts.map((artifact) => artifact.path))) {
			total += (await stat(filePath)).size
			if (total > this.maxWorkspaceBytes) break
		}
		return total
	}

	async #syncDirectory(directory) {
		const handle = await open(directory, 'r')
		try {
			await handle.sync()
		} finally {
			await handle.close()
		}
	}

	async #withJobLock(jobId, callback) {
		return this.#withLock(path.join(this.jobDirectory(jobId), '.state.lock'), callback)
	}

	async #withActivePointerLock(callback) {
		await mkdir(this.rootDir, { recursive: true, mode: 0o700 })
		return this.#withLock(path.join(this.rootDir, '.active-job.lock'), callback)
	}

	async #readLockOwner(lockPath) {
		try {
			return JSON.parse(await readFile(lockPath, 'utf8'))
		} catch (error) {
			if (error.code === 'ENOENT') return null
			return null
		}
	}

	async #processStartIdentity(pid) {
		try {
			const { stdout } = await execFileAsync('/bin/ps', ['-o', 'lstart=', '-p', String(pid)], {
				timeout: 2_000,
				maxBuffer: 4_096,
				env: { LC_ALL: 'C' },
			})
			return stdout.trim() || null
		} catch {
			return null
		}
	}

	async #lockOwnerIsAlive(owner) {
		if (!Number.isInteger(owner?.pid) || !owner.token) return false
		try {
			process.kill(owner.pid, 0)
		} catch (error) {
			if (error.code !== 'EPERM') return false
		}
		if (!owner.processStartedAt) return true
		const observedIdentity = await this.#processStartIdentity(owner.pid)
		return observedIdentity === null || observedIdentity === owner.processStartedAt
	}

	async #removeOwnedLock(lockPath, token) {
		const owner = await this.#readLockOwner(lockPath)
		if (owner?.token === token) await rm(lockPath, { force: true })
	}

	async #createReclaimerIntent(lockPath, token) {
		const directory = `${lockPath}.reclaimers`
		await mkdir(directory, { recursive: true, mode: 0o700 })
		const marker = path.join(directory, `${token}.json`)
		await writeJson(marker, {
			pid: process.pid,
			token,
			processStartedAt: await this.processStartedAt,
			createdAt: Date.now(),
		})
		return marker
	}

	async #hasLiveReclaimers(lockPath) {
		const directory = `${lockPath}.reclaimers`
		let entries
		try {
			entries = await readdir(directory)
		} catch (error) {
			if (error.code === 'ENOENT') return false
			throw error
		}
		let live = false
		for (const entry of entries) {
			if (!entry.endsWith('.json')) continue
			const marker = path.join(directory, entry)
			const owner = await this.#readLockOwner(marker)
			if (await this.#lockOwnerIsAlive(owner)) live = true
			else await rm(marker, { force: true })
		}
		return live
	}

	async #waitForReclaimers(lockPath) {
		for (let attempt = 0; attempt < 100; attempt += 1) {
			if (!(await this.#hasLiveReclaimers(lockPath))) return
			await pause(50)
		}
		throw new Error(`PDF state has an active stale-lock observer: ${lockPath}`)
	}

	async #withLock(lockPath, callback) {
		let handle
		const token = randomUUID()
		for (let attempt = 0; attempt < 100; attempt += 1) {
			try {
				handle = await open(lockPath, 'wx', 0o600)
				await handle.writeFile(
					`${JSON.stringify({
						pid: process.pid,
						token,
						processStartedAt: await this.processStartedAt,
						acquiredAt: Date.now(),
					})}\n`
				)
				await handle.sync()
				await this.#waitForReclaimers(lockPath)
				const confirmedOwner = await this.#readLockOwner(lockPath)
				if (confirmedOwner?.token !== token) {
					await handle.close()
					handle = undefined
					await pause(50)
					const restoredOwner = await this.#readLockOwner(lockPath)
					if (restoredOwner?.token === token) await rm(lockPath, { force: true })
					continue
				}
				break
			} catch (error) {
				if (error.code !== 'EEXIST') {
					if (handle) {
						await handle.close().catch(() => {})
						handle = undefined
						await this.#removeOwnedLock(lockPath, token)
					}
					throw error
				}
				const marker = await this.#createReclaimerIntent(lockPath, token)
				try {
					const observedOwner = await this.#readLockOwner(lockPath)
					if (!(await this.#lockOwnerIsAlive(observedOwner))) {
						const quarantine = `${lockPath}.abandoned.${token}`
						try {
							await rename(lockPath, quarantine)
							const quarantinedOwner = await this.#readLockOwner(quarantine)
							if (quarantinedOwner?.token !== observedOwner?.token) {
								try {
									await rename(quarantine, lockPath)
								} catch (restoreError) {
									if (restoreError.code !== 'EEXIST') throw restoreError
									await rm(quarantine, { force: true })
								}
								continue
							}
							await rm(quarantine, { force: true })
							continue
						} catch (renameError) {
							if (renameError.code !== 'ENOENT') throw renameError
						}
					}
				} finally {
					await rm(marker, { force: true })
				}
				await pause(50)
			}
		}
		if (!handle) throw new Error(`PDF state is locked by another process: ${lockPath}`)
		const heartbeat = setInterval(
			() => handle.utimes(new Date(), new Date()).catch(() => {}),
			30_000
		)
		heartbeat.unref()
		try {
			return await callback()
		} finally {
			clearInterval(heartbeat)
			try {
				await handle.close()
			} finally {
				await this.#removeOwnedLock(lockPath, token)
			}
		}
	}
}
