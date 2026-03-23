import { FoldVertical, Plug, PlugZap, Square, UnfoldVertical, Unplug } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useAgent } from '@/agent/useAgent'
import { ActivityCard, EventCard } from '@/components/cards'
import { Logo, MotionOverlay, StatusDot } from '@/components/misc'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

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
		disconnected: new URLSearchParams(location.search).get('ws') ? 'Disconnected' : 'No connection',
	}[wsState]

	return (
		<div className="flex h-screen bg-background">
			{/* Left — Protocol docs */}
			<aside className="w-80 shrink-0 border-r flex flex-col bg-muted/20">
				<a
					href="https://alibaba.github.io/page-agent/"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-2 px-5 h-12 border-b hover:bg-muted/30 transition-colors"
				>
					<Logo className="size-5" />
					<span className="text-sm font-semibold tracking-tight">Page Agent Hub</span>
					<span className="text-[9px] font-medium uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">
						Beta
					</span>
				</a>

				<div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
					<div className="text-xs text-muted-foreground leading-relaxed space-y-2">
						<p>
							Page Agent Hub lets local apps (e.g. MCP servers) control the Page Agent extension via
							WebSocket.
						</p>
						<p>
							Check out the official{' '}
							<a
								href="https://github.com/alibaba/page-agent/tree/main/packages/mcp"
								target="_blank"
								rel="noopener noreferrer"
								className="underline hover:text-foreground"
							>
								MCP server package
							</a>
							.
						</p>
					</div>

					<HubConfig />

					<ProtocolDocsCollapsible />
				</div>

				<div className="border-t px-5 py-3 text-[10px] text-muted-foreground/60 flex items-center justify-between">
					<span className="font-mono">v{__VERSION__}</span>
					<span>
						Built with ♥️ by{' '}
						<a
							href="https://github.com/gaomeng1900"
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:text-foreground"
						>
							@Simon
						</a>
					</span>
				</div>
			</aside>

			{/* Right — Live session */}
			<main className="flex-1 flex flex-col min-w-0 relative">
				<MotionOverlay active={isRunning} />

				<header className="flex items-center justify-between border-b px-5 h-12">
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

function HubConfig() {
	const [allowAll, setAllowAll] = useState(false)

	useEffect(() => {
		chrome.storage.local.get('allowAllHubConnection').then((r) => {
			setAllowAll(r.allowAllHubConnection === true)
		})
	}, [])

	const toggle = (checked: boolean) => {
		setAllowAll(checked)
		chrome.storage.local.set({ allowAllHubConnection: checked })
	}

	return (
		<div>
			<h3 className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider mb-2">
				Config
			</h3>
			<div className="group/hub relative">
				<label
					className={`flex items-center justify-between p-3 rounded-md border cursor-pointer text-xs ${allowAll ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-muted/50 text-muted-foreground'}`}
				>
					Auto-approve connections
					<Switch
						checked={allowAll}
						onCheckedChange={toggle}
						className={allowAll ? 'data-[state=checked]:bg-amber-500' : ''}
					/>
				</label>

				{/* hide with invisible absolute opacity-0*/}
				<div className="group-hover/hub:visible group-hover/hub:opacity-100 transition-opacity duration-150  left-0 right-0 top-full z-10 pt-2">
					<div className="relative p-2.5 rounded-md border border-border bg-background/60 backdrop-blur-md shadow-2xl text-muted-foreground text-xs leading-relaxed">
						<div className="absolute -top-1.5 left-5 size-3 rotate-45 rounded-[1px] border-l border-t border-border bg-background/60 backdrop-blur-md" />
						By default, each connection requires your approval before running tasks. <br />
						Enable this to skip per-session approval.
						<br />
						<span className="font-semibold">* Use with caution!</span>
					</div>
				</div>
			</div>
		</div>
	)
}

function ProtocolDocsCollapsible() {
	const [open, setOpen] = useState(false)

	return (
		<div>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1 text-[11px] font-semibold text-foreground/80 uppercase tracking-wider cursor-pointer"
			>
				Docs
				{open ? <FoldVertical className="size-3" /> : <UnfoldVertical className="size-3" />}
			</button>

			{open && (
				<div className="mt-3 space-y-4 text-xs text-muted-foreground">
					<p className="text-[10px]">
						Connect via <code className="text-[10px]">hub.html?ws=PORT</code>
					</p>

					<section>
						<h4 className="text-[11px] font-medium text-foreground/60 mb-1.5">Flow</h4>
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

					<section>
						<h4 className="text-[11px] font-medium text-foreground/60 mb-1.5">Caller → Hub</h4>
						<pre className="bg-muted/50 rounded-md p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
							{`{ type: "execute", task: string, config?: object }
{ type: "stop" }`}
						</pre>
					</section>

					<section>
						<h4 className="text-[11px] font-medium text-foreground/60 mb-1.5">Hub → Caller</h4>
						<pre className="bg-muted/50 rounded-md p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
							{`{ type: "ready" }
{ type: "result", success: boolean, data: string }
{ type: "error", message: string }`}
						</pre>
					</section>
				</div>
			)}
		</div>
	)
}
