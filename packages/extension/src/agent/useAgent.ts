/**
 * React hook for using AgentController
 */
import type {
	AgentActivity,
	AgentStatus,
	ExecutionResult,
	HistoricalEvent,
	SupportedLanguage,
} from '@page-agent/core'
import type { LLMConfig } from '@page-agent/llms'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MultiPageAgent } from './MultiPageAgent'
import { DEMO_CONFIG, migrateLegacyEndpoint } from './constants'

/** Language preference: undefined means follow system */
export type LanguagePreference = SupportedLanguage | undefined

export interface AdvancedConfig {
	maxSteps?: number
	systemInstruction?: string
	experimentalLlmsTxt?: boolean
	experimentalIncludeAllTabs?: boolean
	disableNamedToolChoice?: boolean
}

export interface ExtConfig extends LLMConfig, AdvancedConfig {
	language?: LanguagePreference
}

export interface UseAgentResult {
	status: AgentStatus
	history: HistoricalEvent[]
	activity: AgentActivity | null
	currentTask: string
	config: ExtConfig | null
	execute: (task: string) => Promise<ExecutionResult>
	stop: () => void
	configure: (config: ExtConfig) => Promise<void>
	/** Id of the tab group created for the current task, or null if none yet. */
	getTabGroupId: () => number | null
}

export function useAgent(): UseAgentResult {
	const agentRef = useRef<MultiPageAgent | null>(null)
	const [status, setStatus] = useState<AgentStatus>('idle')
	const [history, setHistory] = useState<HistoricalEvent[]>([])
	const [activity, setActivity] = useState<AgentActivity | null>(null)
	const [currentTask, setCurrentTask] = useState('')
	const [config, setConfig] = useState<ExtConfig | null>(null)

	useEffect(() => {
		chrome.storage.local.get(['llmConfig', 'language', 'advancedConfig']).then((result) => {
			let llmConfig = (result.llmConfig as LLMConfig) ?? DEMO_CONFIG
			const language = (result.language as SupportedLanguage) || undefined
			const advancedConfig = (result.advancedConfig as AdvancedConfig) ?? {}

			// Auto-migrate legacy testing endpoints
			const migrated = migrateLegacyEndpoint(llmConfig)
			if (migrated !== llmConfig) {
				llmConfig = migrated
				chrome.storage.local.set({ llmConfig: migrated })
			} else if (!result.llmConfig) {
				chrome.storage.local.set({ llmConfig: DEMO_CONFIG })
			}

			setConfig({ ...llmConfig, ...advancedConfig, language })
		})
	}, [])

	useEffect(() => {
		if (!config) return

		const { systemInstruction, ...agentConfig } = config
		const agent = new MultiPageAgent({
			...agentConfig,
			instructions: systemInstruction ? { system: systemInstruction } : undefined,
		})
		agentRef.current = agent

		const handleStatusChange = (e: Event) => {
			const newStatus = agent.status as AgentStatus
			setStatus(newStatus)
			if (newStatus === 'idle' || newStatus === 'completed' || newStatus === 'error') {
				setActivity(null)
			}
		}

		const handleHistoryChange = (e: Event) => {
			setHistory([...agent.history])
		}

		const handleActivity = (e: Event) => {
			const newActivity = (e as CustomEvent).detail as AgentActivity
			setActivity(newActivity)
		}

		agent.addEventListener('statuschange', handleStatusChange)
		agent.addEventListener('historychange', handleHistoryChange)
		agent.addEventListener('activity', handleActivity)

		return () => {
			agent.removeEventListener('statuschange', handleStatusChange)
			agent.removeEventListener('historychange', handleHistoryChange)
			agent.removeEventListener('activity', handleActivity)
			agent.dispose()
		}
	}, [config])

	const execute = useCallback(async (task: string) => {
		const agent = agentRef.current
		console.log('🚀 [useAgent] start executing task:', task)
		if (!agent) throw new Error('Agent not initialized')

		setCurrentTask(task)
		setHistory([])
		return agent.execute(task)
	}, [])

	const stop = useCallback(() => {
		agentRef.current?.stop()
	}, [])

	const getTabGroupId = useCallback(() => agentRef.current?.tabGroupId ?? null, [])

	const configure = useCallback(
		async ({
			language,
			maxSteps,
			systemInstruction,
			experimentalLlmsTxt,
			experimentalIncludeAllTabs,
			disableNamedToolChoice,
			...llmConfig
		}: ExtConfig) => {
			await chrome.storage.local.set({ llmConfig })
			if (language) {
				await chrome.storage.local.set({ language })
			} else {
				await chrome.storage.local.remove('language')
			}
			const advancedConfig: AdvancedConfig = {
				maxSteps,
				systemInstruction,
				experimentalLlmsTxt,
				experimentalIncludeAllTabs,
				disableNamedToolChoice,
			}
			await chrome.storage.local.set({ advancedConfig })
			setConfig({ ...llmConfig, ...advancedConfig, language })
		},
		[]
	)

	return {
		status,
		history,
		activity,
		currentTask,
		config,
		execute,
		stop,
		configure,
		getTabGroupId,
	}
}
