import type { HistoricalEvent } from '@page-agent/core'

const EXPORT_FILE_PREFIX = 'page-agent-history'
const MAX_TASK_SLUG_LENGTH = 40

export function serializeHistoryExport(history: HistoricalEvent[]): string {
	return `${JSON.stringify(history, null, 2)}\n`
}

export function buildHistoryExportFilename(task: string, createdAt: number): string {
	const taskSlug = sanitizeTaskForFilename(task)
	const timestamp = formatTimestampForFilename(createdAt)

	return taskSlug
		? `${EXPORT_FILE_PREFIX}-${taskSlug}-${timestamp}.json`
		: `${EXPORT_FILE_PREFIX}-${timestamp}.json`
}

export function downloadHistoryExport(
	task: string,
	createdAt: number,
	history: HistoricalEvent[]
): void {
	const filename = buildHistoryExportFilename(task, createdAt)
	const content = serializeHistoryExport(history)
	const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')

	link.href = url
	link.download = filename
	link.click()

	URL.revokeObjectURL(url)
}

function sanitizeTaskForFilename(task: string): string {
	return task
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, MAX_TASK_SLUG_LENGTH)
}

function formatTimestampForFilename(createdAt: number): string {
	const date = new Date(createdAt)
	const year = date.getFullYear()
	const month = pad(date.getMonth() + 1)
	const day = pad(date.getDate())
	const hours = pad(date.getHours())
	const minutes = pad(date.getMinutes())
	const seconds = pad(date.getSeconds())

	return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}

function pad(value: number): string {
	return value.toString().padStart(2, '0')
}
