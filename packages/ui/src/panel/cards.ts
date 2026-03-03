/**
 * Card HTML generation utilities for Panel
 */
import { escapeHtml } from '../utils'

import styles from './Panel.module.css'

type CardType = 'default' | 'input' | 'output' | 'question' | 'observation'

interface CardOptions {
	icon: string
	content: string | string[]
	meta?: string
	type?: CardType
}

/** Create a single history card */
export function createCard({ icon, content, meta, type }: CardOptions): string {
	const typeClass = type ? styles[type] : ''
	const contentHtml = Array.isArray(content)
		? `<div class="${styles.reflectionLines}">${content.join('')}</div>`
		: `<span>${escapeHtml(content)}</span>`

	return `
		<div class="${styles.historyItem} ${typeClass}">
			<div class="${styles.historyContent}">
				<span class="${styles.statusIcon}">${icon}</span>
				${contentHtml}
			</div>
			${meta ? `<div class="${styles.historyMeta}">${meta}</div>` : ''}
		</div>
	`
}

/** Create reflection lines from reflection object */
export function createReflectionLines(reflection: {
	evaluation_previous_goal?: string
	memory?: string
	next_goal?: string
}): string[] {
	const lines: string[] = []
	if (reflection.evaluation_previous_goal) {
		lines.push(`<div>🔍 ${escapeHtml(reflection.evaluation_previous_goal)}</div>`)
	}
	if (reflection.memory) {
		lines.push(`<div>💾 ${escapeHtml(reflection.memory)}</div>`)
	}
	if (reflection.next_goal) {
		lines.push(`<div>🎯 ${escapeHtml(reflection.next_goal)}</div>`)
	}
	return lines
}
