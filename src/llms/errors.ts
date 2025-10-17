/**
 * Error types and error handling for LLM invocations
 */

export const InvokeErrorType = {
	// Retryable
	NETWORK_ERROR: 'network_error', // Network error, retry
	RATE_LIMIT: 'rate_limit', // Rate limit, retry
	SERVER_ERROR: 'server_error', // 5xx, retry
	NO_TOOL_CALL: 'no_tool_call', // Model did not call tool
	INVALID_TOOL_ARGS: 'invalid_tool_args', // Tool args don't match schema
	TOOL_EXECUTION_ERROR: 'tool_execution_error', // Tool execution error

	UNKNOWN: 'unknown',

	// Non-retryable
	AUTH_ERROR: 'auth_error', // Authentication failed
	CONTEXT_LENGTH: 'context_length', // Prompt too long
	CONTENT_FILTER: 'content_filter', // Content filtered
} as const

export type InvokeErrorType = (typeof InvokeErrorType)[keyof typeof InvokeErrorType]

export class InvokeError extends Error {
	type: InvokeErrorType
	retryable: boolean
	statusCode?: number
	rawError?: unknown

	constructor(type: InvokeErrorType, message: string, rawError?: unknown) {
		super(message)
		this.name = 'InvokeError'
		this.type = type
		this.retryable = this.isRetryable(type)
		this.rawError = rawError
	}

	private isRetryable(type: InvokeErrorType): boolean {
		const retryableTypes: InvokeErrorType[] = [
			InvokeErrorType.NETWORK_ERROR,
			InvokeErrorType.RATE_LIMIT,
			InvokeErrorType.SERVER_ERROR,
			InvokeErrorType.NO_TOOL_CALL,
			InvokeErrorType.INVALID_TOOL_ARGS,
			InvokeErrorType.TOOL_EXECUTION_ERROR,
			InvokeErrorType.UNKNOWN,
		]
		return retryableTypes.includes(type)
	}
}
