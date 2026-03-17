import { ArrowLeft, Copy, Pencil, Play, Save } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { buildReplayTask, extractParams } from '@/agent/RecordingReplayAgent'
import { Button } from '@/components/ui/button'
import { getRecording, updateRecording } from '@/lib/db'
import { t } from '@/lib/i18n'
import type { Recording } from '@/lib/recording-types'

import { ParamEditor } from './ParamEditor'
import { RecordingStepCard } from './RecordingStepCard'

/**
 * RecordingDetail — Detail view for a single recording
 *
 * Features:
 * - Edit name & description
 * - View step list
 * - Edit parameters
 * - Natural language modification input
 * - Export JSON
 * - Replay button
 *
 * Phase 6: i18n, accessibility, error handling
 */
export function RecordingDetail({
	recordingId,
	onBack,
	onReplay,
}: {
	recordingId: string
	onBack: () => void
	onReplay: (task: string, systemInstruction?: string) => void
}) {
	const [recording, setRecording] = useState<Recording | null>(null)
	const [editing, setEditing] = useState(false)
	const [name, setName] = useState('')
	const [desc, setDesc] = useState('')
	const [paramOverrides, setParamOverrides] = useState<Record<string, string>>({})
	const [nlMod, setNlMod] = useState('')
	const [copied, setCopied] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		// Reset all state when navigating to a different recording
		setRecording(null)
		setEditing(false)
		setName('')
		setDesc('')
		setParamOverrides({})
		setNlMod('')
		setCopied(false)
		setError(null)

		getRecording(recordingId)
			.then((r) => {
				if (r) {
					setRecording(r)
					setName(r.name)
					setDesc(r.desc)
				} else {
					setError(t('error.loadFailed'))
				}
			})
			.catch((err) => {
				console.error('[RecordingDetail] Failed to load recording:', err)
				setError(t('error.loadFailed'))
			})
	}, [recordingId])

	const handleSave = useCallback(async () => {
		if (!recording) return
		try {
			const updated = { ...recording, name, desc }
			await updateRecording(updated)
			setRecording(updated)
			setEditing(false)
		} catch (err) {
			console.error('[RecordingDetail] Failed to save:', err)
		}
	}, [recording, name, desc])

	const handleExportJSON = useCallback(async () => {
		if (!recording) return
		try {
			const json = JSON.stringify(recording, null, 2)
			await navigator.clipboard.writeText(json)
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch (err) {
			console.error('[RecordingDetail] Failed to copy JSON:', err)
		}
	}, [recording])

	const handleReplay = useCallback(() => {
		if (!recording) return
		try {
			const { task, systemInstruction } = buildReplayTask(recording, paramOverrides, nlMod)
			onReplay(task, systemInstruction)
		} catch (err) {
			console.error('[RecordingDetail] Failed to build replay task:', err)
		}
	}, [recording, paramOverrides, nlMod, onReplay])

	if (error) {
		return (
			<div className="flex flex-col h-screen bg-background">
				<header className="flex items-center gap-2 border-b px-3 py-2">
					<Button variant="ghost" size="icon-sm" onClick={onBack} className="cursor-pointer" aria-label="Back">
						<ArrowLeft className="size-3.5" />
					</Button>
					<span className="text-sm font-medium flex-1 truncate">{t('detail.title')}</span>
				</header>
				<div className="flex items-center justify-center h-32 text-xs text-destructive" role="alert">
					{error}
				</div>
			</div>
		)
	}

	if (!recording) {
		return (
			<div className="flex items-center justify-center h-screen text-xs text-muted-foreground" role="status">
				{t('recordings.loading')}
			</div>
		)
	}

	const params = extractParams(recording)

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<header className="flex items-center gap-2 border-b px-3 py-2">
				<Button variant="ghost" size="icon-sm" onClick={onBack} className="cursor-pointer" aria-label="Back">
					<ArrowLeft className="size-3.5" />
				</Button>
				<span className="text-sm font-medium flex-1 truncate">{t('detail.title')}</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={handleExportJSON}
					className="text-[10px] h-6 px-2 cursor-pointer"
					aria-label={t('detail.exportJson')}
				>
					<Copy className="size-3 mr-1" aria-hidden="true" />
					{copied ? t('detail.copied') : t('detail.exportJson')}
				</Button>
			</header>

			{/* Content */}
			<div className="flex-1 overflow-y-auto">
				{/* Name & Description */}
				<div className="border-b px-3 py-3 space-y-2">
					{editing ? (
						<>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={t('detail.namePlaceholder')}
								className="w-full text-xs font-medium px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
								aria-label={t('detail.namePlaceholder')}
							/>
							<textarea
								value={desc}
								onChange={(e) => setDesc(e.target.value)}
								placeholder={t('detail.descPlaceholder')}
								rows={2}
								className="w-full text-xs px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
								aria-label={t('detail.descPlaceholder')}
							/>
							<Button
								variant="default"
								size="sm"
								onClick={handleSave}
								className="text-[10px] h-6 px-2 cursor-pointer"
							>
								<Save className="size-3 mr-1" aria-hidden="true" />
								{t('detail.save')}
							</Button>
						</>
					) : (
						<div className="flex items-start justify-between">
							<div>
								<p className="text-xs font-medium">
									{recording.name || t('recordings.unnamed')}
								</p>
								{recording.desc && (
									<p className="text-[10px] text-muted-foreground mt-0.5">
										{recording.desc}
									</p>
								)}
								<p className="text-[10px] text-muted-foreground mt-0.5">
									{recording.steps.length} {t('recording.steps')} · {recording.startUrl}
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setEditing(true)}
								className="cursor-pointer shrink-0"
								aria-label="Edit"
							>
								<Pencil className="size-3" />
							</Button>
						</div>
					)}
				</div>

				{/* Parameters */}
				{params.size > 0 && (
					<div className="border-b px-3 py-3">
						<ParamEditor params={params} onChange={setParamOverrides} />
					</div>
				)}

				{/* Natural language modification */}
				<div className="border-b px-3 py-3 space-y-1">
					<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
						{t('detail.modification')}
					</div>
					<textarea
						value={nlMod}
						onChange={(e) => setNlMod(e.target.value)}
						placeholder={t('detail.modPlaceholder')}
						rows={2}
						className="w-full text-xs px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
						aria-label={t('detail.modification')}
					/>
				</div>

				{/* Steps */}
				<div className="px-3 py-3">
					<div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
						{t('detail.steps')} ({recording.steps.length})
					</div>
					<div className="space-y-0.5" role="list" aria-label={t('detail.steps')}>
						{recording.steps.map((step, index) => (
							// eslint-disable-next-line react-x/no-array-index-key
							<RecordingStepCard key={index} step={step} index={index} />
						))}
					</div>
				</div>
			</div>

			{/* Replay button */}
			<footer className="border-t p-3">
				<Button
					variant="default"
					className="w-full cursor-pointer"
					onClick={handleReplay}
					aria-label={t('detail.replayBtn')}
				>
					<Play className="size-3.5 mr-2" aria-hidden="true" />
					{t('detail.replayBtn')}
				</Button>
			</footer>
		</div>
	)
}
