/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * API discovery (§18) — infer capabilities from the application's own network calls.
 *
 * @remarks
 * When the app itself issues `POST /api/customers` with `{name, email}`, that is a
 * far better implementation of `create_customer` than driving its form: faster,
 * more reliable, structured output, no UI coupling.
 *
 * Three rules make this safe rather than reckless, per §18's own warning not to
 * bypass application security controls:
 *
 * 1. **Same-origin only.** Cross-origin traffic is never recorded or replayed.
 * 2. **Replay, never forge.** A capability re-sends the request the application
 *    already made, with the headers it used — CSRF tokens included — and the
 *    browser's own cookies. We never mint credentials or skip an auth step.
 * 3. **Observation is opt-in** and only records shapes it can model.
 */
import type { Locator } from './locator'

/** One observed request, reduced to what a capability needs. */
export interface ApiCallRecord {
	method: string
	/** Absolute URL, query string stripped into `query`. */
	url: string
	path: string
	query: Record<string, string>
	/** Header names/values the app sent that we must reproduce (e.g. CSRF tokens). */
	headers: Record<string, string>
	/** Parsed JSON request body, when there was one. */
	body?: Record<string, unknown>
	status: number
	/** Whether the response parsed as JSON. */
	jsonResponse: boolean
	observedAt: number
}

/** A capability inferred from one or more observed calls. */
export interface ApiCapabilityDescriptor {
	name: string
	description: string
	method: string
	/** URL template with `{param}` placeholders for path segments that vary. */
	urlTemplate: string
	/** Body field names the app sent, in the order first seen. */
	bodyFields: string[]
	queryFields: string[]
	/** Path placeholder names, e.g. `id` for `/api/orders/{id}`. */
	pathParams: string[]
	headers: Record<string, string>
	risk: 'read' | 'reversible' | 'consequential'
	confidence: number
	page: string
	/** Never set for API capabilities — present so the shape matches DOM descriptors. */
	container?: Locator
}

/**
 * Headers worth reproducing on replay. Everything else (Content-Length, Origin,
 * cookies) is set by the browser and must not be spoofed by us.
 */
const REPLAYABLE_HEADER = /^(x-|content-type$|accept$|authorization$)/i

/** Headers we deliberately never capture or replay. */
const FORBIDDEN_HEADER = /^(cookie|set-cookie|host|content-length|origin|referer)$/i

const MAX_RECORDS = 100

let installed = false
let records: ApiCallRecord[] = []

function sameOrigin(url: string): boolean {
	try {
		return new URL(url, window.location.href).origin === window.location.origin
	} catch {
		return false
	}
}

function pickHeaders(
	headers: Headers | Record<string, string> | undefined
): Record<string, string> {
	const result: Record<string, string> = {}
	if (!headers) return result

	const entries: [string, string][] =
		headers instanceof Headers
			? Array.from(headers.entries())
			: Object.entries(headers).map(([key, value]) => [key, value])

	for (const [key, value] of entries) {
		if (FORBIDDEN_HEADER.test(key)) continue
		if (!REPLAYABLE_HEADER.test(key)) continue
		result[key] = value
	}

	return result
}

function parseBody(body: unknown): Record<string, unknown> | undefined {
	if (typeof body !== 'string' || !body.trim()) return undefined
	try {
		const parsed: unknown = JSON.parse(body)
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: undefined
	} catch {
		return undefined
	}
}

function record(entry: ApiCallRecord): void {
	records.push(entry)
	if (records.length > MAX_RECORDS) records = records.slice(-MAX_RECORDS)
}

/**
 * Patch `fetch` and `XMLHttpRequest` to record same-origin JSON calls.
 * Idempotent, and the patches delegate to the originals unconditionally — a
 * failure in our bookkeeping must never break the host application's networking.
 */
export function observeApiCalls(): () => void {
	if (typeof window === 'undefined') return () => undefined
	if (installed) return () => undefined

	installed = true

	const originalFetch = window.fetch.bind(window)
	// Intentionally unbound: these are re-invoked with `.call(this, …)` so the
	// original methods still see the real XHR instance as their receiver.
	/* eslint-disable @typescript-eslint/unbound-method */
	const originalOpen = XMLHttpRequest.prototype.open
	const originalSend = XMLHttpRequest.prototype.send
	const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader
	/* eslint-enable @typescript-eslint/unbound-method */

	window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
		const response = await originalFetch(input as RequestInfo, init)

		try {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
			if (sameOrigin(url)) {
				const method = (
					init?.method ?? (input instanceof Request ? input.method : 'GET')
				).toUpperCase()
				const parsed = new URL(url, window.location.href)

				record({
					method,
					url: parsed.href,
					path: parsed.pathname,
					query: Object.fromEntries(parsed.searchParams.entries()),
					headers: pickHeaders(
						init?.headers instanceof Headers
							? init.headers
							: (init?.headers as Record<string, string> | undefined)
					),
					body: parseBody(init?.body),
					status: response.status,
					jsonResponse: (response.headers.get('content-type') ?? '').includes('json'),
					observedAt: Date.now(),
				})
			}
		} catch (error) {
			console.debug('[api-observer] failed to record fetch', error)
		}

		return response
	} as typeof window.fetch

	interface TrackedXHR extends XMLHttpRequest {
		__ebMethod?: string
		__ebUrl?: string
		__ebHeaders?: Record<string, string>
	}

	XMLHttpRequest.prototype.open = function (
		this: TrackedXHR,
		method: string,
		url: string | URL,
		...rest: unknown[]
	) {
		this.__ebMethod = method?.toUpperCase()
		this.__ebUrl = typeof url === 'string' ? url : url.href
		this.__ebHeaders = {}
		return (originalOpen as (...args: unknown[]) => void).apply(this, [method, url, ...rest])
	} as typeof XMLHttpRequest.prototype.open

	XMLHttpRequest.prototype.setRequestHeader = function (
		this: TrackedXHR,
		name: string,
		value: string
	) {
		if (this.__ebHeaders && !FORBIDDEN_HEADER.test(name) && REPLAYABLE_HEADER.test(name)) {
			this.__ebHeaders[name] = value
		}
		return originalSetHeader.call(this, name, value)
	}

	XMLHttpRequest.prototype.send = function (
		this: TrackedXHR,
		body?: Document | XMLHttpRequestBodyInit | null
	) {
		this.addEventListener('loadend', () => {
			try {
				const url = this.__ebUrl
				if (!url || !sameOrigin(url)) return
				const parsed = new URL(url, window.location.href)

				record({
					method: this.__ebMethod ?? 'GET',
					url: parsed.href,
					path: parsed.pathname,
					query: Object.fromEntries(parsed.searchParams.entries()),
					headers: this.__ebHeaders ?? {},
					body: parseBody(body),
					status: this.status,
					jsonResponse: (this.getResponseHeader('content-type') ?? '').includes('json'),
					observedAt: Date.now(),
				})
			} catch (error) {
				console.debug('[api-observer] failed to record xhr', error)
			}
		})

		return originalSend.call(this, body ?? null)
	}

	return () => {
		window.fetch = originalFetch
		XMLHttpRequest.prototype.open = originalOpen
		XMLHttpRequest.prototype.send = originalSend
		XMLHttpRequest.prototype.setRequestHeader = originalSetHeader
		installed = false
	}
}

/** Everything recorded so far. */
export function getApiCalls(): ApiCallRecord[] {
	return [...records]
}

export function clearApiCalls(): void {
	records = []
}

/** Path segments that look like identifiers rather than resource names. */
function isIdentifierSegment(segment: string): boolean {
	return (
		/^\d+$/.test(segment) ||
		/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) ||
		/^[0-9a-f]{16,}$/i.test(segment)
	)
}

const METHOD_VERBS: Record<string, { verb: string; risk: ApiCapabilityDescriptor['risk'] }> = {
	GET: { verb: 'get', risk: 'read' },
	POST: { verb: 'create', risk: 'reversible' },
	PUT: { verb: 'update', risk: 'reversible' },
	PATCH: { verb: 'update', risk: 'reversible' },
	DELETE: { verb: 'delete', risk: 'consequential' },
}

function toSnakeCase(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/_{2,}/g, '_')
		.replace(/^_+|_+$/g, '')
}

function singularize(word: string): string {
	if (word.length > 3 && word.endsWith('ies')) return word.slice(0, -3) + 'y'
	if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
	return word
}

/**
 * Turn observed calls into capability descriptors.
 *
 * Calls are grouped by method + templated path, so `GET /api/orders/1` and
 * `GET /api/orders/2` become one `get_order(id)` rather than two capabilities.
 */
export function inferApiCapabilities(
	calls: ApiCallRecord[] = getApiCalls()
): ApiCapabilityDescriptor[] {
	const page = typeof window !== 'undefined' ? window.location.href : ''
	const groups = new Map<string, { calls: ApiCallRecord[]; template: string; params: string[] }>()

	for (const call of calls) {
		// Only model calls that succeeded and returned JSON — an HTML page response
		// is a navigation, not an API.
		if (call.status < 200 || call.status >= 300) continue
		if (!call.jsonResponse) continue
		if (!METHOD_VERBS[call.method]) continue

		const segments = call.path.split('/').filter(Boolean)
		if (segments.length === 0) continue

		const params: string[] = []
		const templated = segments.map((segment, index) => {
			if (!isIdentifierSegment(segment)) return segment
			// Name the placeholder after the resource it follows: /orders/123 → {order_id}
			const previous = segments[index - 1]
			const name = previous ? `${singularize(toSnakeCase(previous))}_id` : 'id'
			params.push(name)
			return `{${name}}`
		})

		const template = '/' + templated.join('/')
		const key = `${call.method} ${template}`

		const existing = groups.get(key)
		if (existing) existing.calls.push(call)
		else groups.set(key, { calls: [call], template, params })
	}

	const descriptors: ApiCapabilityDescriptor[] = []

	for (const [, group] of groups) {
		const [first] = group.calls
		const { verb, risk } = METHOD_VERBS[first.method]

		const resourceSegments = group.template
			.split('/')
			.filter((segment) => segment && !segment.startsWith('{'))
			// Drop routing noise so `/api/v2/customers` names itself `customer`.
			.filter((segment) => !/^(api|v\d+|rest|graphql)$/i.test(segment))

		const resource = singularize(toSnakeCase(resourceSegments.at(-1) ?? 'resource'))
		if (!resource) continue

		// Merge body/query field names seen across every call in the group.
		const bodyFields: string[] = []
		const queryFields: string[] = []
		for (const call of group.calls) {
			for (const field of Object.keys(call.body ?? {})) {
				if (!bodyFields.includes(field)) bodyFields.push(field)
			}
			for (const field of Object.keys(call.query)) {
				if (!queryFields.includes(field)) queryFields.push(field)
			}
		}

		// Seeing the same endpoint several times is evidence it is a real, stable API.
		const confidence = Math.min(0.9, 0.55 + Math.min(group.calls.length, 4) * 0.05)

		descriptors.push({
			name: `${verb}_${resource}`,
			description:
				`${verb === 'get' ? 'Read' : verb[0].toUpperCase() + verb.slice(1)} ${resource.replace(/_/g, ' ')} ` +
				`via the application's own ${first.method} ${group.template} endpoint.`,
			method: first.method,
			urlTemplate: group.template,
			bodyFields,
			queryFields,
			pathParams: group.params,
			headers: first.headers,
			risk,
			confidence: Number(confidence.toFixed(2)),
			page,
		})
	}

	return descriptors
}
