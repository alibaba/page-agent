/**
 * Copyright (C) 2025 EqualByte
 * All rights reserved.
 */
import { type AgentConfig, PageOSCore } from '@page-os/core'
import { PageController, type PageControllerConfig } from '@page-os/page-controller'
import { Panel, type PanelConfig } from '@page-os/ui'

export * from '@page-os/core'

export type PageOSConfig = AgentConfig & PageControllerConfig & Omit<PanelConfig, 'language'>

export class PageOS extends PageOSCore {
	panel: Panel

	constructor(config: PageOSConfig) {
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
}
