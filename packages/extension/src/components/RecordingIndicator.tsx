import { Circle, Square, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'

/**
 * RecordingIndicator — Banner shown during active recording
 *
 * Phase 6: i18n, aria-live for screen readers
 */
export function RecordingIndicator({
	eventCount,
	onStop,
	onDiscard,
}: {
	eventCount: number
	onStop: () => void
	onDiscard: () => void
}) {
	return (
		<div
			className="flex items-center gap-2 border-b px-3 py-2 bg-red-500/10"
			role="status"
			aria-live="polite"
			aria-label={`${t('recording.status')} ${eventCount} ${t('recording.steps')}`}
		>
			{/* Pulsing red dot */}
			<span className="relative flex size-2.5" aria-hidden="true">
				<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
				<Circle className="relative inline-flex size-2.5 fill-red-500 text-red-500" />
			</span>

			<span className="text-xs font-medium text-red-600 dark:text-red-400 flex-1">
				{t('recording.status')}{' '}
				{eventCount > 0 && (
					<span className="text-muted-foreground">
						({eventCount} {t('recording.steps')})
					</span>
				)}
			</span>

			<Button
				variant="ghost"
				size="sm"
				onClick={onStop}
				className="text-[10px] h-6 px-2 text-red-600 hover:bg-red-500/20 cursor-pointer"
				aria-label={t('recording.stop')}
			>
				<Square className="size-3 mr-1" aria-hidden="true" />
				{t('recording.stop')}
			</Button>

			<Button
				variant="ghost"
				size="sm"
				onClick={onDiscard}
				className="text-[10px] h-6 px-2 text-muted-foreground hover:text-destructive cursor-pointer"
				aria-label={t('recording.discard')}
			>
				<Trash2 className="size-3 mr-1" aria-hidden="true" />
				{t('recording.discard')}
			</Button>
		</div>
	)
}
