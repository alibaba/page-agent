import { ComponentPropsWithoutRef, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

type Level = 2 | 3

interface HeadingProps extends Omit<ComponentPropsWithoutRef<'h2'>, 'children'> {
	id: string
	level?: Level
	children: React.ReactNode
}

const levelStyles = {
	2: { tag: 'h2', className: 'text-2xl font-semibold mb-4' },
	3: { tag: 'h3', className: 'text-xl font-semibold mb-3' },
} as const

export function Heading({ id, level = 2, className, children, ...props }: HeadingProps) {
	const ref = useRef<HTMLHeadingElement>(null)
	const { tag: Tag, className: defaultClassName } = levelStyles[level]

	useEffect(() => {
		if (window.location.hash === `#${id}`) {
			ref.current?.scrollIntoView({ behavior: 'smooth' })
		}
	}, [id])

	return (
		<Tag
			ref={ref}
			id={id}
			className={cn('group relative scroll-mt-20', defaultClassName, className)}
			{...props}
		>
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
