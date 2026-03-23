/**
 * background logics for TabsController
 */
import type { TabAction } from './TabsController'

const PREFIX = '[TabsController.background]'

function debug(...messages: any[]) {
	console.debug(`\x1b[90m${PREFIX}\x1b[0m`, ...messages)
}

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
				.query({ active: true, currentWindow: true })
				.then((tabs) => {
					const tabId = tabs.length > 0 ? tabs[0].id || null : null
					debug('get_active_tab: success', tabId)
					sendResponse({ success: true, tabId })
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
				.group({ tabIds: payload.tabIds })
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

		default:
			sendResponse({ error: `Unknown action: ${action}` })
			return
	}
}

export function setupTabChangeEvents() {
	console.log('[TabsController.background] setupTabChangeEvents')

	chrome.tabs.onCreated.addListener((tab) => {
		debug('onCreated', tab)
		chrome.runtime
			.sendMessage({ type: 'TAB_CHANGE', action: 'created', payload: { tab } })
			.catch((error) => {
				debug('onCreated error:', error)
			})
	})

	chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
		debug('onRemoved', tabId, removeInfo)
		chrome.runtime
			.sendMessage({
				type: 'TAB_CHANGE',
				action: 'removed',
				payload: { tabId, removeInfo },
			})
			.catch((error) => {
				debug('onRemoved error:', error)
			})
	})

	chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		debug('onUpdated', tabId, changeInfo)
		chrome.runtime
			.sendMessage({
				type: 'TAB_CHANGE',
				action: 'updated',
				payload: { tabId, changeInfo, tab },
			})
			.catch((error) => {
				debug('onUpdated error:', error)
			})
	})
}
