import { ArrowLeft, CheckCircle, Trash2, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { type SessionRecord, clearSessions, deleteSession, listSessions } from '@/lib/db'

function timeAgo(ts: number): string {
	const seconds = Math.floor((Date.now() - ts) / 1000)
	if (seconds < 60) return 'just now'
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	return `${days}d ago`
}

export function HistoryList({
	onSelect,
	onBack,
}: {
	onSelect: (id: string) => void
	onBack: () => void
}) {
	const [sessions, setSessions] = useState<SessionRecord[]>([])
	const [loading, setLoading] = useState(true)

	const load = useCallback(async () => {
		setSessions(await listSessions())
		setLoading(false)
	}, [])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		load()
	}, [load])

	const handleDelete = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation()
		await deleteSession(id)
		setSessions((prev) => prev.filter((s) => s.id !== id))
	}

	return (
		<div className="flex flex-col h-screen bg-background">
			{/* Header */}
			<header className="flex items-center gap-2 border-b px-3 py-2">
				<Button variant="ghost" size="icon-sm" onClick={onBack} className="cursor-pointer">
					<ArrowLeft className="size-3.5" />
				</Button>
				<span className="text-sm font-medium flex-1">History</span>
				{sessions.length > 0 && (
					<Button
						variant="ghost"
						size="sm"
						onClick={async () => {
							await clearSessions()
							setSessions([])
						}}
						className="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer h-6 px-2"
					>
						<Trash2 className="size-3 mr-1" />
						Clear All
					</Button>
				)}
			</header>

			{/* List */}
			<div className="flex-1 overflow-y-auto">
				{loading && (
					<div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
						Loading...
					</div>
				)}

				{!loading && sessions.length === 0 && (
					<div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
						No history yet
					</div>
				)}

				{sessions.map((session) => (
					<div
						key={session.id}
						role="button"
						tabIndex={0}
						onClick={() => onSelect(session.id)}
						onKeyDown={(e) => e.key === 'Enter' && onSelect(session.id)}
						className="w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-2 group"
					>
						{/* Status icon */}
						{session.status === 'completed' ? (
							<CheckCircle className="size-3.5 text-green-500 shrink-0 mt-0.5" />
						) : (
							<XCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
						)}

						{/* Content */}
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium truncate">{session.task}</p>
							<p className="text-[10px] text-muted-foreground mt-0.5">
								{timeAgo(session.createdAt)} · {session.history.length} steps
							</p>
						</div>

						{/* Delete */}
						<button
							type="button"
							onClick={(e) => handleDelete(e, session.id)}
							className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive cursor-pointer shrink-0"
						>
							<Trash2 className="size-3" />
						</button>
					</div>
				))}
			</div>
		</div>
	)
}
