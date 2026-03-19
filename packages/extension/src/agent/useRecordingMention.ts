/**
 * useRecordingMention — Hook for @ mention recording in input
 *
 * Provides:
 * - Parse @name from input text
 * - Suggest matching recordings
 * - Build replay task from mentioned recording + NL context
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { buildReplayTask } from '@/agent/RecordingReplayAgent'
import { listRecordings } from '@/lib/db'
import type { Recording } from '@/lib/recording-types'

export interface MentionSuggestion {
	recording: Recording
	/** Display label: name or startUrl */
	label: string
}

export interface RecordingMentionResult {
	/** Current suggestions to show in dropdown */
	suggestions: MentionSuggestion[]
	/** Whether the suggestion dropdown is visible */
	showSuggestions: boolean
	/** The partial text after @ being typed */
	mentionQuery: string
	/** Call when user selects a suggestion */
	selectSuggestion: (recording: Recording) => void
	/** Call when input value changes */
	onInputChange: (value: string) => void
	/** The resolved recording (after selection or from input) */
	resolvedRecording: Recording | null
	/** Process input: if it contains a valid @mention, return replay task + system instruction */
	buildTaskFromInput: (inputValue: string) => Promise<{
		task: string
		systemInstruction?: string
	} | null>
	/** Reset mention state */
	reset: () => void
}

/**
 * Extract @mention query from input text.
 * Returns the text after the last @ symbol, or null if no active mention.
 *
 * Examples:
 *   "使用@搜索视频" → "搜索视频"
 *   "用@搜索 来搜AI" → null (space after @xxx = completed mention)
 *   "@B站搜索" → "B站搜索"
 */
function extractMentionQuery(text: string, cursorPos?: number): string | null {
	const pos = cursorPos ?? text.length
	const textBeforeCursor = text.slice(0, pos)

	// Find the last @ symbol
	const atIndex = textBeforeCursor.lastIndexOf('@')
	if (atIndex === -1) return null

	// The text after @ until cursor
	const afterAt = textBeforeCursor.slice(atIndex + 1)

	// If there's a space after the mention text, it's completed
	// But we should still track it for resolution
	// Only return null if there's NO text after @
	if (afterAt.length === 0) return ''

	return afterAt
}

/**
 * Extract the mentioned recording name from input.
 * This handles the completed mention case.
 *
 * "用@搜索视频 搜索AI" → "搜索视频"
 * "@B站搜索 打开首页" → "B站搜索"
 */
function extractMentionedName(text: string): string | null {
	const match = text.match(/@([^\s]+)/)
	return match ? match[1] : null
}

/**
 * Extract NL instruction from input (everything except @mention).
 *
 * "用@搜索视频 搜索AI内容" → "用 搜索AI内容"
 * "@登录B站 用账号xxx" → " 用账号xxx"
 */
function extractNLInstruction(text: string): string {
	return text.replace(/@[^\s]+/, '').trim()
}

export function useRecordingMention(): RecordingMentionResult {
	const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [mentionQuery, setMentionQuery] = useState('')
	const [resolvedRecording, setResolvedRecording] = useState<Recording | null>(null)
	const allRecordingsRef = useRef<Recording[]>([])
	const loadedRef = useRef(false)

	// Preload recordings list
	useEffect(() => {
		if (!loadedRef.current) {
			loadedRef.current = true
			listRecordings()
				.then((recordings) => {
					allRecordingsRef.current = recordings
				})
				.catch(() => {})
		}
	}, [])

	const onInputChange = useCallback((value: string) => {
		const query = extractMentionQuery(value)

		if (query === null) {
			setShowSuggestions(false)
			setSuggestions([])
			setMentionQuery('')
			return
		}

		setMentionQuery(query)

		// Refresh recordings list every time @ is triggered (in case new recordings were added)
		listRecordings()
			.then((recordings) => {
				allRecordingsRef.current = recordings
				updateSuggestions(query, recordings)
			})
			.catch(() => {
				// Use cached list as fallback
				updateSuggestions(query, allRecordingsRef.current)
			})
	}, [])

	/** Filter and display suggestions based on query */
	function updateSuggestions(query: string, recordings: Recording[]) {
		const filtered = recordings
			.filter((r) => {
				if (query === '') return true // Show all when just "@"
				const label = r.name || r.startUrl || ''
				return label.toLowerCase().includes(query.toLowerCase())
			})
			.slice(0, 6)
			.map((r) => ({
				recording: r,
				label: r.name || r.startUrl || 'Unnamed',
			}))

		setSuggestions(filtered)
		setShowSuggestions(filtered.length > 0)
	}

	const selectSuggestion = useCallback((recording: Recording) => {
		setResolvedRecording(recording)
		setShowSuggestions(false)
		setSuggestions([])
		setMentionQuery('')
	}, [])

	const buildTaskFromInput = useCallback(
		async (inputValue: string): Promise<{ task: string; systemInstruction?: string } | null> => {
			// Try to find a recording reference
			const mentionedName = extractMentionedName(inputValue)
			if (!mentionedName) return null

			// Use resolved recording or try to find by name
			let recording = resolvedRecording
			if (!recording) {
				// Reload recordings if needed
				if (allRecordingsRef.current.length === 0) {
					try {
						allRecordingsRef.current = await listRecordings()
					} catch {
						return null
					}
				}

				recording =
					allRecordingsRef.current.find(
						(r) =>
							r.name === mentionedName ||
							r.name?.includes(mentionedName) ||
							r.startUrl?.includes(mentionedName)
					) ?? null
			}

			if (!recording) return null

			// Extract the NL instruction (everything except @mention)
			const nlInstruction = extractNLInstruction(inputValue)

			// Build replay task with NL modification
			const { task, systemInstruction } = buildReplayTask(
				recording,
				undefined, // no param overrides from chat
				nlInstruction || undefined
			)

			return { task, systemInstruction }
		},
		[resolvedRecording]
	)

	const reset = useCallback(() => {
		setResolvedRecording(null)
		setShowSuggestions(false)
		setSuggestions([])
		setMentionQuery('')
		// Refresh recordings for next time
		listRecordings()
			.then((recordings) => {
				allRecordingsRef.current = recordings
			})
			.catch(() => {})
	}, [])

	return {
		suggestions,
		showSuggestions,
		mentionQuery,
		selectSuggestion,
		onInputChange,
		resolvedRecording,
		buildTaskFromInput,
		reset,
	}
}
