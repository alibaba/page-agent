import { ArrowLeft, Play, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { clearRecordings, deleteRecording, listRecordings } from '@/lib/db'
import { t, timeAgoLocalized } from '@/lib/i18n'
import type { Recording } from '@/lib/recording-types'

/**
 * RecordingList — List all saved recordings (mirroring HistoryList pattern)
 *
 * Phase 6: i18n, accessibility, error handling
 */
export function RecordingList({
	onSelect,
	onBack,
	onReplay,
}: {
	onSelect: (id: string) => void
	onBack: () => void
	onReplay: (id: string) => void
}) {
	const [recordings, setRecordings] = useState<Recording[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async () => {
		try {
			setError(null)
			setRecordings(await listRecordings())
		} catch (err) {
			console.error('[RecordingList] Failed to load recordings:', err)
			setError(t('error.loadFailed'))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	const handleDelete = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		try {
			await deleteRecording(id)
			setRecordings((prev) => prev.filter((r) => r.id !== id))
		} catch (err) {
			console.error('[RecordingList] Failed to delete recording:', err)
		}
	}

	const handleClearAll = async () => {
		try {
			await clearRecordings()
			setRecordings([])
		} catch (err) {
			console.error('[RecordingList] Failed to clear recordings:', err)
		}
	}

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<header className="flex items-center gap-2 border-b px-3 py-2">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onBack}
					className="cursor-pointer"
					aria-label="Back"
				>
					<ArrowLeft className="size-3.5" />
				</Button>
				<span className="text-sm font-medium flex-1">{t('recordings.title')}</span>
				{recordings.length > 0 && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClearAll}
						className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer h-6 px-2"
					>
						<Trash2 className="size-3 mr-1" aria-hidden="true" />
						{t('recordings.clearAll')}
					</Button>
				)}
			</header>

			{/* List */}
			<div className="flex-1 overflow-y-auto" role="list" aria-label={t('recordings.title')}>
				{loading && (
					<div className="flex items-center justify-center h-32 text-xs text-muted-foreground" role="status">
						{t('recordings.loading')}
					</div>
				)}

				{error && (
					<div className="flex items-center justify-center h-32 text-xs text-destructive" role="alert">
						{error}
					</div>
				)}

				{!loading && !error && recordings.length === 0 && (
					<div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
						{t('recordings.empty')}
					</div>
				)}

				{recordings.map((recording) => (
					<div
						key={recording.id}
						role="button"
						tabIndex={0}
						onClick={() => onSelect(recording.id)}
						onKeyDown={(e) => e.key === 'Enter' && onSelect(recording.id)}
						className="w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-2 group"
						aria-label={`${recording.name || recording.startUrl || t('recordings.unnamed')} — ${recording.steps.length} ${t('recording.steps')}`}
					>
						{/* Icon */}
						<span className="text-base shrink-0 mt-0.5" aria-hidden="true">🎬</span>

						{/* Content */}
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium truncate">
								{recording.name || recording.startUrl || t('recordings.unnamed')}
							</p>
							<p className="text-[10px] text-muted-foreground mt-0.5">
								{timeAgoLocalized(recording.ts)} · {recording.steps.length} {t('recording.steps')}
							</p>
							{recording.desc && (
								<p className="text-[10px] text-muted-foreground truncate mt-0.5">
									{recording.desc}
								</p>
							)}
						</div>

						{/* Actions */}
						<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation()
									onReplay(recording.id)
								}}
								className="p-1 hover:text-blue-500 cursor-pointer"
								title={t('recordings.replay')}
								aria-label={t('recordings.replay')}
							>
								<Play className="size-3" />
							</button>
							<button
								type="button"
								onClick={(e) => handleDelete(e, recording.id)}
								className="p-1 hover:text-destructive cursor-pointer"
								title={t('recordings.delete')}
								aria-label={t('recordings.delete')}
							>
								<Trash2 className="size-3" />
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
