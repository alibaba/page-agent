/**
 * Type-safe event bus for decoupling PageAgent and Panel
 */
import type { Step } from '../ui/UIState'

/**
 * Event mapping definitions
 * @note Event bus callbacks must be repeatable without errors
 */
export interface PageAgentEventMap {
	// Panel control events
	// call panel.show()
	'panel:show': { params: undefined }
	// call panel.hide()
	'panel:hide': { params: undefined }
	// call panel.reset()
	'panel:reset': { params: undefined }
	// call panel.update()
	'panel:update': { params: Omit<Step, 'id' | 'stepNumber' | 'timestamp'> }
	// call panel.expand()
	'panel:expand': { params: undefined }
	// call panel.collapse()
	'panel:collapse': { params: undefined }

	// PageAgent status events
	// 'agent:beforeUpdate': { params: undefined }
	// 'agent:afterUpdate': { params: undefined }
	// 'agent:execute': { params: { task: string } }
	// 'agent:done': { params: { text: string; success: boolean } }
	// 'agent:paused': { params: undefined }
	// 'agent:resumed': { params: undefined }
	// 'agent:disposed': { params: undefined }
	// 'agent:error': { params: { error: string | Error } }

	// Task status change events
	// 'task:start': { params: { task: string } }
	// 'task:step': { params: Omit<AgentStep, 'id' | 'stepNumber' | 'timestamp'> }
	// 'task:complete': { params: { text: string; success: boolean } }
	// 'task:error': { params: { error: string | Error } }

	// Index signature for dynamic event names
	// [key: string]: { params: any }
}

/**
 * Event handler type definitions
 */
export type EventHandler<T extends keyof PageAgentEventMap> =
	PageAgentEventMap[T]['params'] extends undefined
		? () => void
		: (params: PageAgentEventMap[T]['params']) => void

/**
 * Async event handler type definitions
 */
export type AsyncEventHandler<T extends keyof PageAgentEventMap> =
	PageAgentEventMap[T]['params'] extends undefined
		? () => Promise<void>
		: (params: PageAgentEventMap[T]['params']) => Promise<void>

/**
 * Type-safe event bus
 * @note Mainly used to decouple logic and UI
 * @note All modules of a PageAgent instance share the same EventBus instance for communication
 * @note Use with caution if delivery guarantee is needed for logic communication
 * @note `on` `once` `emit` methods handle built-in events with type protection, use `addEventListener` for other events
 */
class EventBus extends EventTarget {
	/**
	 * Listen to built-in events
	 */
	on<T extends keyof PageAgentEventMap>(event: T, handler: EventHandler<T>): void {
		const wrappedHandler = (e: Event) => {
			const customEvent = e as CustomEvent
			const params = customEvent.detail?.[0]
			return handler(params)
		}
		this.addEventListener(event, wrappedHandler)
	}

	/**
	 * Listen to built-in events (one-time)
	 */
	once<T extends keyof PageAgentEventMap>(event: T, handler: EventHandler<T>): void {
		const wrappedHandler = (e: Event) => {
			const customEvent = e as CustomEvent
			const params = customEvent.detail?.[0]
			return handler(params)
		}
		this.addEventListener(event, wrappedHandler, { once: true })
	}

	/**
	 * Emit built-in events
	 */
	emit<T extends keyof PageAgentEventMap>(
		event: T,
		...args: PageAgentEventMap[T]['params'] extends undefined
			? []
			: [PageAgentEventMap[T]['params']]
	): void {
		const customEvent = new CustomEvent(event, { detail: args })
		this.dispatchEvent(customEvent)
		return
	}
}

const buses = new Map<string, EventBus>()

/**
 * Get the event bus for a given channel
 */
export function getEventBus(channel: string) {
	if (buses.has(channel)) {
		return buses.get(channel)!
	}
	const bus = new EventBus()
	buses.set(channel, bus)
	return bus
}

export type { EventBus }
