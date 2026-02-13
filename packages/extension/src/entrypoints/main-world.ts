import type { AgentActivity, AgentStatus, ExecutionResult, HistoricalEvent } from '@page-agent/core'

export type Execute = (task: string, config: ExecuteConfig) => Promise<ExecutionResult>

export interface ExecuteConfig {
	baseURL: string
	apiKey: string
	model: string

	/**
	 * Whether to include the initial tab (that holds this main world script) in the task.
	 * @default true
	 */
	includeInitialTab?: boolean

	onStatusChange?: (status: AgentStatus) => void
	onActivity?: (activity: AgentActivity) => void
	onHistoryUpdate?: (history: HistoricalEvent[]) => void
}

export default defineUnlistedScript(() => {
	let _lastId = 0
	function getId() {
		_lastId += 1
		return _lastId
	}

	const execute: Execute = async (task, config) => {
		if (typeof task !== 'string') throw new Error('Task must be a string')
		if (task.trim().length === 0) throw new Error('Task cannot be empty')
		if (!config) throw new Error('Config is required')
		if (!config.baseURL) throw new Error('Config must have a baseURL')
		if (!config.apiKey) throw new Error('Config must have an apiKey')
		if (!config.model) throw new Error('Config must have a model')

		const id = getId()

		const promise = new Promise<ExecutionResult>((resolve, reject) => {
			function handleMessage(e: MessageEvent) {
				const data = e.data
				if (typeof data !== 'object' || data === null) return
				if (data.channel !== 'PAGE_AGENT_EXT_RESPONSE') return
				if (data.id !== id) return

				// events

				if (data.action === 'status_change_event' && config.onStatusChange) {
					config.onStatusChange(data.payload)
					return
				}

				if (data.action === 'activity_event' && config.onActivity) {
					config.onActivity(data.payload)
					return
				}

				if (data.action === 'history_change_event' && config.onHistoryUpdate) {
					config.onHistoryUpdate(data.payload)
					return
				}

				if (data.action !== 'execute_result') return

				// execute_result

				window.removeEventListener('message', handleMessage)

				if (data.error) {
					reject(new Error(data.error))
				} else {
					resolve(data.payload)
				}
			}

			// @note will be removed on dispose or result
			window.addEventListener('message', handleMessage)
		})

		window.postMessage(
			{
				channel: 'PAGE_AGENT_EXT_REQUEST',
				id,
				action: 'execute',
				payload: {
					task,
					config: {
						baseURL: config.baseURL,
						apiKey: config.apiKey,
						model: config.model,
						includeInitialTab: config.includeInitialTab,
					},
				},
			},
			'*'
		)

		return promise
	}

	const stop = () => {
		const id = getId()

		window.postMessage(
			{
				channel: 'PAGE_AGENT_EXT_REQUEST',
				id,
				action: 'stop',
			},
			'*'
		)
	}

	;(window as any).PAGE_AGENT_EXT_VERSION = __EXT_VERSION__
	;(window as any).PAGE_AGENT_EXT = {
		version: __EXT_VERSION__,
		execute,
		stop,
	}
})
