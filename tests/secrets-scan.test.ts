/**
 * Secret scanning test harness.
 *
 * Scans files staged for git commit (respecting .gitignore) for:
 * - SSH private keys
 * - Anthropic API keys
 * - OpenAI API keys
 * - Google/Gemini API keys
 * - SSL/TLS certificates and private keys
 *
 * This test is for CI/pre-commit use ONLY and is NOT part of page-agent itself.
 */
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { describe, expect, it } from 'vitest'

/**
 * Secret patterns with descriptions.
 * Each pattern is designed to match common secret formats with minimal false positives.
 */
const SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
	// SSH private keys (RSA, DSA, ECDSA, ED25519, generic)
	{
		name: 'SSH Private Key',
		pattern: /-----BEGIN\s+(RSA|DSA|EC|ECDSA|ED25519|OPENSSH)?\s*PRIVATE KEY-----/,
	},

	// Anthropic API keys: sk-ant-api03-... or sk-ant-...
	{
		name: 'Anthropic API Key',
		pattern: /sk-ant-(?:api\d{2}-)?[A-Za-z0-9_-]{20,}/,
	},

	// OpenAI API keys: sk-... (but not sk-ant- which is Anthropic)
	{
		name: 'OpenAI API Key',
		pattern: /sk-(?!ant-)[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9_-]{20,}/,
	},

	// Google/Gemini API keys: AIza...
	{
		name: 'Google/Gemini API Key',
		pattern: /AIza[0-9A-Za-z_-]{35}/,
	},

	// SSL/TLS certificates
	{
		name: 'SSL/TLS Certificate',
		pattern: /-----BEGIN\s+CERTIFICATE-----/,
	},

	// SSL/TLS private keys (generic PEM)
	{
		name: 'PEM Private Key',
		pattern: /-----BEGIN\s+(?:ENCRYPTED\s+)?PRIVATE KEY-----/,
	},

	// PKCS8 / PKCS12
	{
		name: 'PKCS Key',
		pattern: /-----BEGIN\s+(?:PKCS[78]|ENCRYPTED)\s+PRIVATE KEY-----/,
	},
]

/**
 * Binary file extensions to skip
 */
const BINARY_EXTENSIONS = new Set([
	'.png',
	'.jpg',
	'.jpeg',
	'.gif',
	'.ico',
	'.woff',
	'.woff2',
	'.ttf',
	'.eot',
	'.pdf',
	'.zip',
	'.tar',
	'.gz',
	'.bz2',
	'.7z',
	'.mp3',
	'.mp4',
	'.webm',
	'.webp',
	'.avif',
	'.svg',
])

/**
 * Get list of files staged for commit, respecting .gitignore.
 * Falls back to tracked files if nothing is staged.
 */
function getStagedFiles(): string[] {
	try {
		const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
			encoding: 'utf-8',
			cwd: process.cwd(),
		}).trim()

		if (output) {
			return output.split('\n').filter(Boolean)
		}

		// If nothing staged, check all tracked files (useful for CI)
		const tracked = execSync('git ls-files', {
			encoding: 'utf-8',
			cwd: process.cwd(),
		}).trim()

		return tracked.split('\n').filter(Boolean)
	} catch {
		return []
	}
}

/**
 * Check if a file path should be scanned
 */
function shouldScanFile(filePath: string): boolean {
	const ext = filePath.substring(filePath.lastIndexOf('.'))
	if (BINARY_EXTENSIONS.has(ext.toLowerCase())) return false

	// Skip test fixtures and this test file itself
	if (filePath.includes('secrets-scan.test')) return false
	if (filePath.includes('test-fixtures')) return false
	if (filePath.includes('node_modules')) return false

	// Skip lock files
	if (filePath.endsWith('package-lock.json')) return false
	if (filePath.endsWith('yarn.lock')) return false
	if (filePath.endsWith('pnpm-lock.yaml')) return false

	return true
}

describe('Secret Scanning (Pre-Commit)', () => {
	const files = getStagedFiles()

	it('should find files to scan', () => {
		// This is informational - we expect files to exist in the repo
		expect(files.length).toBeGreaterThan(0)
	})

	it('should not contain secrets in staged/tracked files', () => {
		const violations: { file: string; line: number; pattern: string; snippet: string }[] = []

		for (const filePath of files) {
			if (!shouldScanFile(filePath)) continue

			const fullPath = `${process.cwd()}/${filePath}`
			if (!existsSync(fullPath)) continue

			let content: string
			try {
				content = readFileSync(fullPath, 'utf-8')
			} catch {
				continue // Skip files that can't be read as text
			}

			const lines = content.split('\n')

			for (let lineNum = 0; lineNum < lines.length; lineNum++) {
				const line = lines[lineNum]

				for (const { name, pattern } of SECRET_PATTERNS) {
					if (pattern.test(line)) {
						// Extract a safe snippet (mask most of the match)
						const match = pattern.exec(line)
						const snippet = match
							? match[0].substring(0, 10) + '...[REDACTED]'
							: '[REDACTED]'

						violations.push({
							file: filePath,
							line: lineNum + 1,
							pattern: name,
							snippet,
						})
					}
				}
			}
		}

		if (violations.length > 0) {
			const report = violations
				.map((v) => `  ${v.file}:${v.line} - ${v.pattern}: ${v.snippet}`)
				.join('\n')
			expect.fail(
				`Found ${violations.length} potential secret(s) in staged files:\n${report}\n\n` +
					'Remove these secrets before committing. ' +
					'If these are false positives, add the file to the exclusion list in secrets-scan.test.ts.'
			)
		}
	})
})
