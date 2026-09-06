import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import path from 'node:path'

const SECRET_PATTERNS = [
	/\bBearer\s+(?!\[REDACTED\](?=$|[\s,;}"']))[^\s]+/i,
	/\bsk-[a-zA-Z0-9_-]{8,}/,
	/\b(api[_-]?key|token|secret|password)\s*[:=]\s*(?!\[REDACTED\](?=$|[\s,;}"']))[^\s,;]+/i,
]

export function assertJobId(jobId) {
	if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(jobId)) {
		throw new Error(`Invalid job ID: ${jobId}`)
	}
	return jobId
}

export async function atomicWrite(filePath, content) {
	const directory = path.dirname(filePath)
	await mkdir(directory, { recursive: true })
	const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`
	let handle
	try {
		handle = await open(temporary, 'wx', 0o600)
		await handle.writeFile(content)
		await handle.sync()
		await handle.close()
		handle = undefined
		await rename(temporary, filePath)
		const directoryHandle = await open(directory, 'r')
		try {
			await directoryHandle.sync()
		} finally {
			await directoryHandle.close()
		}
	} catch (error) {
		await handle?.close().catch(() => {})
		await rm(temporary, { force: true }).catch(() => {})
		throw error
	}
}

export async function readJson(filePath) {
	return JSON.parse(await readFile(filePath, 'utf8'))
}

export async function writeJson(filePath, value) {
	await atomicWrite(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export function containsSecret(value) {
	const text = typeof value === 'string' ? value : JSON.stringify(value)
	return SECRET_PATTERNS.some((pattern) => {
		pattern.lastIndex = 0
		return pattern.test(text)
	})
}

export function redactSecrets(value) {
	return String(value ?? '')
		.replace(/\bBearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
		.replace(/\bsk-[a-zA-Z0-9_-]{8,}/g, '[REDACTED]')
		.replace(/\b(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
}

export function stableStringify(value) {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
	if (value && typeof value === 'object') {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
			.join(',')}}`
	}
	return JSON.stringify(value)
}

export function summarizePages(pages) {
	const sorted = [...new Set(pages)].filter(Number.isInteger).sort((a, b) => a - b)
	if (sorted.length === 0) return 'none'
	const ranges = []
	let start = sorted[0]
	let end = sorted[0]
	for (const page of sorted.slice(1)) {
		if (page === end + 1) {
			end = page
			continue
		}
		ranges.push(start === end ? `${start}` : `${start}-${end}`)
		start = end = page
	}
	ranges.push(start === end ? `${start}` : `${start}-${end}`)
	return ranges.join(', ')
}

function operationLine(operation) {
	const page = operation.page ? `page ${operation.page}` : 'document'
	const error = operation.lastError ? `; error: ${redactSecrets(operation.lastError)}` : ''
	return `| ${operation.id} | ${operation.type} | ${page} | ${operation.status} | ${operation.attempts || 0}${error} |`
}

export function renderMemory(state) {
	const checks = state.validation?.checks || []
	const artifacts = state.artifacts || []
	const errors = (state.errors || []).slice(-5)
	const lines = [
		`# PDF Job Memory: ${state.jobId}`,
		'',
		'> Generated from `state.json`. Do not put credentials in this file.',
		'',
		`- Status: ${state.status}`,
		`- Revision: ${state.revision}`,
		`- Source PDF: ${state.source.path}`,
		`- Source SHA-256: ${state.source.sha256}`,
		`- Working PDF: ${state.workingPdf}`,
		`- Pages: ${state.source.pageCount}`,
		`- Completed pages: ${state.completedPageRanges}`,
		`- Pending pages: ${state.pendingPageRanges}`,
		`- Next action: ${redactSecrets(state.nextAction)}`,
		`- Updated: ${state.updatedAt}`,
		'',
		'## Requested edits',
		'',
		redactSecrets(state.instructions),
		'',
		'## Operations',
		'',
		'| ID | Type | Target | Status | Attempts / error |',
		'|---|---|---|---|---|',
		...(state.operations.length
			? state.operations.map(operationLine)
			: ['| — | — | — | none queued | — |']),
		'',
		'## Validation',
		'',
		...(checks.length
			? checks.map((check) => `- ${check.passed ? 'PASS' : 'FAIL'}: ${redactSecrets(check.name)}`)
			: ['- Not run yet.']),
		'',
		'## Artifacts',
		'',
		...(artifacts.length
			? artifacts.map((item) => `- ${redactSecrets(item.path || item)}`)
			: ['- None.']),
		'',
		'## Recent errors / retry notes',
		'',
		...(errors.length
			? errors.map((item) => `- ${redactSecrets(item.message || item)}`)
			: ['- None.']),
		'',
	]
	return `${lines.join('\n')}\n`
}
