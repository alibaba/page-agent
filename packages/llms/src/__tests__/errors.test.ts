import { describe, expect, it } from 'vitest'

import { InvokeError, InvokeErrorType } from '../errors'

describe('InvokeError', () => {
	it('marks network_error as retryable', () => {
		const err = new InvokeError(InvokeErrorType.NETWORK_ERROR, 'timeout')
		expect(err.retryable).toBe(true)
		expect(err.type).toBe('network_error')
		expect(err.name).toBe('InvokeError')
	})

	it('marks rate_limit as retryable', () => {
		const err = new InvokeError(InvokeErrorType.RATE_LIMIT, '429')
		expect(err.retryable).toBe(true)
	})

	it('marks server_error as retryable', () => {
		const err = new InvokeError(InvokeErrorType.SERVER_ERROR, '500')
		expect(err.retryable).toBe(true)
	})

	it('marks auth_error as NOT retryable', () => {
		const err = new InvokeError(InvokeErrorType.AUTH_ERROR, 'invalid key')
		expect(err.retryable).toBe(false)
	})

	it('marks context_length as NOT retryable', () => {
		const err = new InvokeError(InvokeErrorType.CONTEXT_LENGTH, 'too long')
		expect(err.retryable).toBe(false)
	})

	it('marks content_filter as NOT retryable', () => {
		const err = new InvokeError(InvokeErrorType.CONTENT_FILTER, 'filtered')
		expect(err.retryable).toBe(false)
	})

	it('treats AbortError as NOT retryable even for retryable types', () => {
		const abortErr = { name: 'AbortError' }
		const err = new InvokeError(InvokeErrorType.NETWORK_ERROR, 'aborted', abortErr)
		expect(err.retryable).toBe(false)
	})

	it('stores rawError and rawResponse', () => {
		const raw = new Error('original')
		const resp = { status: 500 }
		const err = new InvokeError(InvokeErrorType.SERVER_ERROR, 'fail', raw, resp)
		expect(err.rawError).toBe(raw)
		expect(err.rawResponse).toBe(resp)
	})
})
