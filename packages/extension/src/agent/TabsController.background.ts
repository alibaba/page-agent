/**
 * background logics for TabsController
 */
import type { TabAction } from './TabsController'

const PREFIX = '[TabsController.background]'

const debug = console.debug.bind(console, `\x1b[90m${PREFIX}\x1b[0m`)

export function handleTabControlMessage(
	message: { type: 'TAB_CONTROL'; action: TabAction; payload: any },
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void
): true | undefined {
	const { action, payload } = message

	switch (action as TabAction) {
		case 'get_active_tab': {
			debug('get_active_tab')
			chrome.tabs
				.query({ active: true })
				.then((tabs) => {
					debug('get_active_tab: success', tabs)
					sendResponse({ success: true, tab: tabs[0] })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'get_tab_info': {
			debug('get_tab_info', payload)
			chrome.tabs
				.get(payload.tabId)
				.then((tab) => {
					debug('get_tab_info: success', tab)
					sendResponse(tab)
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'open_new_tab': {
			debug('open_new_tab', payload)
			chrome.tabs
				.create({ url: payload.url, active: false })
				.then((newTab) => {
					debug('open_new_tab: success', newTab)
					sendResponse({ success: true, tabId: newTab.id })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'create_tab_group': {
			debug('create_tab_group', payload)
			chrome.tabs
				.group({ tabIds: payload.tabIds, createProperties: { windowId: payload.windowId } })
				.then((groupId) => {
					debug('create_tab_group: success', groupId)
					sendResponse({ success: true, groupId })
				})
				.catch((error) => {
					console.error(PREFIX, 'Failed to create tab group', error)
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'update_tab_group': {
			debug('update_tab_group', payload)
			chrome.tabGroups
				.update(payload.groupId, payload.properties)
				.then(() => {
					sendResponse({ success: true })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'add_tab_to_group': {
			debug('add_tab_to_group', payload)
			chrome.tabs
				.group({ tabIds: payload.tabId, groupId: payload.groupId })
				.then(() => {
					sendResponse({ success: true })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'activate_tab': {
			debug('activate_tab', payload)
			chrome.tabs
				.update(payload.tabId, { active: true })
				.then(() => {
					sendResponse({ success: true })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'focus_window': {
			debug('focus_window', payload)
			chrome.windows
				.update(payload.windowId, { focused: true })
				.then(() => {
					sendResponse({ success: true })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'close_tab': {
			debug('close_tab', payload)
			chrome.tabs
				.remove(payload.tabId)
				.then(() => {
					sendResponse({ success: true })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true // async response
		}

		case 'get_window_tabs': {
			debug('get_window_tabs', payload)
			chrome.tabs
				.query({ windowId: payload.windowId })
				.then((tabs) => {
					sendResponse({ success: true, tabs })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true
		}

		default:
			sendResponse({ error: `Unknown action: ${action}` })
			return
	}
}

const tabEventPorts = new Set<chrome.runtime.Port>()

function broadcastTabEvent(message: object) {
	for (const port of tabEventPorts) {
		port.postMessage(message)
	}
}

/**
 * Port-based tab events: agents connect via `chrome.runtime.connect({ name: 'tab-events' })`
 * and receive tab change events through the port. Works for both extension pages and content scripts.
 */
export function setupTabEventsPort() {
	chrome.runtime.onConnect.addListener((port) => {
		if (port.name !== 'tab-events') return

		debug('port connected', port.sender?.tab?.id ?? port.sender?.url)
		tabEventPorts.add(port)

		port.onDisconnect.addListener(() => {
			debug('port disconnected')
			tabEventPorts.delete(port)
		})
	})

	chrome.tabs.onCreated.addListener((tab) => {
		broadcastTabEvent({ action: 'created', payload: { tab } })
	})

	chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
		broadcastTabEvent({ action: 'removed', payload: { tabId, removeInfo } })
	})

	chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		broadcastTabEvent({ action: 'updated', payload: { tabId, changeInfo, tab } })
	})
}
