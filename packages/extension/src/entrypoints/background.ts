import { handlePageControlMessage } from '@/agent/RemotePageController.background'
import { handleTabControlMessage, setupTabEventsPort } from '@/agent/TabsController.background'

const KEEP_ALIVE_ALARM = 'keepAlive'

export default defineBackground(() => {
	console.log('[Background] Service Worker started')

	// Recreate the keepalive alarm on install/update — Chrome clears alarms on extension update,
	// which is exactly when the SW goes AWOL (issue #452).
	chrome.runtime.onInstalled.addListener(() => {
		chrome.alarms.create(KEEP_ALIVE_ALARM, { periodInMinutes: 0.5 })
	})

	// Ensure the alarm exists even if the SW restarted without an install event
	chrome.alarms.get(KEEP_ALIVE_ALARM).then((alarm) => {
		if (!alarm) chrome.alarms.create(KEEP_ALIVE_ALARM, { periodInMinutes: 0.5 })
	})

	// Alarm handler: waking up is enough — Chrome won't let the SW sleep mid-alarm
	chrome.alarms.onAlarm.addListener((alarm) => {
		if (alarm.name === KEEP_ALIVE_ALARM) console.debug('[Background] keepAlive tick')
	})

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
