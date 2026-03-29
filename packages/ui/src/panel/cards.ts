/**
 * Card HTML generation utilities for Panel
 */
import { escapeHtml } from '../utils'

import styles from './Panel.module.css'

export type CardType = 'default' | 'input' | 'output' | 'question' | 'observation' | 'tokenStats'

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
		? `<div class="${styles.reflectionLines}">${content.map((line) => `<span>${escapeHtml(line)}</span>`).join('')}</div>`
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
		lines.push(`🔍 ${reflection.evaluation_previous_goal}`)
	}
	if (reflection.memory) {
		lines.push(`💾 ${reflection.memory}`)
	}
	if (reflection.next_goal) {
		lines.push(`🎯 ${reflection.next_goal}`)
	}
	return lines
}
