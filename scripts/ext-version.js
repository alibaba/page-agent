#!/usr/bin/env node
/**
 * Bump extension version and show git tag commands
 *
 * Usage:
 *   node scripts/ext-version.js 0.1.16
 */
import chalk from 'chalk'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { exit } from 'process'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = join(__dirname, '..', 'packages', 'extension', 'package.json')

/**
 * Validates and sanitizes version input to prevent command injection
 * @param {string} input - Raw input from command line
 * @returns {string} Validated and sanitized version string
 */
function validateAndSanitizeVersion(input) {
	// Type check and existence check
	if (!input || typeof input !== 'string') {
		console.log(chalk.yellow('⚠️  Usage: npm run ext:version <version>\n'))
		exit(1)
	}

	// Remove any leading/trailing whitespace
	const trimmed = input.trim()
	
	// Length validation (semantic versions shouldn't be too long)
	if (trimmed.length === 0 || trimmed.length > 50) {
		console.log(chalk.red('❌ Invalid version: must be between 1-50 characters\n'))
		exit(1)
	}
	
	// Strict validation: only allow semantic versioning format
	// This regex ensures ONLY digits, dots, hyphens, and alphanumeric characters
	// Prevents command injection by rejecting shell metacharacters
	const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
	
	if (!versionRegex.test(trimmed)) {
		console.log(chalk.red('❌ Invalid version format. Must follow semantic versioning (e.g., 1.0.0, 1.2.3-beta.1)\n'))
		exit(1)
	}
	
	// Return validated and sanitized version
	return trimmed
}

// Sanitize and validate command-line input to prevent command injection
const newVersion = validateAndSanitizeVersion(process.argv[2])

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const oldVersion = pkg.version

pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, '    ') + '\n')

console.log(
	chalk.green.bold('\n✓') +
		` ${chalk.bold('@page-agent/ext')}: ${chalk.dim(oldVersion)} → ${chalk.yellow(newVersion)}\n`
)

// Additional safety: escape for shell commands (defense in depth)
// Although validated, ensure no shell metacharacters can cause issues
const escapeShellArg = (arg) => {
	// Replace single quotes with '\'' (end quote, literal quote, start quote)
	return `'${arg.replace(/'/g, "'\\''")}'`
}

const safeVersion = escapeShellArg(newVersion)
const tagName = `EXT_v${newVersion}`
const safeTagName = escapeShellArg(tagName)

console.log(chalk.cyan.bold('📋 Next steps:\n'))
console.log(chalk.blueBright(`npm i`))
console.log(
	chalk.blueBright(`git add . && git commit -m "chore(ext): bump version to ${safeVersion}"`)
)
console.log(chalk.blueBright(`git tag -a ${safeTagName} -m ${safeTagName}`))
console.log(chalk.blueBright(`git push && git push origin ${safeTagName}\n`))
