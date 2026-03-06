import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchLlmsTxt, randomID, truncate, uid } from '../utils'

describe('uid', () => {
	it('returns unique IDs', () => {
		const ids = new Set(Array.from({ length: 100 }, () => uid()))
		expect(ids.size).toBe(100)
	})

	it('returns string of expected length', () => {
		const id = uid()
		expect(typeof id).toBe('string')
		expect(id.length).toBeGreaterThan(0)
	})
})

describe('randomID', () => {
	it('returns a string without args', () => {
		expect(typeof randomID()).toBe('string')
	})

	it('avoids collisions with existing IDs', () => {
		const existing = ['abc123456']
		const id = randomID(existing)
		expect(id).not.toBe('abc123456')
	})
})

describe('truncate', () => {
	it('truncates long text', () => {
		expect(truncate('hello world', 5)).toBe('hello...')
	})

	it('returns short text unchanged', () => {
		expect(truncate('hi', 10)).toBe('hi')
	})

	it('handles exact length', () => {
		expect(truncate('abc', 3)).toBe('abc')
	})
})

describe('fetchLlmsTxt', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('fetches /llms.txt from origin', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: () => Promise.resolve('# LLMs info'),
			})
		)

		const result = await fetchLlmsTxt('https://example.com/some/page')
		expect(result).toBe('# LLMs info')
	})

	it('returns null when fetch fails', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

		// Need a different origin to avoid cache hit
		const result = await fetchLlmsTxt('https://notfound.test/page')
		expect(result).toBeNull()
	})
})
