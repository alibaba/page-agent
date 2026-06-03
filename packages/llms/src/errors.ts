/**
 * Error types and error handling for LLM invocations.
 */

export const InvokeErrorTypes = {
	// Retryable
	NETWORK_ERROR: 'network_error', // Network error, retry
	RATE_LIMIT: 'rate_limit', // Rate limit, retry
	SERVER_ERROR: 'server_error', // 5xx, retry
	NO_TOOL_CALL: 'no_tool_call', // Model did not call tool
	INVALID_TOOL_ARGS: 'invalid_tool_args', // Tool args don't match schema
	TOOL_EXECUTION_ERROR: 'tool_execution_error', // Tool execution error
	INVALID_RESPONSE: 'invalid_response', // Response body is not valid JSON
	INVALID_SCHEMA: 'invalid_schema', // Response is valid JSON but doesn't match expected shape

	UNKNOWN: 'unknown',

	// Non-retryable
	CONFIG_ERROR: 'config_error', // Invalid local configuration or hook
	AUTH_ERROR: 'auth_error', // Authentication failed
	CONTEXT_LENGTH: 'context_length', // Prompt too long
	CONTENT_FILTER: 'content_filter', // Content filtered
} as const

type InvokeErrorType = (typeof InvokeErrorTypes)[keyof typeof InvokeErrorTypes]

const RETRYABLE_TYPES: readonly InvokeErrorType[] = [
	InvokeErrorTypes.NETWORK_ERROR,
	InvokeErrorTypes.RATE_LIMIT,
	InvokeErrorTypes.SERVER_ERROR,
	InvokeErrorTypes.NO_TOOL_CALL,
	InvokeErrorTypes.INVALID_TOOL_ARGS,
	InvokeErrorTypes.TOOL_EXECUTION_ERROR,
	InvokeErrorTypes.INVALID_RESPONSE,
	InvokeErrorTypes.INVALID_SCHEMA,
	InvokeErrorTypes.UNKNOWN,
]

export class InvokeError extends Error {
	type: InvokeErrorType
	retryable: boolean
	statusCode?: number
	/* raw error (provided if this error is caused by another error) */
	rawError?: unknown
	/* raw response from the API (provided if this error is caused by an API calling) */
	rawResponse?: unknown

	constructor(type: InvokeErrorType, message: string, rawError?: unknown, rawResponse?: unknown) {
		super(message)
		this.name = 'InvokeError'
		this.type = type
		this.retryable = RETRYABLE_TYPES.includes(type)
		this.rawError = rawError
		this.rawResponse = rawResponse
	}
}
