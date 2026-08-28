/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 */
import type { Capability, CapabilityReview, ReviewState, ReviewStore, RiskLevel } from './types'

const STORAGE_KEY = 'eb-agent:capability-reviews'

/**
 * Per-browser persistence for review decisions.
 *
 * @remarks
 * `localStorage` is deliberately the *default*, not the design: it keeps the
 * review loop working with no backend at all. Pass a different {@link ReviewStore}
 * to make decisions durable and team-wide.
 */
export class LocalReviewStore implements ReviewStore {
	readonly #key: string

	constructor(key: string = STORAGE_KEY) {
		this.#key = key
	}

	load(): Record<string, CapabilityReview> {
		try {
			const raw = globalThis.localStorage?.getItem(this.#key)
			if (!raw) return {}
			const parsed: unknown = JSON.parse(raw)
			return parsed && typeof parsed === 'object'
				? (parsed as Record<string, CapabilityReview>)
				: {}
		} catch {
			// Private mode, blocked storage, corrupt JSON — start clean rather than throw.
			return {}
		}
	}

	save(reviews: Record<string, CapabilityReview>): void {
		try {
			globalThis.localStorage?.setItem(this.#key, JSON.stringify(reviews))
		} catch {
			// Storage unavailable or full: reviews stay in memory for this session.
		}
	}
}

/** A store that keeps nothing — used when review is disabled. */
export class MemoryReviewStore implements ReviewStore {
	#reviews: Record<string, CapabilityReview> = {}

	load(): Record<string, CapabilityReview> {
		return this.#reviews
	}

	save(reviews: Record<string, CapabilityReview>): void {
		this.#reviews = reviews
	}
}

/**
 * Tracks the customer's approve / edit / reject decisions over generated
 * capabilities (§24), and applies them.
 *
 * @event change - Fired whenever a decision is recorded.
 */
export class CapabilityReviewManager extends EventTarget {
	readonly #store: ReviewStore
	#reviews: Record<string, CapabilityReview> = {}
	#loaded = false

	constructor(store: ReviewStore = new LocalReviewStore()) {
		super()
		this.#store = store
	}

	async load(): Promise<void> {
		if (this.#loaded) return
		this.#reviews = (await this.#store.load()) ?? {}
		this.#loaded = true
	}

	/**
	 * The review state of a capability.
	 *
	 * Declared capabilities (the site's own WebMCP tools, developer-registered
	 * tools, remote MCP tools) are approved implicitly — they are contracts someone
	 * wrote on purpose, not guesses. Only inferred ones need a human to look.
	 */
	stateOf(capability: Capability): ReviewState {
		const recorded = this.#reviews[capability.id]
		if (recorded) return recorded.state

		return capability.source === 'dom' ||
			capability.source === 'generated' ||
			capability.source === 'api'
			? 'pending'
			: 'approved'
	}

	get(capabilityId: string): CapabilityReview | undefined {
		return this.#reviews[capabilityId]
	}

	all(): CapabilityReview[] {
		return Object.values(this.#reviews)
	}

	/** Record a decision, optionally correcting the generated name/description/risk. */
	async set(
		capabilityId: string,
		state: ReviewState,
		edits?: { name?: string; description?: string; risk?: RiskLevel }
	): Promise<void> {
		this.#reviews[capabilityId] = {
			capabilityId,
			state,
			reviewedAt: Date.now(),
			...(edits?.name ? { name: edits.name } : {}),
			...(edits?.description ? { description: edits.description } : {}),
			...(edits?.risk ? { risk: edits.risk } : {}),
		}

		await this.#store.save(this.#reviews)
		this.dispatchEvent(new Event('change'))
	}

	async clear(capabilityId: string): Promise<void> {
		delete this.#reviews[capabilityId]
		await this.#store.save(this.#reviews)
		this.dispatchEvent(new Event('change'))
	}

	/**
	 * Apply a recorded edit to a capability. Returns the capability unchanged when
	 * the customer has not edited it.
	 */
	applyEdits(capability: Capability): Capability {
		const review = this.#reviews[capability.id]
		if (!review || (!review.name && !review.description && !review.risk)) return capability

		return {
			...capability,
			name: review.name ?? capability.name,
			description: review.description ?? capability.description,
			risk: review.risk ?? capability.risk,
		}
	}

	/** The §24 inventory line: how many were found, and how many still need a human. */
	summarize(capabilities: Capability[]): {
		discovered: number
		approved: number
		pending: number
		rejected: number
	} {
		let approved = 0
		let pending = 0
		let rejected = 0

		for (const capability of capabilities) {
			const state = this.stateOf(capability)
			if (state === 'approved') approved++
			else if (state === 'pending') pending++
			else rejected++
		}

		return { discovered: capabilities.length, approved, pending, rejected }
	}
}
