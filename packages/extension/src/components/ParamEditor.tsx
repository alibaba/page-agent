import { useEffect, useState } from 'react'

import { t } from '@/lib/i18n'

/**
 * ParamEditor — Renders editable input fields for all param-marked values
 *
 * Phase 6: i18n, accessibility (labels, fieldset)
 */
export function ParamEditor({
	params,
	onChange,
}: {
	params: Map<string, string>
	onChange: (overrides: Record<string, string>) => void
}) {
	const [values, setValues] = useState<Record<string, string>>(() => {
		const initial: Record<string, string> = {}
		params.forEach((value, key) => {
			initial[key] = value
		})
		return initial
	})

	// Reset values when params change (e.g. navigating to a different recording)
	useEffect(() => {
		const updated: Record<string, string> = {}
		params.forEach((value, key) => {
			updated[key] = value
		})
		setValues(updated)
	}, [params])

	if (params.size === 0) return null

	const handleChange = (key: string, newValue: string) => {
		const updated = { ...values, [key]: newValue }
		setValues(updated)
		onChange(updated)
	}

	return (
		<fieldset className="space-y-2">
			<legend className="text-[10px] text-muted-foreground uppercase tracking-wide">
				{t('params.title')}
			</legend>
			{Array.from(params.entries()).map(([key, defaultValue]) => (
				<div key={key} className="flex items-center gap-2">
					<label
						htmlFor={`param-${key}`}
						className="text-xs text-muted-foreground w-24 shrink-0 truncate"
						title={key}
					>
						{key}
					</label>
					<input
						id={`param-${key}`}
						type="text"
						value={values[key] ?? defaultValue}
						onChange={(e) => handleChange(key, e.target.value)}
						placeholder={defaultValue}
						className="flex-1 text-xs px-2 py-1 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
						aria-label={`${t('params.title')}: ${key}`}
					/>
				</div>
			))}
		</fieldset>
	)
}
