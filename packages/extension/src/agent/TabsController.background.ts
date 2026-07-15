/**
 * background logics for TabsController
 *
 * Keep this stateless: pure request/response handlers only, no in-memory
 * state, no ports, no event pushing. MV3 SW should be killed and restarted at
 * any time (idle timeout, extension update) without special handling.
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
			return true
		}

		case 'open_new_tab': {
			debug('open_new_tab', payload)
			chrome.tabs
				.create({ url: payload.url, windowId: payload.windowId, active: false })
				.then((newTab) => {
					debug('open_new_tab: success', newTab)
					sendResponse({ success: true, tabId: newTab.id })
				})
				.catch((error) => {
					sendResponse({ error: error instanceof Error ? error.message : String(error) })
				})
			return true
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
			return true
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
			return true
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
			return true
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
			return true
		}

		case 'get_window_tabs': {
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
