import chalk from 'chalk'

export { normalizeResponse } from './autoFixer'

export async function waitFor(seconds: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

//

export function truncate(text: string, maxLength: number): string {
	if (text.length > maxLength) {
		return text.substring(0, maxLength) + '...'
	}
	return text
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
const _global = globalThis as any

if (!_global.__PAGE_AGENT_IDS__) {
	_global.__PAGE_AGENT_IDS__ = []
}

const ids = _global.__PAGE_AGENT_IDS__

/**
 * Generate a random ID.
 * @note Unique within this window.
 */
export function uid() {
	const id = randomID(ids)
	ids.push(id)
	return id
}

const llmsTxtCache = new Map<string, string | null>()

/** Fetch /llms.txt for a URL's origin. Cached per origin, `null` = tried and not found. */
export async function fetchLlmsTxt(url: string): Promise<string | null> {
	const origin = new URL(url).origin
	if (llmsTxtCache.has(origin)) return llmsTxtCache.get(origin)!

	const endpoint = `${origin}/llms.txt`
	let result: string | null = null
	try {
		console.log(chalk.gray(`[llms.txt] Fetching ${endpoint}`))
		const res = await fetch(endpoint, { signal: AbortSignal.timeout(3000) })
		if (res.ok) {
			result = await res.text()
			console.log(chalk.green(`[llms.txt] Found (${result.length} chars)`))
		} else {
			console.log(chalk.gray(`[llms.txt] ${res.status} for ${endpoint}`))
		}
	} catch (e) {
		console.log(chalk.gray(`[llms.txt] Failed for ${endpoint}`), e)
	}
	llmsTxtCache.set(origin, result)
	return result
}

/**
 * Simple assertion function that throws an error if the condition is falsy
 * @param condition - The condition to assert
 * @param message - Optional error message
 * @throws Error if condition is falsy
 */
export function assert(condition: unknown, message?: string, silent?: boolean): asserts condition {
	if (!condition) {
		const errorMessage = message ?? 'Assertion failed'

		if (!silent) console.error(chalk.red(`❌ assert: ${errorMessage}`))

		throw new Error(errorMessage)
	}
}
