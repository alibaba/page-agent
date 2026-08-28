/**
 * Card HTML generation utilities for Panel
 */
import { escapeHtml } from '../utils'

import styles from './Panel.module.css'

type CardType = 'default' | 'input' | 'output' | 'question' | 'observation'

/** Semantic icon names rendered as inline SVGs (no emojis) */
export type CardIcon =
	| 'task'
	| 'brain'
	| 'eye'
	| 'question'
	| 'answer'
	| 'agent'
	| 'tool'
	| 'retry'
	| 'error'
	| 'user'
	| 'check'

const svg = (paths: string): string =>
	`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`

/** Minimal stroke icon set (lucide-style paths), colored via currentColor */
const CARD_ICONS: Record<CardIcon, string> = {
	task: svg(
		'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
	),
	brain: svg(
		'<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4.1 12.7c.7.5 1.1 1.4 1.1 2.3h6c0-.9.4-1.8 1.1-2.3A7 7 0 0 0 12 2z"/>'
	),
	eye: svg(
		'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'
	),
	question: svg(
		'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
	),
	answer: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
	agent: svg(
		'<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><path d="M9 14h.01"/><path d="M15 14h.01"/>'
	),
	tool: svg(
		'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'
	),
	retry: svg(
		'<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>'
	),
	error: svg(
		'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
	),
	user: svg('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
	check: svg('<path d="M20 6 9 17l-5-5"/>'),
}

/** Control-bar icons for Panel buttons */
export const UI_ICONS = {
	chevronDown: svg('<path d="m6 9 6 6 6-6"/>'),
	chevronUp: svg('<path d="m18 15-6-6-6 6"/>'),
	stop: svg('<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/>'),
	close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
	attachImage: svg(
		'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'
	),
} as const

/** A labeled reflection line, e.g. { label: 'Next', text: 'Open the form' } */
export interface ReflectionLine {
	label: string
	text: string
}

interface CardOptions {
	icon: CardIcon
	content: string | ReflectionLine[]
	meta?: string
	type?: CardType
}

/** Create a single history card */
export function createCard({ icon, content, meta, type }: CardOptions): string {
	const typeClass = type ? styles[type] : ''
	const contentHtml = Array.isArray(content)
		? `<div class="${styles.reflectionLines}">${content
				.map(
					(line) =>
						`<span class="${styles.reflectionLine}"><span class="${styles.reflectionLabel}">${escapeHtml(line.label)}</span>${escapeHtml(line.text)}</span>`
				)
				.join('')}</div>`
		: `<span>${escapeHtml(content)}</span>`

	return `
		<div class="${styles.historyItem} ${typeClass}">
			<div class="${styles.historyContent}">
				<span class="${styles.statusIcon}">${CARD_ICONS[icon]}</span>
				${contentHtml}
			</div>
			${meta ? `<div class="${styles.historyMeta}">${meta}</div>` : ''}
		</div>
	`
}

/** Create labeled reflection lines from a reflection object */
export function createReflectionLines(
	reflection: {
		evaluation_previous_goal?: string
		memory?: string
		next_goal?: string
	},
	labels: { evaluation: string; memory: string; next: string }
): ReflectionLine[] {
	const lines: ReflectionLine[] = []
	if (reflection.evaluation_previous_goal) {
		lines.push({ label: labels.evaluation, text: reflection.evaluation_previous_goal })
	}
	if (reflection.memory) {
		lines.push({ label: labels.memory, text: reflection.memory })
	}
	if (reflection.next_goal) {
		lines.push({ label: labels.next, text: reflection.next_goal })
	}
	return lines
}
