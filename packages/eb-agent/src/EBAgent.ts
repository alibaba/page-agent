/**
 * Copyright (C) 2025 EqualByte
 * All rights reserved.
 */
import { type AgentConfig, EBAgentCore } from '@eb-agent/core'
import { PageController, type PageControllerConfig } from '@eb-agent/page-controller'
import {
	CapabilityDashboard,
	type CapabilityDashboardAdapter,
	Panel,
	type PanelConfig,
} from '@eb-agent/ui'

export * from '@eb-agent/core'

export type EBAgentConfig = AgentConfig & PageControllerConfig & Omit<PanelConfig, 'language'>

export class EBAgent extends EBAgentCore {
	panel: Panel

	/** Lazily created — most pages never open the review screen. */
	#dashboard: CapabilityDashboard | null = null

	constructor(config: EBAgentConfig) {
		const pageController = new PageController({
			...config,
			enableMask: config.enableMask ?? true,
		})

		super({ ...config, pageController })

		this.panel = new Panel(this, {
			language: config.language,
			promptForNextTask: config.promptForNextTask,
		})
	}

	/**
	 * Open the capability review dashboard (§24): what eb-agent discovered on this
	 * application, what it is confident about, and what still needs a human to
	 * approve before external agents can call it.
	 *
	 * @example
	 * const agent = new EBAgent({ ...config, capabilities: { generateFromDom: true } })
	 * agent.showCapabilities()
	 */
	showCapabilities(options?: { page?: string }): CapabilityDashboard {
		this.#dashboard ??= new CapabilityDashboard(
			// CapabilityManager already matches the adapter shape; the dashboard only
			// ever reads the inventory and writes review decisions.
			this.capabilities as unknown as CapabilityDashboardAdapter,
			{ page: options?.page }
		)

		this.#dashboard.open()
		return this.#dashboard
	}

	override dispose(): void {
		this.#dashboard?.dispose()
		this.#dashboard = null
		super.dispose()
	}
}
