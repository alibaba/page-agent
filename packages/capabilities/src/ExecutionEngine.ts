/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 */
import type { CapabilityRegistry } from './CapabilityRegistry'
import type { PolicyEngine } from './PolicyEngine'
import type { ApprovalHandler, AuditEvent, Capability, CapabilityResult, RiskLevel } from './types'
import { normalizeResult, resolveAnnotations, summarizeForApproval } from './utils'

/** Raised when policy or a human refused the execution. Not a bug — a decision. */
export class CapabilityDeniedError extends Error {
	readonly capabilityName: string
	readonly risk: RiskLevel

	constructor(capabilityName: string, risk: RiskLevel, message: string) {
		super(message)
		this.name = 'CapabilityDeniedError'
		this.capabilityName = capabilityName
		this.risk = risk
	}
}

export interface ExecutionEngineConfig {
	registry: CapabilityRegistry
	policy: PolicyEngine
	/** Identifies the run in audit records. */
	session: string
	user?: string
	/** Required before any `consequential` capability can run (§16). */
	onApproval?: ApprovalHandler
	/** Called for every attempt, approved or not (§17). */
	onAudit?: (event: AuditEvent) => void
}

/**
 * Runs capabilities through the full pipeline (§15):
 *
 * ```
 * Tool requested → Policy Engine → Risk check → Permission check
 *   → Optional human approval → Execute → Audit log
 * ```
 *
 * The planner calls this and nothing else; how a capability is actually carried out
 * (WebMCP, API, DOM) is the capability's own business.
 */
export class ExecutionEngine {
	readonly #config: ExecutionEngineConfig

	constructor(config: ExecutionEngineConfig) {
		this.#config = config
	}

	get registry(): CapabilityRegistry {
		return this.#config.registry
	}

	get policy(): PolicyEngine {
		return this.#config.policy
	}

	/** Update the mutable parts of the config between tasks. */
	configure(config: Partial<Pick<ExecutionEngineConfig, 'session' | 'user' | 'onApproval'>>): void {
		if (config.session !== undefined) this.#config.session = config.session
		if (config.user !== undefined) this.#config.user = config.user
		if (config.onApproval !== undefined) this.#config.onApproval = config.onApproval
	}

	/** Execute by planner-facing name. Throws if no such capability is exposed. */
	async executeByName(
		name: string,
		input: unknown,
		options: { signal: AbortSignal; page?: string }
	): Promise<CapabilityResult> {
		const capability = this.#config.registry.getByName(name)
		if (!capability) {
			throw new Error(`Capability "${name}" is not available on this page.`)
		}
		return this.execute(capability, input, options)
	}

	async execute(
		capability: Capability,
		input: unknown,
		options: { signal: AbortSignal; page?: string }
	): Promise<CapabilityResult> {
		const { signal, page } = options
		const startTime = Date.now()

		signal.throwIfAborted()

		const decision = this.#config.policy.evaluate(capability)

		if (!decision.allowed) {
			this.#audit(capability, input, {
				startTime,
				status: 'denied',
				approved: false,
				error: decision.reason,
				page,
			})
			throw new CapabilityDeniedError(
				capability.name,
				capability.risk,
				decision.reason ?? `Capability "${capability.name}" was denied by policy.`
			)
		}

		let approved: boolean | undefined

		if (decision.requiresApproval) {
			const handler = this.#config.onApproval
			if (!handler) {
				const reason =
					`Capability "${capability.name}" is ${capability.risk} and needs human approval, ` +
					`but no approval handler is configured. Refusing to run it.`
				this.#audit(capability, input, {
					startTime,
					status: 'denied',
					approved: false,
					error: reason,
					page,
				})
				throw new CapabilityDeniedError(capability.name, capability.risk, reason)
			}

			approved = await handler(
				{ capability, input, summary: summarizeForApproval(capability, input) },
				{ signal }
			)

			signal.throwIfAborted()

			if (!approved) {
				const reason = `The user declined "${capability.name}".`
				this.#audit(capability, input, {
					startTime,
					status: 'denied',
					approved: false,
					error: reason,
					page,
				})
				throw new CapabilityDeniedError(capability.name, capability.risk, reason)
			}
		}

		try {
			const raw = await capability.execute(input, { signal })

			// Enforce cancellation even if the capability ignored the signal.
			signal.throwIfAborted()

			const result = normalizeResult(raw)
			const annotations = resolveAnnotations(capability)
			if (annotations.untrustedContentHint) result.untrusted = true

			this.#audit(capability, input, {
				startTime,
				status: 'success',
				approved,
				result: result.content,
				page,
			})

			return result
		} catch (error) {
			this.#audit(capability, input, {
				startTime,
				status: 'error',
				approved,
				error: error instanceof Error ? error.message : String(error),
				page,
			})
			throw error
		}
	}

	#audit(
		capability: Capability,
		input: unknown,
		partial: {
			startTime: number
			status: AuditEvent['status']
			approved?: boolean
			result?: string
			error?: string
			page?: string
		}
	): void {
		const onAudit = this.#config.onAudit
		if (!onAudit) return

		const event: AuditEvent = {
			user: this.#config.user,
			session: this.#config.session,
			tool: capability.name,
			capabilityId: capability.id,
			arguments: input,
			executionType: capability.executionType,
			source: capability.source,
			risk: capability.risk,
			approved: partial.approved,
			startTime: partial.startTime,
			durationMs: Date.now() - partial.startTime,
			status: partial.status,
			result: partial.result,
			error: partial.error,
			page: partial.page ?? capability.page,
		}

		try {
			onAudit(event)
		} catch (error) {
			// An audit sink must never break execution.
			console.error('[capabilities] onAudit handler threw:', error)
		}
	}
}
