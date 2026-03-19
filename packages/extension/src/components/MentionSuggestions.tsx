/**
 * MentionSuggestions — Dropdown for @recording mention autocomplete
 */

import type { MentionSuggestion } from '@/agent/useRecordingMention'
import type { Recording } from '@/lib/recording-types'

export function MentionSuggestions({
	suggestions,
	onSelect,
}: {
	suggestions: MentionSuggestion[]
	onSelect: (recording: Recording) => void
}) {
	if (suggestions.length === 0) return null

	return (
		<div
			className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto"
			role="listbox"
			aria-label="Recording suggestions"
		>
			{suggestions.map((s) => (
				<button
					key={s.recording.id}
					type="button"
					role="option"
					onClick={() => onSelect(s.recording)}
					className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-2 text-xs"
				>
					<span className="text-sm shrink-0" aria-hidden="true">🎬</span>
					<div className="min-w-0 flex-1">
						<p className="font-medium truncate">{s.label}</p>
						{s.recording.desc && (
							<p className="text-[10px] text-muted-foreground truncate">{s.recording.desc}</p>
						)}
					</div>
					<span className="text-[10px] text-muted-foreground shrink-0">
						{s.recording.steps.length} steps
					</span>
				</button>
			))}
		</div>
	)
}
