/**
 * EventRecorder — Content Script side
 *
 * Listens to user interactions (click, input, change, keydown, scroll)
 * and reports them as RawRecordingEvents to the background script.
 *
 * Handles edge cases: iframe, shadow DOM, contenteditable, file upload.
 * Captures highlightIndex from PageController for element identification.
 */

import { PageController } from '@page-agent/page-controller'
import type { ElementDescriptor, RawRecordingEvent } from '@/lib/recording-types'

const DEBUG_PREFIX = '[EventRecorder.content]'

let isRecording = false
let scrollTimer: ReturnType<typeof setTimeout> | null = null
let lastScrollY = 0
let inputDebounceTimers = new Map<EventTarget, ReturnType<typeof setTimeout>>()

// ─── Shared PageController for element indexing ─────────────────────

let recordingPageController: PageController | null = null
let indexRefreshTimer: ReturnType<typeof setTimeout> | null = null

function getRecordingPageController(): PageController {
	if (!recordingPageController) {
		recordingPageController = new PageController({ enableMask: false, viewportExpansion: -1 })
	}
	return recordingPageController
}

/**
 * Update the DOM tree and cache highlightIndex into element dataset.
 * Called on recording start and periodically during recording.
 */
async function refreshElementIndices() {
	try {
		const pc = getRecordingPageController()
		await pc.updateTree()

		const selectorMap = (pc as any).selectorMap as Map<number, any>
		selectorMap.forEach((node: any, index: number) => {
			if (node.ref instanceof HTMLElement) {
				node.ref.dataset.pageAgentIdx = String(index)
			}
		})

		console.debug(DEBUG_PREFIX, `Indexed ${selectorMap.size} interactive elements`)
	} catch {
		// Ignore errors — page may not be ready
	}
}

/**
 * Schedule periodic index refresh during recording.
 * Re-indexes every 3 seconds to catch dynamic DOM changes.
 */
function startIndexRefresh() {
	stopIndexRefresh()
	// Initial index
	refreshElementIndices()
	indexRefreshTimer = setInterval(() => {
		refreshElementIndices()
	}, 3000)
}

function stopIndexRefresh() {
	if (indexRefreshTimer) {
		clearInterval(indexRefreshTimer)
		indexRefreshTimer = null
	}
}

/**
 * Get the highlightIndex for a specific element.
 * First checks cache, then does a targeted lookup.
 */
async function getElementHighlightIndex(element: Element): Promise<number | undefined> {
	// Check cache first
	if (element instanceof HTMLElement && element.dataset.pageAgentIdx) {
		return parseInt(element.dataset.pageAgentIdx, 10)
	}

	try {
		const pc = getRecordingPageController()
		await pc.updateTree()

		const selectorMap = (pc as any).selectorMap as Map<number, any>
		for (const [index, node] of selectorMap.entries()) {
			if (node.ref === element) {
				if (element instanceof HTMLElement) {
					element.dataset.pageAgentIdx = String(index)
				}
				return index
			}
		}
		return undefined
	} catch {
		return undefined
	}
}

// ─── Element Descriptor Builder ────────────────────────────────────

function buildElementDescriptor(el: Element): ElementDescriptor {
	const tag = el.tagName.toLowerCase()

	// Get highlightIndex from dataset cache
	let idx: number | undefined = undefined
	if (el instanceof HTMLElement && el.dataset.pageAgentIdx) {
		idx = parseInt(el.dataset.pageAgentIdx, 10)
	}

	// If not cached, trigger async refresh (result will be available for next event)
	if (idx === undefined && isRecording) {
		getElementHighlightIndex(el)
	}

	// Visible text — trim and limit
	let text = ''
	if (el instanceof HTMLElement) {
		if (el.isContentEditable) {
			text = (el.textContent || '').trim().slice(0, 100)
		} else {
			text = (el.innerText || el.textContent || '').trim().slice(0, 100)
		}
	}

	const role = el.getAttribute('role') || undefined
	const ariaLabel = el.getAttribute('aria-label') || undefined
	const placeholder = el.getAttribute('placeholder') || undefined
	const name = el.getAttribute('name') || undefined

	// Best-effort CSS selector
	const selector = buildSelector(el)

	// Context — nearest landmark or heading
	const context = findContext(el)

	// For file inputs, add type info
	const extras: Partial<ElementDescriptor> = {}
	if (tag === 'input') {
		const inputType = el.getAttribute('type')
		if (inputType === 'file') {
			extras.role = 'file-upload'
		}
	}

	// For contenteditable, mark it
	if (el instanceof HTMLElement && el.isContentEditable && tag !== 'input' && tag !== 'textarea') {
		extras.role = extras.role || 'textbox'
	}

	return {
		text,
		tag,
		...(role && { role }),
		...(ariaLabel && { ariaLabel }),
		...(placeholder && { placeholder }),
		...(name && { name }),
		...(selector && { selector }),
		...(context && { context }),
		...(idx !== undefined && { idx }),
		...extras,
	}
}

function buildSelector(el: Element): string | undefined {
	try {
		// If element is inside a shadow root, prefix with host selector
		const shadowPrefix = getShadowHostSelector(el)

		// Try id
		if (el.id) {
			const sel = `#${CSS.escape(el.id)}`
			return shadowPrefix ? `${shadowPrefix} >>> ${sel}` : sel
		}

		// Try unique class combination
		const tag = el.tagName.toLowerCase()
		const classes = Array.from(el.classList)
			.filter((c) => !c.startsWith('__') && !c.startsWith('css-') && c.length < 40)
			.slice(0, 3)

		if (classes.length > 0) {
			const sel = `${tag}.${classes.map((c) => CSS.escape(c)).join('.')}`
			const root = el.getRootNode()
			const doc = root instanceof Document ? root : (root as ShadowRoot)
			try {
				if (doc.querySelectorAll(sel).length === 1) {
					return shadowPrefix ? `${shadowPrefix} >>> ${sel}` : sel
				}
			} catch {
				// Invalid selector, skip
			}
		}

		// Try tag + attributes
		const attrs = ['name', 'type', 'role', 'aria-label', 'placeholder', 'data-testid']
		for (const attr of attrs) {
			const val = el.getAttribute(attr)
			if (val) {
				const sel = `${tag}[${attr}=${JSON.stringify(val)}]`
				const root = el.getRootNode()
				const doc = root instanceof Document ? root : (root as ShadowRoot)
				try {
					if (doc.querySelectorAll(sel).length === 1) {
						return shadowPrefix ? `${shadowPrefix} >>> ${sel}` : sel
					}
				} catch {
					// Invalid selector, skip
				}
			}
		}

		return undefined
	} catch {
		return undefined
	}
}

/** Get a selector path for the shadow DOM host element, if any */
function getShadowHostSelector(el: Element): string | undefined {
	try {
		const root = el.getRootNode()
		if (root instanceof ShadowRoot && root.host) {
			const host = root.host
			if (host.id) return `#${CSS.escape(host.id)}`
			const tag = host.tagName.toLowerCase()
			// Custom elements usually have unique tag names
			if (tag.includes('-')) return tag
			return undefined
		}
		return undefined
	} catch {
		return undefined
	}
}

function findContext(el: Element): string | undefined {
	const landmarks = [
		'header',
		'nav',
		'main',
		'aside',
		'footer',
		'[role="banner"]',
		'[role="navigation"]',
		'[role="main"]',
		'[role="search"]',
		'[role="dialog"]',
		'[role="alertdialog"]',
		'[role="complementary"]',
		'[role="contentinfo"]',
		'[role="form"]',
		'[role="region"]',
	]

	let current: Element | null = el.parentElement
	const maxDepth = 15
	let depth = 0

	while (current && depth < maxDepth) {
		// Check if it's a landmark
		const tagLower = current.tagName.toLowerCase()
		const role = current.getAttribute('role')

		if (landmarks.includes(tagLower) || (role && landmarks.includes(`[role="${role}"]`))) {
			const label = current.getAttribute('aria-label') || tagLower
			return label
		}

		// Check for heading
		if (/^h[1-6]$/.test(tagLower)) {
			return (current as HTMLElement).innerText?.trim().slice(0, 50) || tagLower
		}

		// Cross shadow DOM boundary — walk to host
		if (!current.parentElement) {
			const root = current.getRootNode()
			if (root instanceof ShadowRoot && root.host) {
				current = root.host
				continue
			}
		}

		current = current.parentElement
		depth++
	}

	return undefined
}

// ─── Resolve Target from Event ─────────────────────────────────────

/** Resolve the actual target element, crossing shadow DOM if needed */
function resolveTarget(e: Event): Element | null {
	// composedPath()[0] gives the actual target, even across shadow boundaries
	const path = e.composedPath()
	if (path.length > 0 && path[0] instanceof Element) {
		return path[0]
	}
	return e.target instanceof Element ? e.target : null
}

// ─── Event Sending ─────────────────────────────────────────────────

function sendEvent(event: Omit<RawRecordingEvent, 'timestamp' | 'url' | 'title' | 'tabId'>) {
	if (!isRecording) return

	try {
		const rawEvent: Omit<RawRecordingEvent, 'tabId'> = {
			...event,
			timestamp: Date.now(),
			url: window.location.href,
			title: document.title,
		}

		chrome.runtime
			.sendMessage({
				type: 'RECORDING_CONTROL',
				action: 'recording_event',
				payload: rawEvent,
			})
			.catch((err) => {
				console.debug(DEBUG_PREFIX, 'Failed to send event:', err)
			})
	} catch (err) {
		console.debug(DEBUG_PREFIX, 'Error building event:', err)
	}
}

// ─── Event Handlers ────────────────────────────────────────────────

function handleClick(e: MouseEvent) {
	if (!isRecording) return
	const target = resolveTarget(e)
	if (!target) return

	// For file inputs, record as a special click
	if (
		target instanceof HTMLInputElement &&
		target.type === 'file'
	) {
		sendEvent({
			type: 'click',
			el: buildElementDescriptor(target),
			data: { fileInput: true },
		})
		return
	}

	sendEvent({
		type: 'click',
		el: buildElementDescriptor(target),
	})
}

function handleInput(e: Event) {
	if (!isRecording) return
	const target = resolveTarget(e)
	if (!target) return

	// Handle contenteditable elements
	if (target instanceof HTMLElement && target.isContentEditable) {
		const existingTimer = inputDebounceTimers.get(target)
		if (existingTimer) clearTimeout(existingTimer)

		inputDebounceTimers.set(
			target,
			setTimeout(() => {
				inputDebounceTimers.delete(target)
				sendEvent({
					type: 'input',
					el: buildElementDescriptor(target),
					data: { value: target.textContent || '' },
				})
			}, 500)
		)
		return
	}

	// Standard input/textarea
	if (!('value' in target)) return
	const inputTarget = target as HTMLInputElement | HTMLTextAreaElement

	// Skip file inputs — their value changes are not user-typed text
	if (inputTarget instanceof HTMLInputElement && inputTarget.type === 'file') return

	// Debounce input events — wait 500ms of inactivity
	const existingTimer = inputDebounceTimers.get(inputTarget)
	if (existingTimer) clearTimeout(existingTimer)

	inputDebounceTimers.set(
		inputTarget,
		setTimeout(() => {
			inputDebounceTimers.delete(inputTarget)
			sendEvent({
				type: 'input',
				el: buildElementDescriptor(inputTarget),
				data: { value: inputTarget.value },
			})
		}, 500)
	)
}

function handleChange(e: Event) {
	if (!isRecording) return
	const target = resolveTarget(e)
	if (!target) return

	// File upload — record the selected file names
	if (target instanceof HTMLInputElement && target.type === 'file') {
		const files = target.files
		if (files && files.length > 0) {
			const fileNames = Array.from(files).map((f) => f.name)
			sendEvent({
				type: 'input',
				el: buildElementDescriptor(target),
				data: { value: fileNames.join(', '), fileUpload: true, fileNames },
			})
		}
		return
	}

	// Select element
	if (target.tagName.toLowerCase() !== 'select') return
	const selectTarget = target as HTMLSelectElement

	sendEvent({
		type: 'select',
		el: buildElementDescriptor(selectTarget),
		data: { value: selectTarget.value },
	})
}

function handleKeyDown(e: KeyboardEvent) {
	if (!isRecording) return

	// Only capture special keys, not regular typing
	const specialKeys = [
		'Enter',
		'Escape',
		'Tab',
		'Backspace',
		'Delete',
		'ArrowUp',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'Home',
		'End',
		'PageUp',
		'PageDown',
	]
	const hasModifier = e.ctrlKey || e.metaKey || e.altKey

	if (!specialKeys.includes(e.key) && !hasModifier) return

	const modifiers: string[] = []
	if (e.ctrlKey) modifiers.push('Ctrl')
	if (e.metaKey) modifiers.push('Meta')
	if (e.altKey) modifiers.push('Alt')
	if (e.shiftKey) modifiers.push('Shift')

	const target = resolveTarget(e)

	sendEvent({
		type: 'keypress',
		el: target ? buildElementDescriptor(target) : undefined,
		data: {
			key: e.key,
			...(modifiers.length > 0 && { modifiers }),
		},
	})
}

function handleScroll() {
	if (!isRecording) return

	// Debounce scroll — aggregate into single event after 300ms of inactivity
	if (scrollTimer) clearTimeout(scrollTimer)

	scrollTimer = setTimeout(() => {
		const currentY = window.scrollY
		const delta = currentY - lastScrollY
		if (Math.abs(delta) < 50) return // ignore tiny scrolls

		sendEvent({
			type: 'scroll',
			data: {
				direction: delta > 0 ? 'down' : 'up',
				pixels: Math.abs(Math.round(delta)),
			},
		})

		lastScrollY = currentY
		scrollTimer = null
	}, 300)
}

// ─── Lifecycle ─────────────────────────────────────────────────────

function startRecording() {
	if (isRecording) return
	isRecording = true
	lastScrollY = window.scrollY

	// Start periodic element indexing
	startIndexRefresh()

	document.addEventListener('click', handleClick, { capture: true })
	document.addEventListener('input', handleInput, { capture: true })
	document.addEventListener('change', handleChange, { capture: true })
	document.addEventListener('keydown', handleKeyDown, { capture: true })
	window.addEventListener('scroll', handleScroll, { passive: true })

	console.debug(DEBUG_PREFIX, 'Recording started')
}

function stopRecording() {
	if (!isRecording) return
	isRecording = false

	// Stop periodic element indexing
	stopIndexRefresh()

	document.removeEventListener('click', handleClick, { capture: true })
	document.removeEventListener('input', handleInput, { capture: true })
	document.removeEventListener('change', handleChange, { capture: true })
	document.removeEventListener('keydown', handleKeyDown, { capture: true })
	window.removeEventListener('scroll', handleScroll)

	// Clean up PageController
	if (recordingPageController) {
		recordingPageController.dispose()
		recordingPageController = null
	}

	// Clear pending timers
	if (scrollTimer) {
		clearTimeout(scrollTimer)
		scrollTimer = null
	}
	for (const timer of inputDebounceTimers.values()) {
		clearTimeout(timer)
	}
	inputDebounceTimers.clear()

	console.debug(DEBUG_PREFIX, 'Recording stopped')
}

// ─── Init ──────────────────────────────────────────────────────────

export function initEventRecorder() {
	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message.type !== 'RECORDING_CONTROL') return

		switch (message.action) {
			case 'start':
				startRecording()
				sendResponse({ success: true })
				break
			case 'stop':
				stopRecording()
				sendResponse({ success: true })
				break
			case 'status':
				// Background is informing us about recording state
				if (message.payload?.isRecording) {
					startRecording()
				} else {
					stopRecording()
				}
				sendResponse({ success: true })
				break
			default:
				// Ignore other recording control messages
				break
		}
	})

	// On load, check if a recording is in progress
	chrome.runtime
		.sendMessage({
			type: 'RECORDING_CONTROL',
			action: 'query_status',
		})
		.then((response: any) => {
			if (response?.isRecording) {
				startRecording()
			}
		})
		.catch(() => {
			// Background not ready yet, ignore
		})

	console.debug(DEBUG_PREFIX, 'Event recorder initialized')
}
