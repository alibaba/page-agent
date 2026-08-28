/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 */
import type { Capability, CapabilityResult, JSONSchema } from './types'

/**
 * Character budgets recommended by Chrome for WebMCP tool metadata.
 * Exceeding them degrades agent tool selection, and long site-authored strings
 * are also the cheapest prompt-injection surface we expose.
 * @see https://developer.chrome.com/docs/ai/webmcp/secure-tools
 */
export const BUDGETS = {
	name: 30,
	description: 500,
	paramDescription: 150,
	output: 1500,
} as const

export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text
	return text.substring(0, maxLength) + '...'
}

/**
 * Render an unknown value as text without ever producing `[object Object]`.
 * Tool arguments and results come from the model and from site code, so neither
 * their type nor their serializability can be assumed.
 */
export function stringifyValue(value: unknown): string {
	if (typeof value === 'string') return value
	if (value === null || value === undefined) return ''
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value) ?? Object.prototype.toString.call(value)
		} catch {
			return Object.prototype.toString.call(value)
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-base-to-string
	return String(value)
}

/**
 * Normalize a capability name into a safe tool identifier.
 *
 * Tool names reach the LLM (and the OpenAI `tools` array, which only accepts
 * `[a-zA-Z0-9_-]`), so anything a site or a generator produces is sanitized here
 * rather than trusted.
 */
export function normalizeName(name: string): string {
	const cleaned = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		// Collapse runs of separators, but keep a single hyphen: WebMCP's own
		// examples use names like `add-todo`.
		.replace(/[-_]{2,}/g, '_')
		.replace(/^[-_]+|[-_]+$/g, '')

	return truncate(cleaned || 'unnamed_capability', BUDGETS.name)
}

/**
 * Strip control characters and cap length on site-authored prose before it is
 * placed in the prompt. Does NOT make the text trustworthy — the model is told
 * separately to treat capability descriptions as data, not instructions.
 */
export function sanitizeDescription(
	description: string,
	maxLength: number = BUDGETS.description
): string {
	const cleaned = description
		// Control characters are exactly what this strips.
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u001f\u007f]/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim()
	return truncate(cleaned, maxLength)
}

/** Recursively cap `description` fields inside a JSON Schema to the param budget. */
export function sanitizeSchema(schema: JSONSchema | undefined): JSONSchema {
	if (!schema || typeof schema !== 'object') return { type: 'object', properties: {} }

	const result: JSONSchema = { ...schema }

	if (typeof result.description === 'string') {
		result.description = sanitizeDescription(result.description, BUDGETS.paramDescription)
	}

	if (result.properties && typeof result.properties === 'object') {
		const properties: Record<string, JSONSchema> = {}
		for (const [key, value] of Object.entries(result.properties)) {
			properties[key] = sanitizeSchema(value)
		}
		result.properties = properties
	}

	if (result.items) result.items = sanitizeSchema(result.items)

	return result
}

/**
 * Whether two URLs are "the same page" for capability scoping.
 *
 * @remarks
 * Compares origin + pathname only. A search form that puts `?q=shoes` in the URL
 * has not navigated to a different screen, and the capabilities generated for it
 * are still valid — scoping on the full href would orphan them the moment the
 * agent used one, and force a needless rescan.
 */
export function samePage(a: string, b: string): boolean {
	if (a === b) return true
	try {
		const left = new URL(a)
		const right = new URL(b)
		return left.origin === right.origin && left.pathname === right.pathname
	} catch {
		// Not absolute URLs (e.g. a test fixture or an `about:` page) — exact match only.
		return false
	}
}

/**
 * Verb synonyms used to decide whether two capabilities describe the same
 * business action (§12). Kept deliberately small and explicit — a fuzzy matcher
 * that silently merges `delete_customer` into `archive_customer` would be worse
 * than not deduplicating at all.
 */
const VERB_SYNONYMS: Record<string, string> = {
	add: 'create',
	new: 'create',
	create: 'create',
	insert: 'create',
	search: 'search',
	find: 'search',
	query: 'search',
	lookup: 'search',
	list: 'search',
	filter: 'search',
	get: 'get',
	fetch: 'get',
	read: 'get',
	show: 'get',
	view: 'get',
	update: 'update',
	edit: 'update',
	modify: 'update',
	change: 'update',
	set: 'update',
	delete: 'delete',
	remove: 'delete',
	destroy: 'delete',
}

/** Crude singularization — enough to make `customers` and `customer` collide. */
function singularize(word: string): string {
	if (word.length > 3 && word.endsWith('ies')) return word.slice(0, -3) + 'y'
	if (word.length > 3 && word.endsWith('ses')) return word.slice(0, -2)
	if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
	return word
}

/**
 * Build the key used to detect that two capabilities are the same business action.
 *
 * `create_customer`, `add_customer` and `POST /customers` → `create:customer`.
 */
export function businessActionKey(name: string): string {
	const parts = normalizeName(name).split(/[_-]/).filter(Boolean)
	if (parts.length === 0) return 'unknown'

	const [head, ...rest] = parts
	const verb = VERB_SYNONYMS[head]

	// No recognized verb: treat the whole name as the object so unrelated
	// capabilities never collapse into one another.
	if (!verb) return `action:${parts.map(singularize).join('_')}`

	const object = rest.map(singularize).join('_')
	return object ? `${verb}:${object}` : `${verb}:*`
}

/**
 * Normalize whatever an adapter returned into a {@link CapabilityResult}.
 *
 * WebMCP is mid-flight on this: the spec explainer returns
 * `{ content: [{ type: 'text', text }] }` while Chrome's imperative-API docs show a
 * bare string. Both shapes (plus arbitrary JSON from API adapters) are handled.
 */
export function normalizeResult(raw: unknown): CapabilityResult {
	if (raw == null) return { content: '' }

	if (typeof raw === 'string') return { content: truncate(raw, BUDGETS.output), structured: raw }

	if (typeof raw === 'object') {
		const maybeContent = (raw as { content?: unknown }).content

		if (Array.isArray(maybeContent)) {
			const text = maybeContent
				.map((part) => {
					if (typeof part === 'string') return part
					if (part && typeof part === 'object' && typeof (part as any).text === 'string') {
						return (part as any).text as string
					}
					return ''
				})
				.filter(Boolean)
				.join('\n')
			return { content: truncate(text, BUDGETS.output), structured: raw }
		}

		if (typeof maybeContent === 'string') {
			return { content: truncate(maybeContent, BUDGETS.output), structured: raw }
		}
	}

	let serialized: string
	try {
		serialized = JSON.stringify(raw)
	} catch {
		serialized = stringifyValue(raw)
	}
	return { content: truncate(serialized, BUDGETS.output), structured: raw }
}

/**
 * Render a human-readable summary of a pending action for the approval dialog (§16).
 */
export function summarizeForApproval(capability: Capability, input: unknown): string {
	const lines = [capability.description || capability.name]

	if (input && typeof input === 'object') {
		for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
			if (value === undefined || value === null || value === '') continue
			lines.push(`${key}: ${truncate(stringifyValue(value), 100)}`)
		}
	}

	return lines.join('\n')
}

/** `readOnlyHint` follows from the risk level unless the author said otherwise. */
export function resolveAnnotations(capability: Capability): Required<CapabilityAnnotationsShape> {
	return {
		readOnlyHint: capability.annotations?.readOnlyHint ?? capability.risk === 'read',
		untrustedContentHint: capability.annotations?.untrustedContentHint ?? false,
	}
}

interface CapabilityAnnotationsShape {
	readOnlyHint: boolean
	untrustedContentHint: boolean
}
