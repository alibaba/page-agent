import { handlePageControlMessage } from '@/agent/RemotePageController.background'
import { handleTabControlMessage, setupTabEventsPort } from '@/agent/TabsController.background'

// Native Messaging connection
let nativePort: chrome.runtime.Port | null = null

function connectToNativeHost() {
	if (nativePort) {
		try {
			nativePort.disconnect()
		} catch (_) {}
		nativePort = null
	}

	try {
		nativePort = chrome.runtime.connectNative('page-agent.launcher')

		nativePort.onMessage.addListener((msg: any) => {
			console.log('[NativeHost] Received:', msg)

			// Handshake acknowledgment
			if (msg.type === 'handshake-ack') {
				console.log('[NativeHost] Handshake acknowledged')
				return
			}

			// Forward to content script or handle locally
			if (msg.action && msg.requestId && msg.tabId != null) {
				handleNativeMessage(msg).then(
					(result) => {
						nativePort?.postMessage({
							requestId: msg.requestId,
							success: true,
							result,
						})
					},
					(error) => {
						nativePort?.postMessage({
							requestId: msg.requestId,
							success: false,
							error: error instanceof Error ? error.message : String(error),
						})
					}
				)
			}
		})

		nativePort.onDisconnect.addListener(() => {
			const lastError = chrome.runtime.lastError
			if (lastError) {
				console.error('[NativeHost] Disconnect error:', lastError.message)
			}
			nativePort = null
			setTimeout(connectToNativeHost, 1000)
		})

		console.log('[NativeHost] Connected to native host')
	} catch (e) {
		console.error('[NativeHost] Native Host not available:', e)
		nativePort = null
		setTimeout(connectToNativeHost, 5000)
	}
}

async function handleNativeMessage(msg: any): Promise<any> {
	const { action, payload, tabId } = msg

	if (action === 'SCREENSHOT') {
		return await captureTab(tabId)
	}

	if (action === 'GET_STATE' || action === 'CLICK' || action === 'TYPE' || action === 'SELECT_OPTION' || action === 'SCROLL' || action === 'SCROLL_HORIZONTALLY' || action === 'EXECUTE_JS') {
		return await chrome.tabs.sendMessage(tabId, {
			type: 'PAGE_CONTROL',
			action,
			payload,
		})
	}

	throw new Error(`Unknown action: ${action}`)
}

async function captureTab(tabId: number): Promise<string> {
	try {
		let tab = await chrome.tabs.get(tabId)

		if ((tab as any).discarded || (tab as any).frozen) {
			await chrome.tabs.update(tabId, { active: true })
			for (let i = 0; i < 50; i++) {
				await new Promise((r) => setTimeout(r, 100))
				tab = await chrome.tabs.get(tabId)
				if (tab.status === 'complete') break
			}
		}

		if (!tab.active) {
			await chrome.tabs.update(tabId, { active: true })
			await new Promise((r) => setTimeout(r, 300))
		}

		if (!tab?.windowId) {
			throw new Error('Tab or window not found')
		}

		const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
		return dataUrl
	} catch (e: any) {
		const msg = e?.message ?? String(e)
		if (msg.includes('No tab with id')) {
			throw new Error(`Tab ${tabId} was closed`)
		}
		throw e
	}
}

export default defineBackground(() => {
	console.log('[Background] Service Worker started')

	// Connect to native host
	connectToNativeHost()

	// tab change events

	setupTabEventsPort()

	// generate user auth token

	chrome.storage.local.get('PageAgentExtUserAuthToken').then((result) => {
		if (result.PageAgentExtUserAuthToken) return

		const userAuthToken = crypto.randomUUID()
		chrome.storage.local.set({ PageAgentExtUserAuthToken: userAuthToken })
	})

	// message proxy

	chrome.runtime.onMessage.addListener((message, sender, sendResponse): true | undefined => {
		if (message.type === 'TAB_CONTROL') {
			return handleTabControlMessage(message, sender, sendResponse)
		} else if (message.type === 'PAGE_CONTROL') {
			return handlePageControlMessage(message, sender, sendResponse)
		} else {
			sendResponse({ error: 'Unknown message type' })
			return
		}
	})

	// external messages (from localhost launcher page via externally_connectable)

	chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
		if (message.type === 'OPEN_HUB') {
			openOrFocusHubTab(message.wsPort).then(() => {
				if (sender.tab?.id) chrome.tabs.remove(sender.tab.id)
				sendResponse({ ok: true })
			})
			return true
		}
	})

	// setup

	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})

async function openOrFocusHubTab(wsPort: number) {
	const hubUrl = chrome.runtime.getURL('hub.html')
	const existing = await chrome.tabs.query({ url: `${hubUrl}*` })

	if (existing.length > 0 && existing[0].id) {
		await chrome.tabs.update(existing[0].id, {
			active: true,
			url: `${hubUrl}?ws=${wsPort}`,
		})
		return
	}

	await chrome.tabs.create({ url: `${hubUrl}?ws=${wsPort}`, pinned: true })
}
