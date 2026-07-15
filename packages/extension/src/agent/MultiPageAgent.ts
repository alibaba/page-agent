import { type AgentConfig, PageAgentCore } from '@page-agent/core'

import { RemotePageController } from './RemotePageController'
import { TabsController } from './TabsController'
import SYSTEM_PROMPT from './system_prompt.md?raw'
import { createTabTools } from './tabTools'
import { createUploadTools } from './uploadTools'

/** Detect user language from browser settings */
function detectLanguage(): 'en-US' | 'zh-CN' {
	const lang = navigator.language || navigator.languages?.[0] || 'en-US'
	return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

interface MultiPageAgentConfig extends AgentConfig {
	includeInitialTab?: boolean
	experimentalIncludeAllTabs?: boolean
}

/**
 * MultiPageAgent
 * - use with extension
 * - can be used from a side panel or a content script
 */
export class MultiPageAgent extends PageAgentCore {
	constructor(config: MultiPageAgentConfig) {
		// multi page controller
		const tabsController = new TabsController()
		const pageController = new RemotePageController(tabsController)
		const customTools = {
			...createTabTools(tabsController),
			...createUploadTools(pageController),
		}

		// system prompt - auto-detect language if not specified
		const language = config.language ?? detectLanguage()
		const targetLanguage = language === 'zh-CN' ? '中文' : 'English'
		const systemPrompt = SYSTEM_PROMPT.replace(
			/Default working language: \*\*.*?\*\*/,
			`Default working language: **${targetLanguage}**`
		)

		const includeInitialTab = config.includeInitialTab ?? true
		const experimentalIncludeAllTabs = config.experimentalIncludeAllTabs ?? false

		/**
		 * Project agent status into chrome.storage. The content script polls
		 * `isAgentRunning` + `agentHeartbeat` (eventually consistent by design).
		 *
		 * When the agent is in side-panel and user closed the side-panel.
		 * There is no chance for isAgentRunning to be set false.
		 * (unload event doesn't work well in side panel.)
		 * (I'm trying not to use long-lived connection because the lifecycle of a sw is hard to predict.)
		 * This heartbeat mechanism acts as a backup.
		 */
		let heartBeatInterval: number | null = null

		super({
			...config,
			// Disabled: AbortSignal cannot cross contexts
			experimentalScriptExecutionTool: false,
			pageController: pageController as any,
			customTools: customTools,
			customSystemPrompt: systemPrompt,

			onBeforeTask: async (agent) => {
				await tabsController.init(agent.task, { includeInitialTab, experimentalIncludeAllTabs })
			},

			onBeforeStep: async (agent) => {
				// pull latest tab state so that tabs changes can be observed
				await tabsController.syncTabs()
				if (!tabsController.currentTabId) return
				// make sure the current tab is loaded before the step starts
				await tabsController.waitUntilTabLoaded(tabsController.currentTabId)
			},

			onDispose: () => {
				if (heartBeatInterval) {
					clearInterval(heartBeatInterval)
					heartBeatInterval = null
				}
				chrome.storage.local.set({ isAgentRunning: false }).catch(console.error)

				tabsController.dispose()
			},
		})

		this.addEventListener('statuschange', () => {
			const running = this.status === 'running'

			if (running && !heartBeatInterval) {
				heartBeatInterval = window.setInterval(() => {
					void chrome.storage.local.set({ agentHeartbeat: Date.now() })
				}, 1_000)
			} else if (!running && heartBeatInterval) {
				clearInterval(heartBeatInterval)
				heartBeatInterval = null
			}

			chrome.storage.local.set({ isAgentRunning: running }).catch(console.error)
		})
	}
}
