/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * Replays an inferred API capability (§18).
 *
 * @remarks
 * This re-issues the request the application itself already made, from the page,
 * with the page's own cookies and the headers the app used (CSRF tokens included).
 * It does not construct credentials, skip an authorization step, or reach a
 * different origin — §18 is explicit that API execution must respect the
 * application's auth, CSRF protection, authorization and business rules.
 */
import type { ApiCapabilityDescriptor } from './apiObserver'

export interface ApiExecutionResult {
	success: boolean
	message: string
	output?: string
	status?: number
}

const MAX_OUTPUT = 1500

/** Render a model-supplied argument without ever producing `[object Object]`. */
function toText(value: unknown): string {
	if (typeof value === 'string') return value
	if (value === null || value === undefined) return ''
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value) ?? ''
		} catch {
			return ''
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-base-to-string
	return String(value)
}

/** Fill `{param}` placeholders from the supplied input. */
function buildUrl(
	descriptor: ApiCapabilityDescriptor,
	input: Record<string, unknown>
): { url: string; missing: string[] } {
	const missing: string[] = []

	let path = descriptor.urlTemplate.replace(/\{([^}]+)\}/g, (_match, name: string) => {
		const value = input[name]
		if (value === undefined || value === null || value === '') {
			missing.push(name)
			return `{${name}}`
		}
		return encodeURIComponent(toText(value))
	})

	const search = new URLSearchParams()
	for (const field of descriptor.queryFields) {
		const value = input[field]
		if (value !== undefined && value !== null && value !== '') {
			search.set(field, toText(value))
		}
	}

	const query = search.toString()
	if (query) path += `?${query}`

	return { url: new URL(path, window.location.origin).href, missing }
}

export async function executeApiCapability(
	descriptor: ApiCapabilityDescriptor,
	input: Record<string, unknown>,
	signal?: AbortSignal
): Promise<ApiExecutionResult> {
	signal?.throwIfAborted()

	const { url, missing } = buildUrl(descriptor, input ?? {})

	if (missing.length > 0) {
		return {
			success: false,
			message: `❌ ${descriptor.name} needs ${missing.join(', ')} to build its URL.`,
		}
	}

	// Same-origin is enforced again at call time, not only at discovery time.
	if (new URL(url).origin !== window.location.origin) {
		return {
			success: false,
			message: `❌ Refusing to call ${url}: cross-origin API replay is not allowed.`,
		}
	}

	const hasBody = descriptor.method !== 'GET' && descriptor.method !== 'HEAD'
	const body: Record<string, unknown> = {}

	if (hasBody) {
		for (const field of descriptor.bodyFields) {
			const value = input[field]
			if (value !== undefined && value !== null && value !== '') body[field] = value
		}
	}

	try {
		const response = await fetch(url, {
			method: descriptor.method,
			// The page's own cookies and session travel with the request; we add none.
			credentials: 'same-origin',
			headers: {
				...(hasBody ? { 'Content-Type': 'application/json' } : {}),
				...descriptor.headers,
			},
			body: hasBody && Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
			signal,
		})

		const text = await response.text()
		const output = text.length > MAX_OUTPUT ? text.slice(0, MAX_OUTPUT) + '...' : text

		if (!response.ok) {
			return {
				success: false,
				status: response.status,
				message:
					`❌ ${descriptor.name} failed: ${descriptor.method} ${descriptor.urlTemplate} ` +
					`returned ${response.status}. The application rejected the request — ` +
					`its own rules still apply.`,
				output,
			}
		}

		return {
			success: true,
			status: response.status,
			message: `✅ ${descriptor.name} executed via ${descriptor.method} ${descriptor.urlTemplate}.`,
			output,
		}
	} catch (error) {
		if ((error as Error)?.name === 'AbortError') throw error
		return {
			success: false,
			message: `❌ ${descriptor.name} could not reach the endpoint: ${String(error)}`,
		}
	}
}
