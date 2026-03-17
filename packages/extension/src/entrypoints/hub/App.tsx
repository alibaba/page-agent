import { Plug, PlugZap, Square, Unplug } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useAgent } from '@/agent/useAgent'
import { ActivityCard, EventCard } from '@/components/cards'
import { Logo, MotionOverlay, StatusDot } from '@/components/misc'
import { Button } from '@/components/ui/button'

import { useHubWs } from './hub-ws'

export default function App() {
	const { status, history, activity, currentTask, config, execute, stop, configure } = useAgent()
	const { wsState } = useHubWs(execute, stop, configure, config)

	const historyRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (historyRef.current) {
			historyRef.current.scrollTop = historyRef.current.scrollHeight
		}
	}, [history, activity])

	const isRunning = status === 'running'
	const WsIcon = wsState === 'connected' ? PlugZap : wsState === 'connecting' ? Plug : Unplug
	const wsLabel = {
		connected: 'Connected',
		connecting: 'Connecting…',
		disconnected: new URLSearchParams(location.search).get('ws') ? 'Disconnected' : 'Standalone',
	}[wsState]

	return (
		<div className="flex h-screen bg-background">
			<MotionOverlay active={isRunning} />

			{/* Left — Protocol docs */}
			<aside className="w-80 shrink-0 border-r flex flex-col bg-muted/20">
				<div className="flex items-center gap-2 px-5 py-4 border-b">
					<Logo className="size-5" />
					<span className="text-sm font-semibold tracking-tight">Page Agent Hub</span>
				</div>

				<div className="flex-1 overflow-y-auto px-5 py-4">
					<ProtocolDocs />
				</div>

				<div className="border-t px-5 py-3 text-[11px] text-muted-foreground/60">
					Connect via <code className="text-[10px]">hub.html?ws=PORT</code>
				</div>
			</aside>

			{/* Right — Live session */}
			<main className="flex-1 flex flex-col min-w-0">
				{/* Header bar */}
				<header className="flex items-center justify-between border-b px-5 py-3">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<WsIcon className="size-3.5" />
						<span>{wsLabel}</span>
					</div>
					<div className="flex items-center gap-3">
						<StatusDot status={status} />
						{isRunning && (
							<Button variant="destructive" size="sm" onClick={stop} className="h-7 text-xs">
								<Square className="size-3 mr-1" />
								Stop
							</Button>
						)}
					</div>
				</header>

				{/* Task banner */}
				{currentTask && (
					<div className="border-b px-5 py-2 bg-muted/30">
						<div className="text-[10px] text-muted-foreground uppercase tracking-wide">
							Current Task
						</div>
						<div className="text-sm font-medium truncate" title={currentTask}>
							{currentTask}
						</div>
					</div>
				)}

				{/* Event stream */}
				<div ref={historyRef} className="flex-1 overflow-y-auto p-5 space-y-2">
					{!currentTask && history.length === 0 && !isRunning && (
						<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
							<WsIcon className="size-10 opacity-30" />
							<p className="text-sm">
								{wsState === 'connected'
									? 'Waiting for task from external caller…'
									: 'No active session'}
							</p>
						</div>
					)}

					{history.map((event, index) => (
						// eslint-disable-next-line react-x/no-array-index-key
						<EventCard key={index} event={event} />
					))}

					{activity && <ActivityCard activity={activity} />}
				</div>
			</main>
		</div>
	)
}

function ProtocolDocs() {
	return (
		<div className="space-y-5 text-xs text-muted-foreground">
			<section>
				<h3 className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider mb-2">
					Caller → Hub
				</h3>
				<pre className="bg-muted/50 rounded-md p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
					{`{ type: "execute", task: string, config?: object }
{ type: "stop" }`}
				</pre>
			</section>

			<section>
				<h3 className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider mb-2">
					Hub → Caller
				</h3>
				<pre className="bg-muted/50 rounded-md p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
					{`{ type: "ready" }
{ type: "result", success: boolean, data: string }
{ type: "error", message: string }`}
				</pre>
			</section>

			<section>
				<h3 className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider mb-2">
					Flow
				</h3>
				<ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
					<li>Hub opens WS to caller's server</li>
					<li>
						Sends <code className="text-[10px]">ready</code>
					</li>
					<li>
						Caller sends <code className="text-[10px]">execute</code> with task
					</li>
					<li>Hub runs agent, streams events</li>
					<li>
						Hub sends <code className="text-[10px]">result</code> or{' '}
						<code className="text-[10px]">error</code>
					</li>
				</ol>
			</section>
		</div>
	)
}
