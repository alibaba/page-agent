/**
 * Hub WebSocket Protocol
 *
 * Hub connects as WS client to `ws://localhost:{port}`.
 * All messages are JSON. One task at a time.
 *
 * Inbound (Caller → Hub):
 *   { type: "execute", task: string, config?: object }
 *   { type: "stop" }
 *   { type: "tab_group",
 *       groupId: number,
 *       action: "close" | "ungroup" | "collapse" | "expand" }
 *     // Operate on a tab group (typically the one returned in a prior `result`).
 *     // "close"    - close every tab in the group (group disappears)
 *     // "ungroup"  - detach tabs from the group, keep them open
 *     // "collapse" - collapse the group
 *     // "expand"   - expand the group
 *     // Fire-and-forget: the hub applies the action best-effort and does not
 *     // respond. Failures are logged on the hub side only.
 *
 * Outbound (Hub → Caller):
 *   { type: "ready" }
 *   { type: "result",
 *       success: boolean,
 *       data: string,
 *       tabGroupId?: number }   // id of the tab group created for this task, if any
 *   { type: "error", message: string }
 *
 * Policy is intentionally left to the caller: the hub never cleans up tab
 * groups on its own. Callers that care about cleanup read `tabGroupId` from
 * `result` and send a `tab_group` action based on their own policy
 * (e.g. close on success, keep on failure).
 */
import type { ExecutionResult } from '@page-agent/core'
import { useEffect, useRef, useState } from 'react'

import type { ExtConfig } from '@/agent/useAgent'

// --- Protocol types ---

interface ExecuteMessage {
	type: 'execute'
	task: string
	config?: Record<string, unknown>
}

interface StopMessage {
	type: 'stop'
}

export type TabGroupAction = 'close' | 'ungroup' | 'collapse' | 'expand'

interface TabGroupMessage {
	type: 'tab_group'
	groupId: number
	action: TabGroupAction
}

type InboundMessage = ExecuteMessage | StopMessage | TabGroupMessage

interface ReadyMessage {
	type: 'ready'
}

interface ResultMessage {
	type: 'result'
	success: boolean
	data: string
	tabGroupId?: number
}

interface ErrorMessage {
	type: 'error'
	message: string
}

type OutboundMessage = ReadyMessage | ResultMessage | ErrorMessage

export type HubWsState = 'connecting' | 'connected' | 'disconnected'

// --- HubWs class ---

export interface HubWsHandlers {
	onExecute: (
		task: string,
		config?: Record<string, unknown>
	) => Promise<{ success: boolean; data: string; tabGroupId?: number }>
	onStop: () => void
	onTabGroupAction: (groupId: number, action: TabGroupAction) => Promise<void>
}

/**
 * Framework-agnostic WebSocket client for Hub.
 * Connects to an external WS server, receives tasks, dispatches to handlers,
 * and sends results back. No React, no DOM.
 */
export class HubWs {
	#ws: WebSocket | null = null
	#state: HubWsState = 'disconnected'
	#busy = false
	#approved = false
	#handlers: HubWsHandlers
	#port: number
	#onStateChange: (state: HubWsState) => void

	constructor(port: number, handlers: HubWsHandlers, onStateChange: (state: HubWsState) => void) {
		this.#port = port
		this.#handlers = handlers
		this.#onStateChange = onStateChange
	}

	get state() {
		return this.#state
	}

	get busy() {
		return this.#busy
	}

	connect() {
		if (this.#ws) return
		this.#setState('connecting')

		const ws = new WebSocket(`ws://localhost:${this.#port}`)
		this.#ws = ws

		ws.addEventListener('open', () => {
			this.#setState('connected')
			this.#send({ type: 'ready' })
		})

		ws.addEventListener('close', () => {
			this.#ws = null
			this.#busy = false
			this.#approved = false
			this.#setState('disconnected')
		})

		ws.addEventListener('message', (event) => {
			this.#handleMessage(event.data as string)
		})
	}

	disconnect() {
		this.#ws?.close()
		this.#ws = null
		this.#busy = false
		this.#approved = false
		this.#setState('disconnected')
	}

	#setState(state: HubWsState) {
		if (this.#state === state) return
		this.#state = state
		this.#onStateChange(state)
	}

	#send(msg: OutboundMessage) {
		if (this.#ws?.readyState === WebSocket.OPEN) {
			this.#ws.send(JSON.stringify(msg))
		}
	}

	async #handleMessage(raw: string) {
		let msg: InboundMessage
		try {
			msg = JSON.parse(raw)
		} catch {
			return
		}

		if (!(await this.#checkApproval())) {
			this.#send({ type: 'error', message: 'User denied the connection request.' })
			return
		}

		switch (msg.type) {
			case 'execute':
				this.#handleExecute(msg)
				break
			case 'stop':
				this.#handlers.onStop()
				break
			case 'tab_group':
				// Fire-and-forget. Surface failures in the hub console but do not
				// emit `error` (reserved for task-scoped errors).
				this.#handlers.onTabGroupAction(msg.groupId, msg.action).catch((err) => {
					console.error('[HubWs] tab_group action failed', msg, err)
				})
				break
		}
	}

	async #checkApproval(): Promise<boolean> {
		if (this.#approved) return true

		const { allowAllHubConnection } = await chrome.storage.local.get('allowAllHubConnection')
		if (allowAllHubConnection === true) {
			this.#approved = true
			return true
		}

		const ok = window.confirm(
			'An external application is requesting to control your browser via Page Agent Ext.\nAllow this session?'
		)
		if (ok) this.#approved = true
		return ok
	}

	async #handleExecute(msg: ExecuteMessage) {
		if (this.#busy) {
			this.#send({ type: 'error', message: 'Hub is busy with another task' })
			return
		}

		this.#busy = true
		try {
			const result = await this.#handlers.onExecute(msg.task, msg.config)
			this.#send({
				type: 'result',
				success: result.success,
				data: result.data,
				tabGroupId: result.tabGroupId,
			})
		} catch (err) {
			this.#send({ type: 'error', message: err instanceof Error ? err.message : String(err) })
		} finally {
			this.#busy = false
		}
	}
}

// --- Tab group actions (hub page has direct chrome API access) ---

async function applyTabGroupAction(groupId: number, action: TabGroupAction): Promise<void> {
	switch (action) {
		case 'close': {
			const tabs = await chrome.tabs.query({ groupId })
			const ids = tabs.map((t) => t.id).filter((id): id is number => id != null)
			if (ids.length) await chrome.tabs.remove(ids)
			return
		}
		case 'ungroup': {
			const tabs = await chrome.tabs.query({ groupId })
			const ids = tabs.map((t) => t.id).filter((id): id is number => id != null)
			if (ids.length) await chrome.tabs.ungroup(ids as [number, ...number[]])
			return
		}
		case 'collapse':
			await chrome.tabGroups.update(groupId, { collapsed: true })
			return
		case 'expand':
			await chrome.tabGroups.update(groupId, { collapsed: false })
			return
	}
}

// --- React hook ---

/**
 * React hook that bridges HubWs to the agent's execute/stop/configure.
 * Handles the config-before-execute dance internally.
 */
export function useHubWs(
	execute: (task: string) => Promise<ExecutionResult>,
	stop: () => void,
	configure: (config: ExtConfig) => Promise<void>,
	config: ExtConfig | null,
	getTabGroupId: () => number | null
): { wsState: HubWsState } {
	const wsPort = new URLSearchParams(location.search).get('ws')
	const [wsState, setWsState] = useState<HubWsState>(() => (wsPort ? 'connecting' : 'disconnected'))
	const hubWsRef = useRef<HubWs | null>(null)

	const latestRef = useRef({ execute, stop, configure, config, getTabGroupId })
	useEffect(() => {
		latestRef.current = { execute, stop, configure, config, getTabGroupId }
	})

	useEffect(() => {
		if (!wsPort) return

		const hubWs = new HubWs(
			Number(wsPort),
			{
				onExecute: async (task, incomingConfig) => {
					const { execute, configure, config, getTabGroupId } = latestRef.current
					if (incomingConfig) {
						await configure({ ...config, ...incomingConfig } as ExtConfig)
					}
					const result = await execute(task)
					return {
						success: result.success,
						data: result.data,
						tabGroupId: getTabGroupId() ?? undefined,
					}
				},
				onStop: () => latestRef.current.stop(),
				onTabGroupAction: applyTabGroupAction,
			},
			setWsState
		)

		hubWs.connect()
		hubWsRef.current = hubWs

		return () => {
			hubWs.disconnect()
			hubWsRef.current = null
		}
	}, [wsPort])

	return { wsState }
}
