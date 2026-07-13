import { describe, expect, it } from 'vitest'

import { escapeHtml, truncate } from './utils'

describe('truncate', () => {
	it('returns short text unchanged', () => {
		expect(truncate('hello', 10)).toBe('hello')
	})

	it('returns text at exactly maxLength unchanged', () => {
		expect(truncate('hello', 5)).toBe('hello')
	})

	it('truncates long text and appends ellipsis', () => {
		expect(truncate('hello world', 5)).toBe('hello...')
	})

	it('handles empty string', () => {
		expect(truncate('', 5)).toBe('')
	})
})

describe('escapeHtml', () => {
	it.each([
		['&', '&amp;'],
		['<', '&lt;'],
		['>', '&gt;'],
		['"', '&quot;'],
		["'", '&#039;'],
	])('escapes %s -> %s', (input, expected) => {
		expect(escapeHtml(input)).toBe(expected)
	})

	it('escapes all special characters in mixed content', () => {
		expect(escapeHtml('<a href="x">Tom & Jerry\'s</a>')).toBe(
			'&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#039;s&lt;/a&gt;'
		)
	})

	it('leaves plain text unchanged', () => {
		expect(escapeHtml('plain text 123')).toBe('plain text 123')
	})
})
