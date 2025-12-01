/**
 * Wait until condition becomes true
 * @returns Returns when condition becomes true, throws otherwise
 * @param timeout Timeout in milliseconds, default 0 means no timeout, throws error on timeout
 */
export async function waitUntil(check: () => boolean, timeout = 60 * 60_1000): Promise<boolean> {
	if (check()) return true

	return new Promise((resolve, reject) => {
		const start = Date.now()
		const interval = setInterval(() => {
			if (check()) {
				clearInterval(interval)
				resolve(true)
			} else if (Date.now() - start > timeout) {
				clearInterval(interval)
				reject(new Error('Timeout waiting for condition to become true'))
			}
		}, 100)
	})
}

//

export function truncate(text: string, maxLength: number): string {
	if (text.length > maxLength) {
		return text.substring(0, maxLength) + '...'
	}
	return text
}

//

export function trimLines(text: string): string {
	return text
		.split('\n')
		.map((line) => line.trim())
		.join('\n')
}

//

export function randomID(existingIDs?: string[]): string {
	let id = Math.random().toString(36).substring(2, 11)

	if (!existingIDs) {
		return id
	}

	const MAX_TRY = 1000
	let tryCount = 0

	while (existingIDs.includes(id)) {
		id = Math.random().toString(36).substring(2, 11)
		tryCount++
		if (tryCount > MAX_TRY) {
			throw new Error('randomID: too many try')
		}
	}

	return id
}

//

if (!window.__PAGE_AGENT_IDS__) {
	window.__PAGE_AGENT_IDS__ = []
}

const ids = window.__PAGE_AGENT_IDS__

/**
 * Generate a random ID.
 * @note Unique within this window.
 */
export function uid() {
	const id = randomID(ids)
	ids.push(id)
	return id
}
