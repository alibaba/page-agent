/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 */
import type { Capability, PolicyConfig, PolicyDecision } from './types'

/**
 * Decides whether a capability may run, and whether a human must say yes first (§15).
 *
 * @remarks
 * This gate lives in eb-agent rather than in individual tools on purpose. WebMCP has
 * no shipped mechanism for a tool to demand confirmation — `requestUserInteraction()`
 * is still in development — so a site-declared `refund_payment` tool would otherwise
 * execute with nothing standing between the model and the user's money.
 */
export class PolicyEngine {
	#config: Required<Pick<PolicyConfig, 'autoApproveReversible' | 'autoApproveConsequential'>> &
		PolicyConfig

	constructor(config: PolicyConfig = {}) {
		this.#config = {
			autoApproveReversible: config.autoApproveReversible ?? true,
			autoApproveConsequential: config.autoApproveConsequential ?? false,
			...config,
		}
	}

	get config(): PolicyConfig {
		return this.#config
	}

	update(config: PolicyConfig): void {
		this.#config = { ...this.#config, ...config }
	}

	evaluate(capability: Capability): PolicyDecision {
		const { allowlist, blocklist } = this.#config

		if (blocklist?.includes(capability.name)) {
			return {
				allowed: false,
				requiresApproval: false,
				reason: `Capability "${capability.name}" is blocked by policy.`,
			}
		}

		if (allowlist && !allowlist.includes(capability.name)) {
			return {
				allowed: false,
				requiresApproval: false,
				reason: `Capability "${capability.name}" is not in the configured allowlist.`,
			}
		}

		switch (capability.risk) {
			case 'read':
				return { allowed: true, requiresApproval: false }

			case 'reversible':
				return {
					allowed: true,
					requiresApproval: !this.#config.autoApproveReversible,
				}

			case 'consequential':
				return {
					allowed: true,
					requiresApproval: !this.#config.autoApproveConsequential,
				}

			default:
				// Unknown risk level: treat as the most dangerous rather than the least.
				return { allowed: true, requiresApproval: true }
		}
	}
}
