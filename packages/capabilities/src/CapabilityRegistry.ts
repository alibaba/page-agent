/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 */
import {
	type Capability,
	type CapabilityInput,
	type CapabilitySource,
	SOURCE_PRIORITY,
} from './types'
import {
	businessActionKey,
	normalizeName,
	samePage,
	sanitizeDescription,
	sanitizeSchema,
} from './utils'

/**
 * Central store of everything the current application can do (§6).
 *
 * @remarks
 * A capability is registered once per source. When several sources describe the
 * same business action — the site declares `create_customer` via WebMCP, our DOM
 * scanner also inferred `add_customer` from the form — the registry keeps both but
 * only *exposes* the highest-priority one, so the planner never sees three
 * confusing variants of the same action (§12).
 *
 * @event change - Fired whenever the exposed capability set changes.
 */
export class CapabilityRegistry extends EventTarget {
	/** All registered capabilities, keyed by id. */
	readonly #capabilities = new Map<string, Capability>()

	/** Registration order, used as the tie-breaker so resolution is deterministic. */
	#sequence = 0
	readonly #order = new Map<string, number>()

	/**
	 * Register a capability. Returns the stored (normalized) capability.
	 *
	 * Name, description and schema are sanitized here rather than at each call site,
	 * because capabilities arriving from `native_webmcp` are site-authored text that
	 * ends up verbatim in the model prompt.
	 */
	register<TInput>(input: CapabilityInput<TInput>): Capability<TInput> {
		const name = normalizeName(input.name)
		const id = input.id ?? `${input.source}:${name}`

		const capability: Capability<TInput> = {
			...input,
			id,
			name,
			description: sanitizeDescription(input.description ?? ''),
			inputSchema: sanitizeSchema(input.inputSchema),
			outputSchema: input.outputSchema ? sanitizeSchema(input.outputSchema) : undefined,
			confidence: clampConfidence(input.confidence),
		}

		this.#capabilities.set(id, capability as Capability)
		if (!this.#order.has(id)) this.#order.set(id, this.#sequence++)

		this.#emitChange()

		return capability
	}

	/** Register many at once, emitting a single `change` event. */
	registerAll(inputs: CapabilityInput[]): Capability[] {
		const registered = inputs.map((input) => {
			const name = normalizeName(input.name)
			const id = input.id ?? `${input.source}:${name}`
			const capability: Capability = {
				...input,
				id,
				name,
				description: sanitizeDescription(input.description ?? ''),
				inputSchema: sanitizeSchema(input.inputSchema),
				outputSchema: input.outputSchema ? sanitizeSchema(input.outputSchema) : undefined,
				confidence: clampConfidence(input.confidence),
			}
			this.#capabilities.set(id, capability)
			if (!this.#order.has(id)) this.#order.set(id, this.#sequence++)
			return capability
		})

		if (registered.length > 0) this.#emitChange()

		return registered
	}

	/** Remove one capability by id. Returns whether anything was removed. */
	unregister(id: string): boolean {
		const removed = this.#capabilities.delete(id)
		this.#order.delete(id)
		if (removed) this.#emitChange()
		return removed
	}

	/**
	 * Drop every capability from a given source.
	 * Used to refresh volatile sources (native WebMCP tools change as the page
	 * changes; DOM-generated ones are re-derived on navigation) without disturbing
	 * developer-defined capabilities, which are registered once and must survive.
	 */
	unregisterBySource(source: CapabilitySource): number {
		let count = 0
		for (const [id, capability] of this.#capabilities) {
			if (capability.source === source) {
				this.#capabilities.delete(id)
				this.#order.delete(id)
				count++
			}
		}
		if (count > 0) this.#emitChange()
		return count
	}

	get(id: string): Capability | undefined {
		return this.#capabilities.get(id)
	}

	/** Look up an exposed capability by its planner-facing name. */
	getByName(name: string): Capability | undefined {
		const normalized = normalizeName(name)
		return this.list().find((capability) => capability.name === normalized)
	}

	/** Every registered capability, including ones shadowed by deduplication. */
	all(): Capability[] {
		return Array.from(this.#capabilities.values())
	}

	/**
	 * The capabilities the planner should see: deduplicated by business action,
	 * filtered to the current page, sorted by source priority.
	 *
	 * @param options.page - Current URL. Capabilities scoped to another page are excluded.
	 * @param options.minConfidence - Hide capabilities we are not sure about (§10).
	 */
	list(options?: { page?: string; minConfidence?: number }): Capability[] {
		const minConfidence = options?.minConfidence ?? 0
		const page = options?.page

		const candidates = this.all().filter((capability) => {
			if (capability.confidence < minConfidence) return false
			if (page && capability.page && !samePage(capability.page, page)) return false
			return true
		})

		// Deduplicate: one winner per business action.
		const byAction = new Map<string, Capability>()
		for (const capability of candidates) {
			const key = businessActionKey(capability.name)
			const incumbent = byAction.get(key)
			if (!incumbent || this.#outranks(capability, incumbent)) {
				byAction.set(key, capability)
			}
		}

		// A name collision across different business actions would produce two tools
		// with the same name in the LLM tool list, which providers reject. Keep the
		// stronger one.
		const byName = new Map<string, Capability>()
		for (const capability of byAction.values()) {
			const incumbent = byName.get(capability.name)
			if (!incumbent || this.#outranks(capability, incumbent)) {
				byName.set(capability.name, capability)
			}
		}

		return Array.from(byName.values()).sort((a, b) => {
			const priority = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]
			if (priority !== 0) return priority
			return (this.#order.get(a.id) ?? 0) - (this.#order.get(b.id) ?? 0)
		})
	}

	/** Capabilities hidden by deduplication, with the winner that shadowed them. */
	shadowed(options?: { page?: string; minConfidence?: number }): {
		capability: Capability
		shadowedBy: Capability
	}[] {
		const exposed = new Set(this.list(options).map((capability) => capability.id))
		const winners = new Map<string, Capability>()
		for (const capability of this.list(options)) {
			winners.set(businessActionKey(capability.name), capability)
		}

		const result: { capability: Capability; shadowedBy: Capability }[] = []
		for (const capability of this.all()) {
			if (exposed.has(capability.id)) continue
			const winner = winners.get(businessActionKey(capability.name))
			if (winner) result.push({ capability, shadowedBy: winner })
		}
		return result
	}

	clear(): void {
		if (this.#capabilities.size === 0) return
		this.#capabilities.clear()
		this.#order.clear()
		this.#emitChange()
	}

	get size(): number {
		return this.#capabilities.size
	}

	/**
	 * Higher source priority wins; ties break on confidence, then on registration
	 * order (earlier wins) so the exposed set is stable across calls.
	 */
	#outranks(candidate: Capability, incumbent: Capability): boolean {
		const candidateScore = SOURCE_PRIORITY[candidate.source]
		const incumbentScore = SOURCE_PRIORITY[incumbent.source]
		if (candidateScore !== incumbentScore) return candidateScore > incumbentScore
		if (candidate.confidence !== incumbent.confidence) {
			return candidate.confidence > incumbent.confidence
		}
		return (this.#order.get(candidate.id) ?? 0) < (this.#order.get(incumbent.id) ?? 0)
	}

	#emitChange(): void {
		this.dispatchEvent(new Event('change'))
	}
}

function clampConfidence(confidence: number | undefined): number {
	if (typeof confidence !== 'number' || Number.isNaN(confidence)) return 1
	return Math.min(1, Math.max(0, confidence))
}
