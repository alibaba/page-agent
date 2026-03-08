#!/usr/bin/env node
/**
 * Secret Scanner - Pre-commit hook script
 *
 * Scans staged files for accidentally committed secrets:
 * - SSH private keys (RSA, DSA, ECDSA, ED25519, OpenSSH)
 * - Anthropic API keys (sk-ant-...)
 * - OpenAI API keys (sk-..., sk-proj-...)
 * - Google/Gemini API keys (AIza...)
 * - SSL/TLS certificates and private keys
 *
 * Exit code 0: No secrets found (commit allowed)
 * Exit code 1: Secrets found (commit blocked)
 *
 * Usage:
 *   node scripts/scan-secrets.js
 */

import { execSync } from 'child_process'
import { readFileSync } from 'fs'

const SECRET_PATTERNS = [
	{
		name: 'SSH Private Key',
		pattern: /-----BEGIN\s+(RSA|DSA|EC|ECDSA|ED25519|OPENSSH)?\s*PRIVATE KEY-----/,
	},
	{
		name: 'Anthropic API Key',
		pattern: /sk-ant-(?:api\d{2}-)?[A-Za-z0-9_-]{20,}/,
	},
	{
		name: 'OpenAI API Key',
		pattern: /sk-(?!ant-)[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}|sk-proj-[A-Za-z0-9_-]{20,}/,
	},
	{
		name: 'Google/Gemini API Key',
		pattern: /AIza[0-9A-Za-z_-]{35}/,
	},
	{
		name: 'SSL/TLS Certificate',
		pattern: /-----BEGIN\s+CERTIFICATE-----/,
	},
	{
		name: 'PEM Private Key',
		pattern: /-----BEGIN\s+(?:ENCRYPTED\s+)?PRIVATE KEY-----/,
	},
]

const BINARY_EXTENSIONS = new Set([
	'.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2',
	'.ttf', '.eot', '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z',
	'.mp3', '.mp4', '.webm', '.webp', '.avif', '.svg',
])

function getStagedFiles() {
	try {
		const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
			encoding: 'utf-8',
		}).trim()
		return output ? output.split('\n').filter(Boolean) : []
	} catch {
		return []
	}
}

function shouldSkip(filePath) {
	const ext = filePath.substring(filePath.lastIndexOf('.'))
	if (BINARY_EXTENSIONS.has(ext.toLowerCase())) return true
	if (filePath.endsWith('package-lock.json')) return true
	if (filePath.endsWith('yarn.lock')) return true
	if (filePath.endsWith('pnpm-lock.yaml')) return true
	if (filePath.includes('node_modules')) return true
	if (filePath.includes('scan-secrets')) return true
	if (filePath.includes('secrets-scan.test')) return true
	return false
}

const files = getStagedFiles()
if (files.length === 0) {
	process.exit(0)
}

const violations = []

for (const filePath of files) {
	if (shouldSkip(filePath)) continue

	let content
	try {
		content = readFileSync(filePath, 'utf-8')
	} catch {
		continue
	}

	const lines = content.split('\n')
	for (let i = 0; i < lines.length; i++) {
		for (const { name, pattern } of SECRET_PATTERNS) {
			if (pattern.test(lines[i])) {
				const match = pattern.exec(lines[i])
				const snippet = match ? match[0].substring(0, 12) + '...' : '...'
				violations.push({ file: filePath, line: i + 1, type: name, snippet })
			}
		}
	}
}

if (violations.length > 0) {
	console.error('\n\x1b[31m✗ Secret scanning found potential secrets in staged files:\x1b[0m\n')
	for (const v of violations) {
		console.error(`  \x1b[33m${v.file}:${v.line}\x1b[0m - ${v.type}: ${v.snippet}`)
	}
	console.error(
		'\n\x1b[31mCommit blocked.\x1b[0m Remove secrets before committing.\n' +
		'If this is a false positive, unstage the file or update scripts/scan-secrets.js.\n'
	)
	process.exit(1)
}

process.exit(0)
