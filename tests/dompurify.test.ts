/**
 * Tests for DOMPurify integration with page-agent.
 *
 * Verifies that DOMPurify correctly sanitizes content that flows
 * through the transformPageContent pipeline, and that sanitizePageContent
 * handles page-agent's text-based format correctly.
 */
import DOMPurify from 'dompurify'
import { describe, expect, it } from 'vitest'

import { sanitizePageContent } from '../packages/core/src/sanitize'

describe('DOMPurify Direct', () => {
	it('should strip script tags from HTML', () => {
		const dirty = '<div>Hello</div><script>alert("xss")</script><p>World</p>'
		const clean = DOMPurify.sanitize(dirty)
		expect(clean).not.toContain('<script>')
		expect(clean).toContain('Hello')
		expect(clean).toContain('World')
	})

	it('should strip event handlers from HTML', () => {
		const dirty = '<img src="x" onerror="alert(1)" />'
		const clean = DOMPurify.sanitize(dirty)
		expect(clean).not.toContain('onerror')
	})

	it('should preserve safe HTML content', () => {
		const safe = '<div class="test"><p>Safe content</p><a href="/page">Link</a></div>'
		const clean = DOMPurify.sanitize(safe)
		expect(clean).toContain('Safe content')
		expect(clean).toContain('Link')
	})
})

describe('sanitizePageContent', () => {
	it('should preserve page-agent simplified HTML format', () => {
		const pageAgentContent = `[0]<button >Click me />
[1]<input type=text placeholder=Name />
Some descriptive text
[2]<a href=/about>About />`

		const result = sanitizePageContent(pageAgentContent)
		expect(result).toContain('Click me')
		expect(result).toContain('Name')
		expect(result).toContain('About')
	})

	it('should strip script tags from page content', () => {
		const malicious = `[0]<button >Click<script>alert(1)</script> />`
		const result = sanitizePageContent(malicious)
		expect(result).not.toContain('<script>')
		expect(result).toContain('Click')
	})

	it('should strip event handlers from page content', () => {
		const malicious = `[1]<input value="test" onerror="alert(1)" />`
		const result = sanitizePageContent(malicious)
		expect(result).not.toContain('onerror')
	})

	it('should strip javascript: URIs', () => {
		const malicious = `[2]<a href="javascript:alert(1)">link />`
		const result = sanitizePageContent(malicious)
		expect(result).not.toContain('javascript:')
	})

	it('should strip data:text/html URIs', () => {
		const malicious = `[3]<a href="data:text/html,<script>alert(1)</script>">xss />`
		const result = sanitizePageContent(malicious)
		expect(result).not.toContain('data:text/html')
	})

	it('should handle empty content', () => {
		expect(sanitizePageContent('')).toBe('')
	})

	it('should handle content with no dangerous patterns', () => {
		const safe = `[0]<button >Submit />
[1]<input type=text placeholder=Email />
Welcome to the page`
		const result = sanitizePageContent(safe)
		expect(result).toContain('Submit')
		expect(result).toContain('Email')
		expect(result).toContain('Welcome')
	})
})
