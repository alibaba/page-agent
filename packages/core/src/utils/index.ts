import chalk from 'chalk'

export * from './autoFixer'

/**
 * Wait for a specified number of seconds.
 * @param seconds - Number of seconds to wait
 * @returns Promise that resolves after the specified time
 */
export async function waitFor(seconds: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

/**
 * Truncate text to a maximum length, appending ellipsis if truncated.
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed, or original text if within limit
 */
export function truncate(text: string, maxLength: number): string {
	if (text.length > maxLength) {
		return text.substring(0, maxLength) + '...'
	}
	return text
}

/**
 * Options for randomID generation.
 */
export interface RandomIDOptions {
	/** Existing IDs to avoid collisions with */
	existingIDs?: string[]
	/** Maximum number of attempts before throwing (default: 1000) */
	maxAttempts?: number
}

/**
 * Generate a random alphanumeric ID (9 characters).
 * @param options - Options for ID generation, or existing IDs array for backward compatibility
 * @returns Unique random ID
 * @throws Error if unable to generate unique ID within max attempts
 */
export function randomID(options?: RandomIDOptions | string[]): string {
	// Backward compatibility: accept string array directly
	const existingIDs = Array.isArray(options) ? options : options?.existingIDs
	const maxAttempts = Array.isArray(options) ? 1000 : (options?.maxAttempts ?? 1000)

	let id = Math.random().toString(36).substring(2, 11)

	if (!existingIDs) {
		return id
	}

	let attemptCount = 0

	while (existingIDs.includes(id)) {
		id = Math.random().toString(36).substring(2, 11)
		attemptCount++
		if (attemptCount > maxAttempts) {
			throw new Error(`randomID: Failed to generate unique ID after ${maxAttempts} attempts`)
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
			if (result.length > 1000) {
				console.log(chalk.yellow(`[llms.txt] Truncating to 1000 chars`))
				result = truncate(result, 1000)
			}
		} else {
			console.debug(chalk.gray(`[llms.txt] ${res.status} for ${endpoint}`))
		}
	} catch (e) {
		console.debug(chalk.gray(`[llms.txt] not found for ${endpoint}`), e)
	}
	llmsTxtCache.set(origin, result)
	return result
}

/**
 * Debounce a function call.
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}
		timeoutId = setTimeout(() => {
			fn(...args)
			timeoutId = null
		}, delay)
	}
}

/**
 * Throttle a function call.
 * @param fn - Function to throttle
 * @param limit - Minimum time between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
	fn: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle = false

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			fn(...args)
			inThrottle = true
			setTimeout(() => {
				inThrottle = false
			}, limit)
		}
	}
}

/**
 * Sleep for a specified number of milliseconds.
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff.
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Result of the function
 * @throws Error if all retries fail
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: {
		maxRetries?: number
		initialDelay?: number
		maxDelay?: number
		onRetry?: (error: Error, attempt: number) => void
	} = {}
): Promise<T> {
	const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, onRetry } = options

	let lastError: Error | null = null
	let delay = initialDelay

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error as Error
			if (attempt < maxRetries) {
				onRetry?.(lastError, attempt + 1)
				await sleep(Math.min(delay, maxDelay))
				delay *= 2 // Exponential backoff
			}
		}
	}

	throw lastError ?? new Error('Retry failed after all attempts')
}

/**
 * Options for assert function behavior.
 */
export interface AssertOptions {
	/** Whether to suppress console error output (default: false) */
	silent?: boolean
	/** Custom error type to throw (default: Error) */
	errorType?: new (message: string) => Error
}

/**
 * Assertion utility that throws an error if the condition is falsy.
 * Useful for runtime validation and type narrowing.
 *
 * @param condition - The condition to assert (must be truthy to pass)
 * @param message - Error message to display if assertion fails
 * @param options - Assertion options (silent mode, custom error type)
 * @throws Error (or custom error type) if condition is falsy
 *
 * @example
 * // Basic usage
 * assert(user !== null, 'User must be defined')
 *
 * @example
 * // Silent assertion (no console output)
 * assert(value > 0, 'Value must be positive', { silent: true })
 *
 * @example
 * // Custom error type
 * assert(isValid, 'Invalid state', { errorType: ValidationError })
 */
export function assert(
	condition: unknown,
	message?: string,
	options?: boolean | AssertOptions
): asserts condition {
	// Backward compatibility: accept boolean as third parameter
	const opts = typeof options === 'boolean' ? { silent: options } : (options ?? {})
	const { silent = false, errorType = Error } = opts

	if (!condition) {
		const errorMessage = message ?? 'Assertion failed'

		if (!silent) {
			console.error(chalk.red(`❌ assert: ${errorMessage}`))
		}

		throw new errorType(errorMessage)
	}
}
