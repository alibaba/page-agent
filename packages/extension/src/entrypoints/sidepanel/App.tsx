import { Circle, History, Send, Settings, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ConfigPanel } from '@/components/ConfigPanel'
import { HistoryDetail } from '@/components/HistoryDetail'
import { HistoryList } from '@/components/HistoryList'
import { MentionSuggestions } from '@/components/MentionSuggestions'
import { RecordingDetail } from '@/components/RecordingDetail'
import { RecordingIndicator } from '@/components/RecordingIndicator'
import { RecordingList } from '@/components/RecordingList'
import { RecordingStepCard } from '@/components/RecordingStepCard'
import { ActivityCard, EventCard } from '@/components/cards'
import { EmptyState, Logo, MotionOverlay, StatusDot } from '@/components/misc'
import { Button } from '@/components/ui/button'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from '@/components/ui/input-group'
import { saveSession } from '@/lib/db'
import { setLocale, t } from '@/lib/i18n'

import { useAgent } from '../../agent/useAgent'
import { useRecording } from '../../agent/useRecording'
import { useRecordingMention } from '../../agent/useRecordingMention'

type View =
	| { name: 'chat' }
	| { name: 'config' }
	| { name: 'history' }
	| { name: 'history-detail'; sessionId: string }
	| { name: 'recordings' }
	| { name: 'recording-detail'; recordingId: string }

export default function App() {
	const [view, setView] = useState<View>({ name: 'chat' })
	const [inputValue, setInputValue] = useState('')
	const historyRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const { status, history, activity, currentTask, config, execute, stop, configure } = useAgent()
	const {
		recordingState,
		steps: recordingSteps,
		startRecording,
		stopRecording,
		discardRecording,
		eventCount,
	} = useRecording()

	const {
		suggestions,
		showSuggestions,
		selectSuggestion,
		onInputChange: onMentionInputChange,
		resolvedRecording,
		buildTaskFromInput,
		reset: resetMention,
	} = useRecordingMention()

	// Sync i18n locale with agent config language
	useEffect(() => {
		setLocale(config?.language)
	}, [config?.language])

	// Persist session when task finishes
	const prevStatusRef = useRef(status)
	useEffect(() => {
		const prev = prevStatusRef.current
		prevStatusRef.current = status

		if (
			prev === 'running' &&
			(status === 'completed' || status === 'error') &&
			history.length > 0 &&
			currentTask
		) {
			saveSession({ task: currentTask, history, status }).catch((err) =>
				console.error('[SidePanel] Failed to save session:', err)
			)
		}
	}, [status, history, currentTask])

	// Auto-scroll to bottom on new events
	useEffect(() => {
		if (historyRef.current) {
			historyRef.current.scrollTop = historyRef.current.scrollHeight
		}
	}, [history, activity, recordingSteps])

	const handleSubmit = useCallback(
		async (e?: React.SyntheticEvent) => {
			e?.preventDefault()
			if (!inputValue.trim() || status === 'running') return

			const taskToExecute = inputValue.trim()
			setInputValue('')
			resetMention()

			// Check if input contains @recording mention
			const mentionResult = await buildTaskFromInput(taskToExecute)
			if (mentionResult) {
				// Execute via recording replay
				try {
					if (mentionResult.systemInstruction && config) {
						// Store task, then configure — execute will happen after agent reinit
						pendingReplayRef.current = mentionResult.task
						await configure({ ...config, systemInstruction: mentionResult.systemInstruction })
					} else {
						await execute(mentionResult.task)
					}
				} catch (error) {
					console.error('[SidePanel] Failed to execute @mention replay:', error)
				}
				return
			}

			// Normal task execution
			execute(taskToExecute).catch((error) => {
				console.error('[SidePanel] Failed to execute task:', error)
			})
		},
		[inputValue, status, execute, buildTaskFromInput, resetMention, config, configure]
	)

	const handleStop = useCallback(() => {
		console.log('[SidePanel] Stopping task...')
		stop()
	}, [stop])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault()
			handleSubmit()
		}
	}

	// Recording handlers

	const handleStartRecording = useCallback(async () => {
		try {
			await startRecording()
		} catch (err) {
			console.error('[SidePanel] Failed to start recording:', err)
		}
	}, [startRecording])

	const handleStopRecording = useCallback(async () => {
		try {
			const recording = await stopRecording()
			if (recording) {
				setView({ name: 'recording-detail', recordingId: recording.id })
			}
		} catch (err) {
			console.error('[SidePanel] Failed to stop recording:', err)
		}
	}, [stopRecording])

	const handleReplay = useCallback(
		(recordingId: string) => {
			setView({ name: 'recording-detail', recordingId })
		},
		[]
	)

	// Store pending replay task to execute after agent re-initialization
	const pendingReplayRef = useRef<string | null>(null)

	// Execute pending replay after agent config change
	useEffect(() => {
		if (pendingReplayRef.current && status === 'idle') {
			const task = pendingReplayRef.current
			pendingReplayRef.current = null
			execute(task).catch((err) => {
				console.error('[SidePanel] Failed to execute replay:', err)
			})
		}
	}, [config, status, execute])

	const handleExecuteReplay = useCallback(
		async (task: string, systemInstruction?: string) => {
			setView({ name: 'chat' })
			try {
				if (systemInstruction && config) {
					// Store task, then configure — execute will happen after agent reinit
					pendingReplayRef.current = task
					await configure({ ...config, systemInstruction })
				} else {
					await execute(task)
				}
			} catch (err) {
				console.error('[SidePanel] Failed to execute replay:', err)
			}
		},
		[execute, configure, config]
	)

	// --- View routing ---

	if (view.name === 'config') {
		return (
			<ConfigPanel
				config={config}
				onSave={async (newConfig) => {
					await configure(newConfig)
					setView({ name: 'chat' })
				}}
				onClose={() => setView({ name: 'chat' })}
			/>
		)
	}

	if (view.name === 'history') {
		return (
			<HistoryList
				onSelect={(id) => setView({ name: 'history-detail', sessionId: id })}
				onBack={() => setView({ name: 'chat' })}
			/>
		)
	}

	if (view.name === 'history-detail') {
		return <HistoryDetail sessionId={view.sessionId} onBack={() => setView({ name: 'history' })} />
	}

	if (view.name === 'recordings') {
		return (
			<RecordingList
				onSelect={(id) => setView({ name: 'recording-detail', recordingId: id })}
				onBack={() => setView({ name: 'chat' })}
				onReplay={handleReplay}
			/>
		)
	}

	if (view.name === 'recording-detail') {
		return (
			<RecordingDetail
				recordingId={view.recordingId}
				onBack={() => setView({ name: 'recordings' })}
				onReplay={handleExecuteReplay}
			/>
		)
	}

	// --- Chat view ---

	const isRunning = status === 'running'
	const isRecordingActive = recordingState === 'recording'
	const showEmptyState = !currentTask && history.length === 0 && !isRunning && !isRecordingActive

	return (
		<div className="relative flex flex-col h-screen bg-background">
			<MotionOverlay active={isRunning} />
			{/* Header */}
			<header className="flex items-center justify-between border-b px-3 py-2">
				<div className="flex items-center gap-2">
					<Logo className="size-5" />
					<span className="text-sm font-medium">Page Agent Ext</span>
				</div>
				<div className="flex items-center gap-1">
					<StatusDot status={status} />
					{/* Record button */}
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={isRecordingActive ? handleStopRecording : handleStartRecording}
						disabled={isRunning}
						className="cursor-pointer"
						title={isRecordingActive ? t('header.stopRecording') : t('header.startRecording')}
						aria-label={isRecordingActive ? t('header.stopRecording') : t('header.startRecording')}
					>
						<Circle
							className={`size-3.5 ${isRecordingActive ? 'fill-red-500 text-red-500 animate-pulse' : ''}`}
							aria-hidden="true"
						/>
					</Button>
					{/* Recordings list */}
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'recordings' })}
						className="cursor-pointer"
						title={t('header.recordings')}
						aria-label={t('header.recordings')}
					>
						<span className="text-sm" aria-hidden="true">🎬</span>
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'history' })}
						className="cursor-pointer"
					>
						<History className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'config' })}
						className="cursor-pointer"
					>
						<Settings className="size-3.5" />
					</Button>
				</div>
			</header>

			{/* Recording indicator */}
			{isRecordingActive && (
				<RecordingIndicator
					eventCount={eventCount}
					onStop={handleStopRecording}
					onDiscard={discardRecording}
				/>
			)}

			{/* Content */}
			<main className="flex-1 overflow-hidden flex flex-col">
				{/* Current task */}
				{currentTask && (
					<div className="border-b px-3 py-2 bg-muted/30">
						<div className="text-[10px] text-muted-foreground uppercase tracking-wide">Task</div>
						<div className="text-xs font-medium truncate" title={currentTask}>
							{currentTask}
						</div>
					</div>
				)}

				{/* History / Recording steps */}
				<div ref={historyRef} className="flex-1 overflow-y-auto p-3 space-y-2">
					{showEmptyState && <EmptyState />}

					{/* Show recording steps when recording */}
					{isRecordingActive &&
						recordingSteps.map((step, index) => (
							// eslint-disable-next-line react-x/no-array-index-key
							<RecordingStepCard key={index} step={step} index={index} />
						))}

					{/* Show agent history when not recording */}
					{!isRecordingActive &&
						history.map((event, index) => (
							// eslint-disable-next-line react-x/no-array-index-key
							<EventCard key={index} event={event} />
						))}

					{/* Activity indicator at bottom */}
					{activity && <ActivityCard activity={activity} />}
				</div>
			</main>

			{/* Input */}
			<footer className="border-t p-3">
				<InputGroup className="relative rounded-lg">
					{/* @ mention suggestions dropdown */}
					{showSuggestions && (
						<MentionSuggestions
							suggestions={suggestions}
							onSelect={(recording) => {
								selectSuggestion(recording)
								// Replace @query with @name in input
								const mentionName = recording.name || recording.startUrl || ''
								const newValue = inputValue.replace(/@[^\s]*$/, `@${mentionName} `)
								setInputValue(newValue)
								textareaRef.current?.focus()
							}}
						/>
					)}
					{/* Resolved recording indicator */}
					{resolvedRecording && (
						<div className="absolute -top-6 left-0 right-0 flex items-center gap-1 px-2 text-[10px] text-muted-foreground">
							<span aria-hidden="true">🎬</span>
							<span className="truncate">
								{resolvedRecording.name || resolvedRecording.startUrl}
							</span>
						</div>
					)}
					<InputGroupTextarea
						ref={textareaRef}
						placeholder="Describe your task... (@name to reference recording)"
						value={inputValue}
						onChange={(e) => {
							setInputValue(e.target.value)
							onMentionInputChange(e.target.value)
						}}
						onKeyDown={handleKeyDown}
						disabled={isRunning || isRecordingActive}
						className="text-xs pr-12 min-h-10"
					/>
					<InputGroupAddon align="inline-end" className="absolute bottom-0 right-0">
						{isRunning ? (
							<InputGroupButton
								size="icon-sm"
								variant="destructive"
								onClick={handleStop}
								className="size-7"
							>
								<Square className="size-3" />
							</InputGroupButton>
						) : (
							<InputGroupButton
								size="icon-sm"
								variant="default"
								onClick={() => handleSubmit()}
								disabled={!inputValue.trim() || isRecordingActive}
								className="size-7 cursor-pointer"
							>
								<Send className="size-3" />
							</InputGroupButton>
						)}
					</InputGroupAddon>
				</InputGroup>
			</footer>
		</div>
	)
}
