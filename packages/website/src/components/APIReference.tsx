/**
 * API Reference component for displaying TypeScript interface definitions
 *
 * Provides a beautiful, readable table for documenting API interfaces
 */
import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface PropDefinition {
	/** Property name */
	name: string
	/** TypeScript type (can include generics, unions, etc.) */
	type: string
	/** Whether the property is required */
	required?: boolean
	/** Default value if any */
	defaultValue?: string
	/** Description of the property */
	description: React.ReactNode
	/** Mark as experimental/deprecated */
	status?: 'experimental' | 'deprecated'
}

export interface APIReferenceProps {
	/** Title for the API section */
	title?: string
	/** Optional description */
	description?: React.ReactNode
	/** Property definitions */
	properties: PropDefinition[]
	/** Display variant: 'properties' for fields, 'methods' for methods */
	variant?: 'properties' | 'methods'
	/** Additional CSS classes */
	className?: string
}

// ============================================================================
// Component
// ============================================================================

export function APIReference({
	title,
	description,
	properties,
	variant = 'properties',
	className,
}: APIReferenceProps) {
	const isMethodsVariant = variant === 'methods'
	return (
		<div className={cn('my-6', className)}>
			{title && <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>}
			{description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}

			<div className="overflow-hidden rounded-lg border border-border">
				<table className="w-full text-sm">
					<thead>
						<tr className="bg-muted/50">
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">
								{isMethodsVariant ? 'Method' : 'Property'}
							</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">
								{isMethodsVariant ? 'Return Type' : 'Type'}
							</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
								Default
							</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{properties.map((prop) => (
							<PropRow key={prop.name} {...prop} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

function PropRow({ name, type, required, defaultValue, description, status }: PropDefinition) {
	return (
		<tr className="bg-background hover:bg-accent/50 transition-colors">
			{/* Property name */}
			<td className="px-4 py-3 align-top">
				<div className="flex items-center gap-2 flex-wrap">
					<code className="font-mono text-sm font-medium text-indigo-600 dark:text-indigo-400">
						{name}
					</code>
					{required && (
						<Badge
							variant="outline"
							className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
						>
							required
						</Badge>
					)}
					{status === 'experimental' && (
						<Badge
							variant="outline"
							className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400"
						>
							experimental
						</Badge>
					)}
					{status === 'deprecated' && (
						<Badge
							variant="outline"
							className="text-[10px] px-1.5 py-0 border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-500 line-through"
						>
							deprecated
						</Badge>
					)}
				</div>
			</td>

			{/* Type */}
			<td className="px-4 py-3 align-top">
				<code className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded wrap-break-word">
					{type}
				</code>
			</td>

			{/* Default value */}
			<td className="px-4 py-3 align-top hidden md:table-cell">
				{defaultValue ? (
					<code className="font-mono text-xs text-muted-foreground">{defaultValue}</code>
				) : (
					<span className="text-gray-400 dark:text-gray-600">-</span>
				)}
			</td>

			{/* Description */}
			<td className="px-4 py-3 align-top text-muted-foreground">{description}</td>
		</tr>
	)
}

// ============================================================================
// Utility Components
// ============================================================================

/** Code inline span for type references in descriptions */
export function TypeRef({ children }: { children: React.ReactNode }) {
	return (
		<code className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded">
			{children}
		</code>
	)
}

/** Section divider for grouping related APIs */
export function APIDivider({ title }: { title: string }) {
	return (
		<div className="flex items-center gap-4 my-8">
			<div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
			<span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
				{title}
			</span>
			<div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
		</div>
	)
}
