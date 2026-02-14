import { MotionProps, motion, useInView } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface TypingAnimationProps extends MotionProps {
	children?: string
	words?: string[]
	className?: string
	duration?: number
	typeSpeed?: number
	deleteSpeed?: number
	delay?: number
	pauseDelay?: number
	loop?: boolean
	as?: React.ElementType
	startOnView?: boolean
	showCursor?: boolean
	blinkCursor?: boolean
	cursorStyle?: 'line' | 'block' | 'underscore'
}

export function TypingAnimation({
	children,
	words,
	className,
	duration = 100,
	typeSpeed,
	deleteSpeed,
	delay = 0,
	pauseDelay = 1000,
	loop = false,
	as: Component = 'span',
	startOnView = true,
	showCursor = true,
	blinkCursor = true,
	cursorStyle = 'line',
	...props
}: TypingAnimationProps) {
	const MotionComponent = motion.create(Component, {
		forwardMotionProps: true,
	})

	const [displayedText, setDisplayedText] = useState<string>('')
	const [currentWordIndex, setCurrentWordIndex] = useState(0)
	const [currentCharIndex, setCurrentCharIndex] = useState(0)
	const [phase, setPhase] = useState<'typing' | 'pause' | 'deleting'>('typing')
	const elementRef = useRef<HTMLElement | null>(null)
	const isInView = useInView(elementRef as React.RefObject<Element>, {
		amount: 0.3,
		once: true,
	})

	const wordsToAnimate = useMemo(() => words || (children ? [children] : []), [words, children])
	const hasMultipleWords = wordsToAnimate.length > 1

	const typingSpeed = typeSpeed || duration
	const deletingSpeed = deleteSpeed || typingSpeed / 2

	const shouldStart = startOnView ? isInView : true

	useEffect(() => {
		if (!shouldStart || wordsToAnimate.length === 0) return

		const timeoutDelay =
			delay > 0 && displayedText === ''
				? delay
				: phase === 'typing'
					? typingSpeed
					: phase === 'deleting'
						? deletingSpeed
						: pauseDelay

		const timeout = setTimeout(() => {
			const currentWord = wordsToAnimate[currentWordIndex] || ''
			const graphemes = Array.from(currentWord)

			switch (phase) {
				case 'typing':
					if (currentCharIndex < graphemes.length) {
						setDisplayedText(graphemes.slice(0, currentCharIndex + 1).join(''))
						setCurrentCharIndex(currentCharIndex + 1)
					} else {
						if (hasMultipleWords || loop) {
							const isLastWord = currentWordIndex === wordsToAnimate.length - 1
							if (!isLastWord || loop) {
								setPhase('pause')
							}
						}
					}
					break

				case 'pause':
					setPhase('deleting')
					break

				case 'deleting':
					if (currentCharIndex > 0) {
						setDisplayedText(graphemes.slice(0, currentCharIndex - 1).join(''))
						setCurrentCharIndex(currentCharIndex - 1)
					} else {
						const nextIndex = (currentWordIndex + 1) % wordsToAnimate.length
						setCurrentWordIndex(nextIndex)
						setPhase('typing')
					}
					break
			}
		}, timeoutDelay)

		return () => clearTimeout(timeout)
	}, [
		shouldStart,
		phase,
		currentCharIndex,
		currentWordIndex,
		displayedText,
		wordsToAnimate,
		hasMultipleWords,
		loop,
		typingSpeed,
		deletingSpeed,
		pauseDelay,
		delay,
	])

	const currentWordGraphemes = Array.from(wordsToAnimate[currentWordIndex] || '')
	const isComplete =
		!loop &&
		currentWordIndex === wordsToAnimate.length - 1 &&
		currentCharIndex >= currentWordGraphemes.length &&
		phase !== 'deleting'

	const shouldShowCursor =
		showCursor &&
		!isComplete &&
		(hasMultipleWords || loop || currentCharIndex < currentWordGraphemes.length)

	const getCursorChar = () => {
		switch (cursorStyle) {
			case 'block':
				return '▌'
			case 'underscore':
				return '_'
			case 'line':
			default:
				return '|'
		}
	}

	return (
		<MotionComponent
			ref={elementRef}
			className={cn('leading-[5rem] tracking-[-0.02em]', className)}
			{...props}
		>
			{displayedText}
			{shouldShowCursor && (
				<span className={cn('inline-block', blinkCursor && 'animate-blink-cursor')}>
					{getCursorChar()}
				</span>
			)}
		</MotionComponent>
	)
}
