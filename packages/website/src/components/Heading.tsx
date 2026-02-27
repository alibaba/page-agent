import { ComponentPropsWithoutRef, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

type Level = 2 | 3

interface HeadingProps extends Omit<ComponentPropsWithoutRef<'h2'>, 'children'> {
	id: string
	level: Level
	children: React.ReactNode
}

const tags = { 2: 'h2', 3: 'h3' } as const

export function Heading({ id, level, className, children, ...props }: HeadingProps) {
	const ref = useRef<HTMLHeadingElement>(null)
	const Tag = tags[level]

	useEffect(() => {
		if (window.location.hash === `#${id}`) {
			ref.current?.scrollIntoView({ behavior: 'smooth' })
		}
	}, [id])

	return (
		<Tag ref={ref} id={id} className={cn('group relative scroll-mt-20', className)} {...props}>
			<a
				href={`#${id}`}
				className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity no-underline"
				aria-label={`Link to ${id}`}
			>
				#
			</a>
			{children}
		</Tag>
	)
}
