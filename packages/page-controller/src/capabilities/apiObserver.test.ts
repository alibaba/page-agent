import { beforeEach, describe, expect, it } from 'vitest'

import { type ApiCallRecord, inferApiCapabilities } from './apiObserver'

function call(overrides: Partial<ApiCallRecord> = {}): ApiCallRecord {
	return {
		method: 'GET',
		url: 'https://app.example/api/customers',
		path: '/api/customers',
		query: {},
		headers: {},
		status: 200,
		jsonResponse: true,
		observedAt: Date.now(),
		...overrides,
	}
}

describe('inferApiCapabilities', () => {
	beforeEach(() => {
		// happy-dom serves pages from localhost; the descriptors only carry the URL.
	})

	it('names a capability after the resource and HTTP verb', () => {
		const [capability] = inferApiCapabilities([
			call({ method: 'POST', path: '/api/customers', body: { name: 'A', email: 'a@b.c' } }),
		])

		expect(capability.name).toBe('create_customer')
		expect(capability.risk).toBe('reversible')
		expect(capability.bodyFields).toEqual(['name', 'email'])
	})

	it('classifies DELETE as consequential and GET as read', () => {
		const capabilities = inferApiCapabilities([
			call({ method: 'DELETE', path: '/api/customers/42' }),
			call({ method: 'GET', path: '/api/orders' }),
		])

		const remove = capabilities.find((capability) => capability.name.startsWith('delete'))!
		const read = capabilities.find((capability) => capability.name.startsWith('get'))!

		expect(remove.risk).toBe('consequential')
		expect(read.risk).toBe('read')
	})

	it('collapses identifier path segments into one templated capability', () => {
		const capabilities = inferApiCapabilities([
			call({ path: '/api/orders/1' }),
			call({ path: '/api/orders/2' }),
			call({ path: '/api/orders/3' }),
		])

		expect(capabilities).toHaveLength(1)
		expect(capabilities[0].urlTemplate).toBe('/api/orders/{order_id}')
		expect(capabilities[0].pathParams).toEqual(['order_id'])
	})

	it('strips routing noise from the resource name', () => {
		const [capability] = inferApiCapabilities([call({ path: '/api/v2/invoices' })])

		expect(capability.name).toBe('get_invoice')
	})

	it('ignores failed responses and non-JSON responses', () => {
		const capabilities = inferApiCapabilities([
			call({ status: 500 }),
			call({ path: '/page', jsonResponse: false }),
		])

		expect(capabilities).toHaveLength(0)
	})

	it('grows confidence with repeated observations, but never to certainty', () => {
		const once = inferApiCapabilities([call({ path: '/api/customers' })])[0]
		const often = inferApiCapabilities([
			call({ path: '/api/tickets' }),
			call({ path: '/api/tickets' }),
			call({ path: '/api/tickets' }),
			call({ path: '/api/tickets' }),
		])[0]

		expect(often.confidence).toBeGreaterThan(once.confidence)
		expect(often.confidence).toBeLessThan(1)
	})

	it('merges body and query fields seen across calls to the same endpoint', () => {
		const [capability] = inferApiCapabilities([
			call({ method: 'POST', path: '/api/customers', body: { name: 'A' } }),
			call({ method: 'POST', path: '/api/customers', body: { name: 'B', phone: '1' } }),
		])

		expect(capability.bodyFields).toEqual(['name', 'phone'])
	})

	it('keeps only replayable headers, never cookies', () => {
		const [capability] = inferApiCapabilities([
			call({
				method: 'POST',
				path: '/api/customers',
				headers: { 'x-csrf-token': 'abc', 'content-type': 'application/json' },
			}),
		])

		expect(capability.headers['x-csrf-token']).toBe('abc')
		expect(capability.headers.cookie).toBeUndefined()
	})
})
