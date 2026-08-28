/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 */
import type { CapabilityRegistry } from './CapabilityRegistry'
import type { Capability } from './types'
import { businessActionKey, normalizeName } from './utils'

/** What the resolver decided to do with a requested action. */
export type Resolution =
	| { kind: 'capability'; capability: Capability; matchedBy: 'name' | 'action' | 'similarity' }
	| { kind: 'dom_fallback'; reason: string }

export interface ResolveOptions {
	page?: string
	minConfidence?: number
	/**
	 * Minimum token-overlap score for a fuzzy match, 0..1.
	 * Below this we prefer honest DOM fallback over calling the wrong tool.
	 * @default 0.6
	 */
	similarityThreshold?: number
}

/**
 * Maps a requested action onto the best available implementation (§13).
 *
 * @remarks
 * The point of this indirection is that `search_customer` can be backed by WebMCP
 * today and by a real API tomorrow without the planner noticing. When nothing
 * matches, the resolver says so explicitly and the agent falls back to the existing
 * free-form DOM automation — the compatibility layer, not a failure mode (§14).
 */
export class CapabilityResolver {
	readonly #registry: CapabilityRegistry

	constructor(registry: CapabilityRegistry) {
		this.#registry = registry
	}

	/**
	 * Resolve a requested action name (or a short natural-language intent) to a
	 * capability, or report that DOM automation should handle it.
	 */
	resolve(request: string, options: ResolveOptions = {}): Resolution {
		const candidates = this.#registry.list({
			page: options.page,
			minConfidence: options.minConfidence,
		})

		if (candidates.length === 0) {
			return { kind: 'dom_fallback', reason: 'No capabilities are registered for this page.' }
		}

		const requestedName = normalizeName(request)

		const exact = candidates.find((capability) => capability.name === requestedName)
		if (exact) return { kind: 'capability', capability: exact, matchedBy: 'name' }

		const requestedAction = businessActionKey(request)
		const sameAction = candidates.find(
			(capability) => businessActionKey(capability.name) === requestedAction
		)
		if (sameAction) return { kind: 'capability', capability: sameAction, matchedBy: 'action' }

		const threshold = options.similarityThreshold ?? 0.6
		const requestTokens = tokenize(request)

		let best: { capability: Capability; score: number } | null = null
		for (const capability of candidates) {
			const score = overlap(requestTokens, tokenize(`${capability.name} ${capability.description}`))
			if (score >= threshold && (!best || score > best.score)) {
				best = { capability, score }
			}
		}

		if (best) return { kind: 'capability', capability: best.capability, matchedBy: 'similarity' }

		return {
			kind: 'dom_fallback',
			reason: `No capability matches "${request}". Falling back to DOM automation.`,
		}
	}

	/** Whether a structured implementation exists, i.e. DOM automation is avoidable. */
	has(request: string, options?: ResolveOptions): boolean {
		return this.resolve(request, options).kind === 'capability'
	}
}

function tokenize(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((token) => token.length > 2)
	)
}

/** Fraction of the request's tokens that appear in the candidate. */
function overlap(request: Set<string>, candidate: Set<string>): number {
	if (request.size === 0) return 0
	let hits = 0
	for (const token of request) {
		if (candidate.has(token)) hits++
	}
	return hits / request.size
}
