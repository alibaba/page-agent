#!/usr/bin/env node
/**
 * CI check script. Run locally before commit or in GitHub Actions.
 *
 * Usage:
 *   node scripts/ci.js            # run all checks
 *   node scripts/ci.js --no-build # skip build step
 */
import chalk from 'chalk'
import { execSync } from 'child_process'

import { parallelTask } from './parallel-task.js'

const args = new Set(process.argv.slice(2))
const skipBuild = args.has('--no-build')

function run(label, command) {
	console.log(chalk.bgBlue.white.bold(` ▸ ${label} `))
	execSync(command, { stdio: 'inherit' })
}

function isMainBranch() {
	if (process.env.GITHUB_REF) return process.env.GITHUB_REF === 'refs/heads/main'
	try {
		return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim() === 'main'
	} catch {
		return true
	}
}

// 1. Commitlint — skip on main
if (isMainBranch()) {
	console.log(chalk.dim(' ▸ commitlint (skipped on main)'))
} else {
	const from = execSync('git merge-base origin/main HEAD', { encoding: 'utf-8' }).trim()
	run('commitlint', `npx commitlint --from ${from} --to HEAD`)
}

// 2. Lint + Format + Typecheck in parallel
console.log(chalk.bgBlue.white.bold(' ▸ lint + format + typecheck '))
await parallelTask(
	[
		{ label: 'lint', command: 'npm run lint' },
		{ label: 'format', command: 'npx prettier --check .' },
		{ label: 'typecheck', command: 'npm run typecheck' },
	],
	{ timeoutMs: 120_000 }
)

// 3. Build
if (skipBuild) {
	console.log(chalk.dim(' ▸ build (skipped)'))
} else {
	run('build', 'npm run build')
}
