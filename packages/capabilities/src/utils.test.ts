import { describe, expect, it } from 'vitest'

import { businessActionKey, normalizeName, normalizeResult, sanitizeSchema } from './utils'

describe('normalizeName', () => {
	it('produces a safe tool identifier', () => {
		expect(normalizeName('Search Customers')).toBe('search_customers')
		expect(normalizeName('  add--to//cart  ')).toBe('add_to_cart')
		// A single hyphen survives — WebMCP's own examples use names like `add-todo`.
		expect(normalizeName('add-todo')).toBe('add-todo')
		expect(normalizeName('!!!')).toBe('unnamed_capability')
	})

	it('respects the 30-character name budget', () => {
		expect(normalizeName('a'.repeat(60)).length).toBeLessThanOrEqual(33)
	})
})

describe('businessActionKey', () => {
	it('collapses synonymous verbs and plural objects', () => {
		expect(businessActionKey('add_customer')).toBe(businessActionKey('create_customers'))
		expect(businessActionKey('find_order')).toBe(businessActionKey('search_orders'))
	})

	it('keeps different actions on the same object apart', () => {
		expect(businessActionKey('delete_customer')).not.toBe(businessActionKey('create_customer'))
	})

	it('does not merge unrelated names that lack a known verb', () => {
		expect(businessActionKey('apply_coupon')).not.toBe(businessActionKey('checkout_cart'))
	})
})

describe('normalizeResult', () => {
	it('accepts the spec content-array shape', () => {
		const result = normalizeResult({
			content: [
				{ type: 'text', text: 'first' },
				{ type: 'text', text: 'second' },
			],
		})

		expect(result.content).toBe('first\nsecond')
	})

	it('accepts a bare string, as Chrome documents', () => {
		expect(normalizeResult('done').content).toBe('done')
	})

	it('serializes arbitrary JSON from other adapters', () => {
		expect(normalizeResult({ ok: true }).content).toBe('{"ok":true}')
	})

	it('caps oversized output at the documented budget', () => {
		const result = normalizeResult('x'.repeat(5000))
		expect(result.content.length).toBeLessThanOrEqual(1503)
	})

	it('handles null without throwing', () => {
		expect(normalizeResult(null).content).toBe('')
	})
})

describe('sanitizeSchema', () => {
	it('caps nested parameter descriptions', () => {
		const schema = sanitizeSchema({
			type: 'object',
			properties: {
				query: { type: 'string', description: 'y'.repeat(400) },
			},
		})

		expect((schema.properties?.query.description ?? '').length).toBeLessThanOrEqual(153)
	})

	it('returns a usable object for malformed input', () => {
		expect(sanitizeSchema(undefined)).toEqual({ type: 'object', properties: {} })
	})
})
