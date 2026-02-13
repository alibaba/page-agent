import type { AgentStatus } from '@page-agent/core'
import { Motion } from 'ai-motion'
import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

// Status dot indicator
export function StatusDot({ status }: { status: AgentStatus }) {
	const colorClass = {
		idle: 'bg-muted-foreground',
		running: 'bg-blue-500',
		completed: 'bg-green-500',
		error: 'bg-destructive',
	}[status]

	const label = {
		idle: 'Ready',
		running: 'Running',
		completed: 'Done',
		error: 'Error',
	}[status]

	return (
		<div className="flex items-center gap-1.5">
			<span
				className={cn('size-2 rounded-full', colorClass, status === 'running' && 'animate-pulse')}
			/>
			<span className="text-xs text-muted-foreground">{label}</span>
		</div>
	)
}

export function Logo({ className }: { className?: string }) {
	return <img src="/assets/page-agent-256.webp" alt="Page Agent" className={cn('', className)} />
}

// Full-screen ai-motion glow overlay, shown only while running
export function MotionOverlay({ active }: { active: boolean }) {
	const containerRef = useRef<HTMLDivElement>(null)
	const motionRef = useRef<Motion | null>(null)

	useEffect(() => {
		const motion = new Motion({
			mode: 'dark',
			borderWidth: 0,
			glowWidth: 120,
			borderRadius: 0,
			styles: { position: 'absolute', inset: '0' },
		})
		motionRef.current = motion
		containerRef.current!.appendChild(motion.element)
		motion.autoResize(containerRef.current!)

		return () => {
			motion.dispose()
			motionRef.current = null
		}
	}, [])

	useEffect(() => {
		const motion = motionRef.current
		if (!motion) return

		if (active) {
			motion.start()
			motion.fadeIn()
		} else {
			motion.fadeOut().then(() => motion.pause())
		}
	}, [active])

	return (
		<div
			ref={containerRef}
			className="pointer-events-none absolute inset-0 z-10 opacity-60"
			style={{ display: active ? undefined : 'none' }}
		/>
	)
}

// Empty state with logo and breathing glow
export function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
			<div className="relative">
				<div className="absolute inset-0 -m-6 rounded-full bg-[conic-gradient(from_180deg,oklch(0.55_0.2_280),oklch(0.55_0.15_220),oklch(0.6_0.18_160),oklch(0.55_0.2_280))] opacity-0 blur-2xl animate-[glow-breathe_4s_ease-in-out_infinite]" />
				<Logo className="relative size-20 opacity-80" />
			</div>
			<div>
				<h2 className="text-sm font-medium text-foreground">Page Agent Ext</h2>
				<p className="text-xs text-muted-foreground mt-1">Enter a task to automate this page</p>
			</div>
		</div>
	)
}
