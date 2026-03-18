/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import { type AgentConfig, PageAgentCore } from '@page-agent/core'
import { PageController, type PageControllerConfig } from '@page-agent/page-controller'
import { Panel, type PanelConfig } from '@page-agent/ui'

export * from '@page-agent/core'

export type PageAgentConfig = AgentConfig &
	PageControllerConfig &
	Pick<PanelConfig, 'promptForNextTask' | 'taskInputMaxLength'>

export class PageAgent extends PageAgentCore {
	panel: Panel

	constructor(config: PageAgentConfig) {
		const pageController = new PageController({
			...config,
			enableMask: config.enableMask ?? true,
		})

		super({ ...config, pageController })

		this.panel = new Panel(this, {
			language: config.language,
			promptForNextTask: config.promptForNextTask,
			taskInputMaxLength: config.taskInputMaxLength,
		})
	}
}
