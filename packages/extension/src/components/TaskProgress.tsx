import type { AgentActivity, AgentStepEvent, HistoricalEvent } from '@eb-agent/core'
import { ChevronDown, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import { ActivityCard, EventCard } from './cards'

/** Playful rotating status verbs shown while the agent is running, in place of a raw step log. */
const STATUS_VERBS = [
	'Thinking',
	'Cooking',
	'Percolating',
	'Marinating',
	'Simmering',
	'Noodling',
	'Puzzling',
	'Pondering',
	'Ruminating',
	'Navigating',
	'Exploring',
	'Tinkering',
	'Scheming',
	'Brewing',
	'Conjuring',
]

const ROTATE_INTERVAL_MS = 2400

/** Cycles through STATUS_VERBS on an interval while `active`, resetting to the first word otherwise. */
function useRotatingVerb(active: boolean): string {
	const [index, setIndex] = useState(0)

	useEffect(() => {
		// No reset-to-0 on stop: the verb is only rendered while `active` anyway (see JSX below),
		// so leaving the index where it was just means the next run picks up from there.
		if (!active) return
		const id = setInterval(() => {
			setIndex((i) => (i + 1) % STATUS_VERBS.length)
		}, ROTATE_INTERVAL_MS)
		return () => clearInterval(id)
	}, [active])

	return STATUS_VERBS[index]
}

interface TaskProgressProps {
	history: HistoricalEvent[]
	activity: AgentActivity | null
	isRunning: boolean
}

/**
 * Replaces the raw step-by-step trace with a closed-by-default dropdown.
 * - Collapsed header: a rotating "Cooking…"-style status word while running, or a step count once idle.
 * - Expanded: the full existing step/action/observation trace, for anyone who wants to inspect it.
 * - The final `done` result (or a task-ending error) always renders outside the collapse, since that's
 *   the actual answer — it shouldn't require expanding a dropdown to see.
 */
export function TaskProgress({ history, activity, isRunning }: TaskProgressProps) {
	const [open, setOpen] = useState(false)
	const verb = useRotatingVerb(isRunning)

	if (history.length === 0 && !isRunning) return null

	const stepCount = history.filter((e) => e.type === 'step').length

	const doneIndex = history.findIndex(
		(e) => e.type === 'step' && (e as AgentStepEvent).action?.name === 'done'
	)
	const hasFinalOutcome = doneIndex !== -1
	const traceEvents = hasFinalOutcome ? history.slice(0, doneIndex) : history
	const finalEvent = hasFinalOutcome ? history[doneIndex] : undefined
	// Surface a task-ending error the same way, even though it didn't go through `done`.
	const lastEvent = history[history.length - 1]
	const finalError =
		!hasFinalOutcome && !isRunning && lastEvent?.type === 'error' ? lastEvent : undefined

	return (
		<div className="space-y-2">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-2 text-left cursor-pointer hover:bg-muted/60 transition-colors"
			>
				<div className="relative shrink-0">
					<Sparkles
						className={cn('size-3.5', isRunning ? 'text-blue-500' : 'text-muted-foreground')}
					/>
					{isRunning && (
						<span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-blue-500 animate-ping" />
					)}
				</div>
				<span
					className={cn(
						'flex-1 text-xs font-medium truncate',
						isRunning ? 'text-blue-500' : 'text-muted-foreground'
					)}
				>
					{isRunning ? `${verb}…` : `${stepCount} step${stepCount === 1 ? '' : 's'}`}
				</span>
				<ChevronDown
					className={cn(
						'size-3.5 shrink-0 text-muted-foreground transition-transform',
						open && 'rotate-180'
					)}
				/>
			</button>

			{open && (
				<div className="space-y-2 pl-2.5 ml-1 border-l-2 border-muted">
					{traceEvents.map((event, index) => (
						<EventCard key={index} event={event} />
					))}
					{isRunning && activity && <ActivityCard activity={activity} />}
				</div>
			)}

			{finalEvent && <EventCard event={finalEvent} />}
			{finalError && <EventCard event={finalError} />}
		</div>
	)
}
