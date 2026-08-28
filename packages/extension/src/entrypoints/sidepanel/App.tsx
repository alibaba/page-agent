import { History, Paperclip, Send, Settings, Square, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ConfigPanel } from '@/components/ConfigPanel'
import { HistoryDetail } from '@/components/HistoryDetail'
import { HistoryList } from '@/components/HistoryList'
import { TaskProgress } from '@/components/TaskProgress'
import { EmptyState, Logo, MotionOverlay, StatusDot } from '@/components/misc'
import { Button } from '@/components/ui/button'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from '@/components/ui/input-group'
import { saveSession } from '@/lib/db'

import { useAgent } from '../../agent/useAgent'

/** Safety cap on attached image size (base64-encoded, sent inline to the LLM) — matches @eb-agent/ui Panel */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const DEFAULT_PLACEHOLDER = 'Describe your task... (Enter to send)'

type View =
	| { name: 'chat' }
	| { name: 'config' }
	| { name: 'history' }
	| { name: 'history-detail'; sessionId: string }

export default function App() {
	const [view, setView] = useState<View>({ name: 'chat' })
	const [inputValue, setInputValue] = useState('')
	const [pendingImage, setPendingImage] = useState<string | null>(null)
	const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER)
	const historyRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const imageFileInputRef = useRef<HTMLInputElement>(null)

	const { status, history, activity, currentTask, config, execute, stop, configure } = useAgent()

	/** Briefly replace the task input placeholder with a message (e.g. a validation error) */
	const flashPlaceholder = useCallback((message: string) => {
		setPlaceholder(message)
		setTimeout(
			() => setPlaceholder((current) => (current === message ? DEFAULT_PLACEHOLDER : current)),
			3000
		)
	}, [])

	/** Read an image file as a data URL and store it as the pending attachment */
	const handleImageFileSelected = useCallback(
		(file: File) => {
			if (!file.type.startsWith('image/')) return

			if (file.size > MAX_IMAGE_BYTES) {
				flashPlaceholder('Image is too large (max 8 MB)')
				return
			}

			const reader = new FileReader()
			reader.onload = () => setPendingImage(reader.result as string)
			reader.readAsDataURL(file)
		},
		[flashPlaceholder]
	)

	const clearPendingImage = useCallback(() => {
		setPendingImage(null)
		if (imageFileInputRef.current) imageFileInputRef.current.value = ''
	}, [])

	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			const items = e.clipboardData?.items
			if (!items) return
			for (const item of items) {
				if (item.type.startsWith('image/')) {
					const file = item.getAsFile()
					if (file) {
						e.preventDefault()
						handleImageFileSelected(file)
					}
					return
				}
			}
		},
		[handleImageFileSelected]
	)

	// Persist session when task finishes
	const prevStatusRef = useRef(status)
	useEffect(() => {
		const prev = prevStatusRef.current
		prevStatusRef.current = status

		if (
			prev === 'running' &&
			(status === 'completed' || status === 'error' || status === 'stopped') &&
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
	}, [history, activity])

	const runTask = useCallback(
		(task: string, image?: string) => {
			const normalizedTask = task.trim()
			if ((!normalizedTask && !image) || status === 'running') return

			setInputValue('')
			clearPendingImage()
			setView({ name: 'chat' })

			execute(
				normalizedTask ||
					'Identify what is shown in the attached image, then decide what to do next.',
				image ? { image } : undefined
			).catch((error) => {
				console.error('[SidePanel] Failed to execute task:', error)
			})
		},
		[execute, status, clearPendingImage]
	)

	const handleSubmit = useCallback(
		(e?: React.SyntheticEvent) => {
			e?.preventDefault()
			runTask(inputValue, pendingImage ?? undefined)
		},
		[inputValue, pendingImage, runTask]
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
				onRerun={runTask}
			/>
		)
	}

	if (view.name === 'history-detail') {
		return (
			<HistoryDetail
				sessionId={view.sessionId}
				onBack={() => setView({ name: 'history' })}
				onRerun={runTask}
			/>
		)
	}

	// --- Chat view ---

	const isRunning = status === 'running'
	const showEmptyState = !currentTask && history.length === 0 && !isRunning

	return (
		<div className="relative flex flex-col h-screen bg-background">
			<MotionOverlay active={isRunning} />
			{/* Header */}
			<header className="flex items-center justify-between border-b px-3 py-2">
				<div className="flex items-center gap-2">
					<Logo className="size-5" />
					<span className="text-sm font-medium">EBAgent Ext</span>
				</div>
				<div className="flex items-center gap-1">
					<StatusDot status={status} />
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'history' })}
						className="cursor-pointer"
						aria-label="History"
						title="History"
					>
						<History className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'config' })}
						className="cursor-pointer"
						aria-label="Settings"
						title="Settings"
					>
						<Settings className="size-3.5" />
					</Button>
				</div>
			</header>

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

				{/* History */}
				<div ref={historyRef} className="flex-1 overflow-y-auto p-3 space-y-2">
					{showEmptyState && <EmptyState />}

					<TaskProgress history={history} activity={activity} isRunning={isRunning} />
				</div>
			</main>

			{/* Input */}
			<footer className="border-t p-3 space-y-2">
				{pendingImage && (
					<div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
						<img src={pendingImage} alt="" className="size-6 rounded object-cover" />
						<span className="text-[11px] text-muted-foreground flex-1">Image attached</span>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={clearPendingImage}
							className="size-5 cursor-pointer"
							aria-label="Remove image"
							title="Remove image"
						>
							<X className="size-3" />
						</Button>
					</div>
				)}
				<input
					ref={imageFileInputRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0]
						if (file) handleImageFileSelected(file)
					}}
				/>
				<InputGroup className="relative rounded-lg">
					<InputGroupTextarea
						ref={textareaRef}
						placeholder={placeholder}
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						onPaste={handlePaste}
						disabled={isRunning}
						className="text-xs pr-12 pl-9 min-h-10"
					/>
					<InputGroupAddon align="inline-start" className="absolute bottom-0 left-0">
						<InputGroupButton
							size="icon-sm"
							variant="ghost"
							onClick={() => imageFileInputRef.current?.click()}
							disabled={isRunning}
							className="size-7 cursor-pointer"
							aria-label="Attach image"
							title="Attach image"
						>
							<Paperclip className="size-3.5" />
						</InputGroupButton>
					</InputGroupAddon>
					<InputGroupAddon align="inline-end" className="absolute bottom-0 right-0">
						{isRunning ? (
							<InputGroupButton
								size="icon-sm"
								variant="destructive"
								onClick={handleStop}
								className="size-7"
								aria-label="Stop task"
								title="Stop task"
							>
								<Square className="size-3" />
							</InputGroupButton>
						) : (
							<InputGroupButton
								size="icon-sm"
								variant="default"
								onClick={() => handleSubmit()}
								disabled={!inputValue.trim() && !pendingImage}
								className="size-7 cursor-pointer"
								aria-label="Send"
								title="Send"
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
