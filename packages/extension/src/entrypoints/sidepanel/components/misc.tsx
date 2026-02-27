import type { AgentStatus } from '@page-agent/core'
import { Motion } from 'ai-motion'
import { BookOpen, Globe } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { siGithub } from 'simple-icons'

import { TypingAnimation } from '@/components/ui/typing-animation'
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
		<div className="flex items-center gap-1.5 mr-2">
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
		const mode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
		const motion = new Motion({
			mode,
			borderWidth: 4,
			borderRadius: 14,
			glowWidth: mode === 'dark' ? 120 : 60,
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

		let disposed = false
		if (active) {
			motion.start()
			motion.fadeIn()
		} else {
			motion.fadeOut().then(() => !disposed && motion.pause())
		}
		return () => {
			disposed = true
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
		<div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
			<div className="relative select-none pointer-events-none">
				<div className="absolute inset-0 -m-6 rounded-full bg-[conic-gradient(from_180deg,oklch(0.55_0.2_280),oklch(0.5_0.15_230),oklch(0.6_0.18_310),oklch(0.55_0.2_280))] blur-2xl animate-[glow-a_5s_ease-in-out_infinite]" />
				<div className="absolute inset-0 -m-6 rounded-full bg-[conic-gradient(from_0deg,oklch(0.55_0.18_160),oklch(0.5_0.2_200),oklch(0.6_0.15_120),oklch(0.55_0.18_160))] blur-2xl animate-[glow-b_5s_ease-in-out_infinite]" />
				<Logo className="relative size-20 opacity-80" />
			</div>
			<div>
				<h2 className="text-base font-medium text-foreground mb-1">Page Agent Ext</h2>
				<TypingAnimation
					className="text-sm text-muted-foreground"
					words={[
						'Enter a task to automate this page',
						'Execute multi-page tasks',
						'Call this extension from your web page',
						'Use this extension in your own agents',
					]}
					cursorStyle="underscore"
					loop
					typeSpeed={20}
					deleteSpeed={10}
					pauseDelay={3000}
				/>
			</div>
			<div className="flex items-center gap-3 mt-1 text-muted-foreground">
				<a
					href="https://github.com/alibaba/page-agent"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-foreground transition-colors"
					title="GitHub"
				>
					<svg role="img" viewBox="0 0 24 24" className="size-4 fill-current">
						<path d={siGithub.path} />
					</svg>
				</a>
				<a
					href="https://alibaba.github.io/page-agent/docs/features/chrome-extension"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-foreground transition-colors"
					title="Documentation"
				>
					<BookOpen className="size-4" />
				</a>
				<a
					href="https://alibaba.github.io/page-agent"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-foreground transition-colors"
					title="Website"
				>
					<Globe className="size-4" />
				</a>
			</div>
		</div>
	)
}
