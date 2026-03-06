import { describe, expect, it } from 'vitest'

import { createCard, createReflectionLines } from '../panel/cards'
import { escapeHtml } from '../utils'

describe('escapeHtml', () => {
	it('escapes < > & " \'', () => {
		expect(escapeHtml('<script>alert("xss")</script>')).toBe(
			'&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
		)
	})

	it('escapes single quotes', () => {
		expect(escapeHtml("it's")).toBe('it&#039;s')
	})

	it('escapes ampersands', () => {
		expect(escapeHtml('a&b')).toBe('a&amp;b')
	})

	it('returns plain text unchanged', () => {
		expect(escapeHtml('hello world')).toBe('hello world')
	})
})

describe('createCard', () => {
	it('renders string content with icon', () => {
		const html = createCard({ icon: '🔍', content: 'Test message' })
		expect(html).toContain('🔍')
		expect(html).toContain('Test message')
	})

	it('escapes HTML in string content', () => {
		const html = createCard({ icon: '⚠️', content: '<b>bold</b>' })
		expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;')
		expect(html).not.toContain('<b>bold</b>')
	})

	it('renders array content as reflection lines', () => {
		const html = createCard({ icon: '💡', content: ['<div>line1</div>', '<div>line2</div>'] })
		expect(html).toContain('line1')
		expect(html).toContain('line2')
	})

	it('renders meta when provided', () => {
		const html = createCard({ icon: '📝', content: 'note', meta: 'Step 3' })
		expect(html).toContain('Step 3')
	})

	it('omits meta div when not provided', () => {
		const html = createCard({ icon: '📝', content: 'note' })
		expect(html).not.toContain('historyMeta')
	})
})

describe('createReflectionLines', () => {
	it('creates lines for all reflection fields', () => {
		const lines = createReflectionLines({
			evaluation_previous_goal: 'Clicked button',
			memory: 'Form is open',
			next_goal: 'Fill in name',
		})
		expect(lines).toHaveLength(3)
		expect(lines[0]).toContain('Clicked button')
		expect(lines[1]).toContain('Form is open')
		expect(lines[2]).toContain('Fill in name')
	})

	it('skips missing fields', () => {
		const lines = createReflectionLines({ next_goal: 'Submit' })
		expect(lines).toHaveLength(1)
		expect(lines[0]).toContain('Submit')
	})

	it('returns empty array for empty object', () => {
		expect(createReflectionLines({})).toEqual([])
	})

	it('escapes HTML in reflection text', () => {
		const lines = createReflectionLines({ memory: '<script>xss</script>' })
		expect(lines[0]).toContain('&lt;script&gt;')
	})
})
