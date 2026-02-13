/**
 * React hook for using AgentController
 */
import type { AgentActivity, AgentStatus, HistoricalEvent } from '@page-agent/core'
import type { LLMConfig } from '@page-agent/llms'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MultiPageAgent } from './MultiPageAgent'
import { DEMO_CONFIG } from './constants'

export interface UseAgentResult {
	status: AgentStatus
	history: HistoricalEvent[]
	activity: AgentActivity | null
	currentTask: string
	config: LLMConfig | null
	execute: (task: string) => Promise<void>
	stop: () => void
	configure: (config: LLMConfig) => Promise<void>
}

export function useAgent(): UseAgentResult {
	const agentRef = useRef<MultiPageAgent | null>(null)
	const [status, setStatus] = useState<AgentStatus>('idle')
	const [history, setHistory] = useState<HistoricalEvent[]>([])
	const [activity, setActivity] = useState<AgentActivity | null>(null)
	const [currentTask, setCurrentTask] = useState('')
	const [config, setConfig] = useState<LLMConfig | null>(null)

	useEffect(() => {
		chrome.storage.local.get('llmConfig').then((result) => {
			if (result.llmConfig) {
				setConfig(result.llmConfig as LLMConfig)
			} else {
				chrome.storage.local.set({ llmConfig: DEMO_CONFIG })
				setConfig(DEMO_CONFIG)
			}
		})
	}, [])

	useEffect(() => {
		if (!config) return

		const agent = new MultiPageAgent(config)
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
		await agent.execute(task)
	}, [])

	const stop = useCallback(() => {
		agentRef.current?.stop()
	}, [])

	const configure = useCallback(async (newConfig: LLMConfig) => {
		await chrome.storage.local.set({ llmConfig: newConfig })
		setConfig(newConfig)
	}, [])

	return {
		status,
		history,
		activity,
		currentTask,
		config,
		execute,
		stop,
		configure,
	}
}
