import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { type SessionRecord, getSession } from '@/lib/db'

import { EventCard } from './cards'

export function HistoryDetail({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
	const [session, setSession] = useState<SessionRecord | null>(null)

	useEffect(() => {
		getSession(sessionId).then((s) => setSession(s ?? null))
	}, [sessionId])

	if (!session) {
		return (
			<div className="flex items-center justify-center h-screen text-xs text-muted-foreground">
				Loading...
			</div>
		)
	}

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<header className="flex items-center gap-2 border-b px-3 py-2">
				<Button variant="ghost" size="icon-sm" onClick={onBack} className="cursor-pointer">
					<ArrowLeft className="size-3.5" />
				</Button>
				<span className="text-sm font-medium truncate">History</span>
			</header>

			{/* Task */}
			<div className="border-b px-3 py-2 bg-muted/30">
				<div className="text-[10px] text-muted-foreground uppercase tracking-wide">Task</div>
				<div className="text-xs font-medium" title={session.task}>
					{session.task}
				</div>
			</div>

			{/* Events (read-only) */}
			<div className="flex-1 overflow-y-auto p-3 space-y-2">
				{session.history.map((event, index) => (
					// eslint-disable-next-line react-x/no-array-index-key
					<EventCard key={index} event={event} />
				))}
			</div>
		</div>
	)
}
