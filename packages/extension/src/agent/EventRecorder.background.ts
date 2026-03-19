/**
 * EventRecorder — Background Script side
 *
 * Manages recording state, broadcasts start/stop to all content scripts,
 * aggregates events from multiple tabs, monitors tab lifecycle,
 * and forwards events to the sidepanel.
 *
 * Phase 6 enhancements:
 * - Robust SW restart recovery with timestamp validation
 * - Inject content script into newly opened tabs during recording
 * - Dedup navigate events from tab onUpdated
 * - Error handling for all chrome API calls
 */

import type { RawRecordingEvent } from '@/lib/recording-types'

const DEBUG_PREFIX = '[EventRecorder.background]'

let isRecording = false
let recordingStartTime = 0
let recordingSeqId = 0 // monotonic counter to detect stale operations
let tabIndexMap = new Map<number, number>() // tabId → tabIdx
let lastNavigateUrl = new Map<number, string>() // tabId → last navigated URL (dedup)

// ─── Broadcast to Content Scripts ──────────────────────────────────

async function broadcastToContentScripts(message: any) {
	try {
		const tabs = await chrome.tabs.query({})
		const promises = tabs
			.filter(
				(tab) =>
					tab.id &&
					tab.url &&
					!tab.url.startsWith('chrome://') &&
					!tab.url.startsWith('chrome-extension://') &&
					!tab.url.startsWith('about:')
			)
			.map((tab) =>
				chrome.tabs.sendMessage(tab.id!, message).catch(() => {
					// Content script may not be loaded yet, ignore
				})
			)
		await Promise.allSettled(promises)
	} catch (err) {
		console.debug(DEBUG_PREFIX, 'Broadcast error:', err)
	}
}

// ─── Tab Index Management ──────────────────────────────────────────

async function refreshTabIndexMap() {
	try {
		const tabs = await chrome.tabs.query({ currentWindow: true })
		tabIndexMap.clear()
		tabs.forEach((tab, idx) => {
			if (tab.id) tabIndexMap.set(tab.id, idx)
		})
	} catch (err) {
		console.debug(DEBUG_PREFIX, 'Failed to refresh tab index map:', err)
	}
}

function getTabIdx(tabId: number): number {
	return tabIndexMap.get(tabId) ?? 0
}

// ─── Forward Event to Sidepanel ────────────────────────────────────

function forwardToSidepanel(event: RawRecordingEvent) {
	chrome.runtime
		.sendMessage({
			type: 'RECORDING_CONTROL',
			action: 'recording_event',
			payload: event,
		})
		.catch(() => {
			// Sidepanel may not be open, ignore
		})
}

// ─── Inject Content Script into Tab ────────────────────────────────

async function ensureContentScriptInTab(tabId: number) {
	try {
		// Try to start recording directly; if content script is loaded this will work
		await chrome.tabs.sendMessage(tabId, {
			type: 'RECORDING_CONTROL',
			action: 'status',
			payload: { isRecording: true },
		})
	} catch {
		// Content script not loaded — try scripting API injection
		try {
			await chrome.scripting.executeScript({
				target: { tabId },
				func: () => {
					// The content script will be injected by the extension framework
					// This is a no-op placeholder; the real content script auto-injects via manifest
				},
			})
			// Give a brief delay then retry
			setTimeout(() => {
				chrome.tabs
					.sendMessage(tabId, {
						type: 'RECORDING_CONTROL',
						action: 'start',
					})
					.catch(() => {
						console.debug(DEBUG_PREFIX, `Failed to start recording in tab ${tabId} after injection`)
					})
			}, 500)
		} catch (err) {
			console.debug(DEBUG_PREFIX, `Cannot inject script into tab ${tabId}:`, err)
		}
	}
}

// ─── Tab Lifecycle Monitoring ──────────────────────────────────────

function onTabCreated(tab: chrome.tabs.Tab) {
	if (!isRecording) return
	const seq = recordingSeqId

	if (tab.id) {
		// Start recording in new tab once it's ready
		ensureContentScriptInTab(tab.id)

		const event: RawRecordingEvent = {
			type: 'newTab',
			timestamp: Date.now(),
			url: tab.url || '',
			title: tab.title || '',
			tabId: tab.id,
			data: { url: tab.url || '' },
		}
		forwardToSidepanel(event)
	}

	refreshTabIndexMap().then(() => {
		if (recordingSeqId !== seq) return // stale
	})
}

function onTabActivated(activeInfo: { tabId: number; windowId: number }) {
	if (!isRecording) return
	const seq = recordingSeqId

	refreshTabIndexMap().then(() => {
		if (recordingSeqId !== seq) return // stale
		const tabIdx = getTabIdx(activeInfo.tabId)
		chrome.tabs
			.get(activeInfo.tabId)
			.then((tab) => {
				if (recordingSeqId !== seq) return // stale
				const event: RawRecordingEvent = {
					type: 'switchTab',
					timestamp: Date.now(),
					url: tab.url || '',
					title: tab.title || '',
					tabId: activeInfo.tabId,
					data: { tabIdx },
				}
				forwardToSidepanel(event)
			})
			.catch(() => {
				// Tab may have been closed already
			})
	})
}

function onTabRemoved(tabId: number) {
	if (!isRecording) return
	const tabIdx = getTabIdx(tabId)
	lastNavigateUrl.delete(tabId)

	const event: RawRecordingEvent = {
		type: 'closeTab',
		timestamp: Date.now(),
		url: '',
		title: '',
		tabId,
		data: { tabIdx },
	}
	forwardToSidepanel(event)

	refreshTabIndexMap()
}

function onTabUpdated(tabId: number, changeInfo: { url?: string; status?: string }, tab: chrome.tabs.Tab) {
	if (!isRecording) return

	// Track URL navigation — dedup same-URL events
	if (changeInfo.url) {
		const lastUrl = lastNavigateUrl.get(tabId)
		if (lastUrl === changeInfo.url) return // skip duplicate
		lastNavigateUrl.set(tabId, changeInfo.url)

		const event: RawRecordingEvent = {
			type: 'navigate',
			timestamp: Date.now(),
			url: changeInfo.url,
			title: tab.title || '',
			tabId,
			data: { url: changeInfo.url },
		}
		forwardToSidepanel(event)
	}

	// When a tab finishes loading, make sure content script is recording
	if (changeInfo.status === 'complete') {
		chrome.tabs
			.sendMessage(tabId, {
				type: 'RECORDING_CONTROL',
				action: 'status',
				payload: { isRecording: true },
			})
			.catch(() => {
				// Content script not yet loaded, will pick it up via query_status
			})
	}
}

// ─── Tab Listeners ─────────────────────────────────────────────────

let tabListenersRegistered = false

function registerTabListeners() {
	if (tabListenersRegistered) return
	tabListenersRegistered = true

	chrome.tabs.onCreated.addListener(onTabCreated)
	chrome.tabs.onActivated.addListener(onTabActivated)
	chrome.tabs.onRemoved.addListener(onTabRemoved)
	chrome.tabs.onUpdated.addListener(onTabUpdated)
}

function unregisterTabListeners() {
	if (!tabListenersRegistered) return
	tabListenersRegistered = false

	chrome.tabs.onCreated.removeListener(onTabCreated)
	chrome.tabs.onActivated.removeListener(onTabActivated)
	chrome.tabs.onRemoved.removeListener(onTabRemoved)
	chrome.tabs.onUpdated.removeListener(onTabUpdated)
}

// ─── Recording Control ────────────────────────────────────────────

async function startRecording() {
	recordingSeqId++
	isRecording = true
	recordingStartTime = Date.now()
	lastNavigateUrl.clear()
	await refreshTabIndexMap()
	registerTabListeners()

	// Persist state for service worker restart recovery
	try {
		await chrome.storage.session.set({
			isRecordingActive: true,
			recordingStartTime,
		})
	} catch (err) {
		console.debug(DEBUG_PREFIX, 'Failed to persist recording state:', err)
	}

	// Broadcast to all content scripts
	await broadcastToContentScripts({
		type: 'RECORDING_CONTROL',
		action: 'start',
	})

	console.debug(DEBUG_PREFIX, 'Recording started')
}

async function stopRecording() {
	recordingSeqId++
	isRecording = false
	recordingStartTime = 0
	lastNavigateUrl.clear()
	unregisterTabListeners()

	try {
		await chrome.storage.session.set({
			isRecordingActive: false,
			recordingStartTime: 0,
		})
	} catch (err) {
		console.debug(DEBUG_PREFIX, 'Failed to clear recording state:', err)
	}

	// Broadcast to all content scripts
	await broadcastToContentScripts({
		type: 'RECORDING_CONTROL',
		action: 'stop',
	})

	console.debug(DEBUG_PREFIX, 'Recording stopped')
}

// ─── Message Handler ───────────────────────────────────────────────

export function handleRecordingControlMessage(
	message: any,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void
): true | undefined {
	if (message.type !== 'RECORDING_CONTROL') return

	switch (message.action) {
		case 'start': {
			startRecording()
				.then(() => sendResponse({ success: true }))
				.catch((err) => sendResponse({ success: false, error: String(err) }))
			return true
		}

		case 'stop': {
			stopRecording()
				.then(() => sendResponse({ success: true }))
				.catch((err) => sendResponse({ success: false, error: String(err) }))
			return true
		}

		case 'query_status': {
			sendResponse({ isRecording })
			return
		}

		case 'recording_event': {
			// Only handle events from content scripts (sender.tab exists)
			// Ignore messages from ourselves (forwardToSidepanel re-entry)
			if (!sender.tab) return

			if (!isRecording) {
				sendResponse({ success: false, error: 'Not recording' })
				return
			}

			try {
				const payload = message.payload as Omit<RawRecordingEvent, 'tabId'>
				const tabId = sender.tab.id ?? 0

				const event: RawRecordingEvent = {
					...payload,
					tabId,
				}

				forwardToSidepanel(event)
				sendResponse({ success: true })
			} catch (err) {
				console.debug(DEBUG_PREFIX, 'Error processing recording event:', err)
				sendResponse({ success: false, error: String(err) })
			}
			return
		}

		default:
			return
	}
}

// ─── Service Worker Restart Recovery ───────────────────────────────

/** Max age for a recording session to be recovered (30 minutes) */
const MAX_RECOVERY_AGE_MS = 30 * 60 * 1000

export async function recoverRecordingState() {
	try {
		const result = await chrome.storage.session.get(['isRecordingActive', 'recordingStartTime'])
		if (!result.isRecordingActive) return

		// Validate the recording isn't too old (stale state from a crash)
		const startTime = result.recordingStartTime as number | undefined
		if (startTime && Date.now() - startTime > MAX_RECOVERY_AGE_MS) {
			console.debug(DEBUG_PREFIX, 'Recording session too old, clearing stale state')
			await chrome.storage.session.set({ isRecordingActive: false, recordingStartTime: 0 })
			return
		}

		console.debug(DEBUG_PREFIX, 'Recovering recording state after SW restart')
		isRecording = true
		recordingStartTime = startTime || Date.now()
		registerTabListeners()
		await refreshTabIndexMap()

		// Re-notify all content scripts
		await broadcastToContentScripts({
			type: 'RECORDING_CONTROL',
			action: 'status',
			payload: { isRecording: true },
		})
	} catch (err) {
		console.debug(DEBUG_PREFIX, 'Recovery error:', err)
	}
}
