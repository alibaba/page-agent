/**
 * Content sanitization utilities using DOMPurify.
 *
 * Used to strip potential XSS payloads from page content before it is
 * processed by the agent or sent to the LLM. This is a defense-in-depth
 * measure since page-agent reads and processes arbitrary DOM content.
 */
import DOMPurify from 'dompurify'

/**
 * Sanitize page content that will be sent to the LLM.
 *
 * Strips dangerous HTML patterns (script tags, event handlers, javascript: URIs)
 * from content while preserving the text. The page-agent uses a text-based
 * simplified HTML format, so we target specific dangerous patterns rather than
 * stripping all tags (which would destroy the format).
 *
 * @param content - Simplified page content from PageController
 * @returns Sanitized content safe for processing
 */
export function sanitizePageContent(content: string): string {
	// Remove script tags and their content
	let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

	// Remove event handler attributes (onerror, onclick, onload, etc.)
	sanitized = sanitized.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')

	// Remove javascript: URLs
	sanitized = sanitized.replace(/javascript\s*:/gi, '')

	// Remove data: URLs that could contain scripts
	sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '')

	return sanitized
}

/**
 * Sanitize HTML content preserving safe structural tags.
 * Used when full HTML needs to be preserved (e.g., for display).
 *
 * @param html - Raw HTML content
 * @returns Sanitized HTML with dangerous elements removed
 */
export function sanitizeHTML(html: string): string {
	return DOMPurify.sanitize(html)
}
