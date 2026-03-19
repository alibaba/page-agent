import {
	Globe,
	Keyboard,
	Mouse,
	MoveVertical,
	Pencil,
	Plus,
	PointerOff,
	SquareArrowOutUpRight,
	Type,
} from 'lucide-react'

import { t } from '@/lib/i18n'
import type { RecordedStep } from '@/lib/recording-types'

/**
 * RecordingStepCard — Single step rendered as icon + one-line description
 *
 * Phase 6: i18n, accessibility (aria-label on step)
 */
export function RecordingStepCard({
	step,
	index,
}: {
	step: RecordedStep
	index: number
}) {
	const { icon, label } = getStepDisplay(step)

	return (
		<div
			className="flex items-start gap-2 py-1.5 px-1"
			role="listitem"
			aria-label={`${t('detail.steps')} ${index + 1}: ${label}`}
		>
			<span className="text-[10px] text-muted-foreground w-4 text-right shrink-0 mt-0.5" aria-hidden="true">
				{index + 1}
			</span>
			<span className="text-muted-foreground shrink-0 mt-0.5" aria-hidden="true">{icon}</span>
			<span className="text-xs text-foreground/80 break-all line-clamp-2">{label}</span>
		</div>
	)
}

function getStepDisplay(step: RecordedStep): { icon: React.ReactNode; label: string } {
	const iconClass = 'size-3.5'
	const act = step.act
	const el = step.el

	switch (act.type) {
		case 'click': {
			const target = el?.text
				? `"${el.text.slice(0, 40)}"`
				: el?.ariaLabel
					? `(${el.ariaLabel})`
					: el?.placeholder
						? `(placeholder: ${el.placeholder})`
						: el?.tag || 'element'
			return {
				icon: <Mouse className={iconClass} />,
				label: `${t('step.click')} ${target}${el?.context ? ` ${t('step.in')} ${el.context}` : ''}`,
			}
		}

		case 'input': {
			const target = el?.placeholder || el?.ariaLabel || el?.name || el?.tag || 'field'
			const paramNote = act.param ? ` [PARAM:${act.param}]` : ''
			return {
				icon: <Type className={iconClass} />,
				label: `${t('step.type')} "${act.value.slice(0, 30)}" → ${target}${paramNote}`,
			}
		}

		case 'select': {
			const target = el?.name || el?.ariaLabel || 'select'
			return {
				icon: <Pencil className={iconClass} />,
				label: `${t('step.select')} "${act.value}" ${t('step.in')} ${target}`,
			}
		}

		case 'scroll':
			return {
				icon: <MoveVertical className={iconClass} />,
				label: `${t('step.scroll')} ${act.direction} ${act.pixels}px`,
			}

		case 'navigate':
			return {
				icon: <Globe className={iconClass} />,
				label: `${t('step.navigate')} ${act.url.slice(0, 60)}`,
			}

		case 'newTab':
			return {
				icon: <Plus className={iconClass} />,
				label: `${t('step.newTab')} ${act.url.slice(0, 60)}`,
			}

		case 'switchTab':
			return {
				icon: <SquareArrowOutUpRight className={iconClass} />,
				label: `${t('step.switchTab')} ${act.tabIdx}`,
			}

		case 'closeTab':
			return {
				icon: <PointerOff className={iconClass} />,
				label: `${t('step.closeTab')} ${act.tabIdx}`,
			}

		case 'keypress': {
			const mods = act.modifiers?.join('+') ?? ''
			const key = mods ? `${mods}+${act.key}` : act.key
			return {
				icon: <Keyboard className={iconClass} />,
				label: `${t('step.press')} ${key}`,
			}
		}

		case 'wait':
			return {
				icon: <span className="text-xs">⏳</span>,
				label: `${t('step.wait')} ${act.seconds}s`,
			}

		default:
			return {
				icon: <span className="text-xs">❓</span>,
				label: JSON.stringify(act),
			}
	}
}
