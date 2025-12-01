import chalk from 'chalk'

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
