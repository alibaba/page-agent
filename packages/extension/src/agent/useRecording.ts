/**
 * useRecording — React Hook for recording management
 *
 * Manages recording state (idle/recording), start/stop,
 * real-time event stream, raw event → RecordedStep conversion,
 * and saving to IndexedDB.
 *
 * Phase 6: error handling, defensive coding
 */
import type { LLMConfig } from '@page-agent/llms'
import { useCallback, useEffect, useRef, useState } from 'react'

import { autoNameRecording } from '@/agent/autoNameRecording'
import { saveRecording, updateRecording } from '@/lib/db'
import type { RawRecordingEvent, RecordedStep, Recording } from '@/lib/recording-types'

export type RecordingState = 'idle' | 'recording'

export interface UseRecordingResult {
	recordingState: RecordingState
	steps: RecordedStep[]
	startRecording: () => Promise<void>
	stopRecording: () => Promise<Recording | null>
	discardRecording: () => void
	eventCount: number
	error: string | null
}

/** Convert a RawRecordingEvent to a RecordedStep */
function rawToStep(
	raw: RawRecordingEvent,
	startTime: number,
	tabIdxMap: Map<number, number>
): RecordedStep | null {
	try {
		const dt = raw.timestamp - startTime
		const tabIdx = tabIdxMap.get(raw.tabId) ?? 0
		const page = { url: raw.url, title: raw.title, tabIdx }

		switch (raw.type) {
			case 'click':
				return { act: { type: 'click' }, page, el: raw.el, dt }

			case 'input':
				return {
					act: { type: 'input', value: String(raw.data?.value ?? '') },
					page,
					el: raw.el,
					dt,
				}

			case 'select':
				return {
					act: { type: 'select', value: String(raw.data?.value ?? '') },
					page,
					el: raw.el,
					dt,
				}

			case 'scroll':
				return {
					act: {
						type: 'scroll',
						direction: (raw.data?.direction as 'up' | 'down') ?? 'down',
						pixels: Number(raw.data?.pixels ?? 300),
					},
					page,
					dt,
				}

			case 'keypress': {
				const modifiers = raw.data?.modifiers as string[] | undefined
				return {
					act: {
						type: 'keypress',
						key: String(raw.data?.key ?? ''),
						...(modifiers ? { modifiers } : {}),
					},
					page,
					el: raw.el,
					dt,
				}
			}

			case 'navigate':
				return {
					act: { type: 'navigate', url: String(raw.data?.url ?? raw.url) },
					page,
					dt,
				}

			case 'newTab':
				return {
					act: { type: 'newTab', url: String(raw.data?.url ?? raw.url) },
					page,
					dt,
				}

			case 'switchTab':
				return {
					act: { type: 'switchTab', tabIdx: Number(raw.data?.tabIdx ?? tabIdx) },
					page,
					dt,
				}

			case 'closeTab':
				return {
					act: { type: 'closeTab', tabIdx: Number(raw.data?.tabIdx ?? tabIdx) },
					page,
					dt,
				}

			default:
				return null
		}
	} catch (err) {
		console.debug('[useRecording] Failed to convert raw event:', err)
		return null
	}
}

export function useRecording(): UseRecordingResult {
	const [recordingState, setRecordingState] = useState<RecordingState>('idle')
	const [steps, setSteps] = useState<RecordedStep[]>([])
	const [error, setError] = useState<string | null>(null)
	const startTimeRef = useRef<number>(0)
	const startUrlRef = useRef<string>('')
	const tabIdxMapRef = useRef(new Map<number, number>())
	const rawEventsRef = useRef<RawRecordingEvent[]>([])
	const stepsRef = useRef<RecordedStep[]>([])
	const recordingStateRef = useRef<RecordingState>('idle')

	// Keep refs in sync with state
	useEffect(() => {
		stepsRef.current = steps
	}, [steps])
	useEffect(() => {
		recordingStateRef.current = recordingState
	}, [recordingState])
	// Listen for recording events from background
	useEffect(() => {
		const listener = (message: any) => {
			if (
				message.type !== 'RECORDING_CONTROL' ||
				message.action !== 'recording_event'
			) {
				return
			}

			// Guard: ignore events when not recording
			if (recordingStateRef.current !== 'recording') return

			try {
				const raw = message.payload as RawRecordingEvent

				// Track tab indices
				if (!tabIdxMapRef.current.has(raw.tabId)) {
					tabIdxMapRef.current.set(raw.tabId, tabIdxMapRef.current.size)
				}

				rawEventsRef.current.push(raw)

				const step = rawToStep(raw, startTimeRef.current, tabIdxMapRef.current)
				if (step) {
					setSteps((prev) => [...prev, step])
				}
			} catch (err) {
				console.debug('[useRecording] Error processing event:', err)
			}
		}

		chrome.runtime.onMessage.addListener(listener)
		return () => chrome.runtime.onMessage.removeListener(listener)
	}, [])

	// ─── Auto-naming helper ─────────────────────────────────────────────
	/** Call LLM to generate name/desc in background, update DB silently */
	async function autoNameInBackground(recording: Recording) {
		try {
			const result = await chrome.storage.local.get('llmConfig')
			const llmConfig = result.llmConfig as LLMConfig | undefined
			if (!llmConfig) return

			const { name, desc } = await autoNameRecording(
				recording.steps,
				recording.startUrl,
				llmConfig
			)

			if (name || desc) {
				const updated = {
					...recording,
					name: name || recording.name,
					desc: desc || recording.desc,
				}
				await updateRecording(updated)
				console.debug('[useRecording] Auto-named recording:', name)
			}
		} catch (err) {
			console.debug('[useRecording] Auto-naming failed (non-critical):', err)
		}
	}

	const startRecording = useCallback(async () => {
		setError(null)

		// Get current tab info for startUrl
		try {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
			startUrlRef.current = tab?.url || ''
		} catch {
			startUrlRef.current = ''
		}

		startTimeRef.current = Date.now()
		rawEventsRef.current = []
		tabIdxMapRef.current.clear()
		setSteps([])
		setRecordingState('recording')

		// Tell background to start
		try {
			await chrome.runtime.sendMessage({
				type: 'RECORDING_CONTROL',
				action: 'start',
			})
		} catch (err) {
			setError('Failed to start recording')
			setRecordingState('idle')
			console.error('[useRecording] Failed to start recording:', err)
			throw err
		}
	}, [])

	const stopRecording = useCallback(async (): Promise<Recording | null> => {
		setRecordingState('idle')

		// Tell background to stop
		try {
			await chrome.runtime.sendMessage({
				type: 'RECORDING_CONTROL',
				action: 'stop',
			})
		} catch (err) {
			console.error('[useRecording] Failed to stop recording:', err)
		}

		// Use ref to get the latest steps (avoids stale closure)
		const currentSteps = stepsRef.current
		if (currentSteps.length === 0) return null

		// Create and save recording (with empty name/desc initially)
		try {
			const recording = await saveRecording({
				v: 1,
				name: '',
				desc: '',
				ts: startTimeRef.current,
				startUrl: startUrlRef.current,
				steps: currentSteps,
			})

			// Auto-name in background — don't block the UI
			autoNameInBackground(recording)

			return recording
		} catch (err) {
			setError('Failed to save recording')
			console.error('[useRecording] Failed to save recording:', err)
			throw err
		}
	}, [])

	const discardRecording = useCallback(() => {
		setRecordingState('idle')
		setSteps([])
		setError(null)
		rawEventsRef.current = []

		chrome.runtime
			.sendMessage({
				type: 'RECORDING_CONTROL',
				action: 'stop',
			})
			.catch(() => {})
	}, [])

	return {
		recordingState,
		steps,
		startRecording,
		stopRecording,
		discardRecording,
		eventCount: steps.length,
		error,
	}
}
