#!/usr/bin/env node
/**
 * Full build pipeline. Equivalent to:
 *   npm run cleanup && npm run build --workspaces --if-present
 *                    && npm run build:website -w @page-agent/website
 *                    && npm run zip -w @page-agent/ext
 *
 * 1. cleanup
 * 2. build everything in parallel (libs + website + extension)
 */
import chalk from 'chalk'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { parallelTask } from './parallel-task.js'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const rootPkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))

// Step 1: cleanup
console.log(chalk.bgBlue.white.bold(' ▸ cleanup '))
execSync('npm run cleanup', { cwd: rootDir, stdio: 'inherit' })

// Step 2: build all in parallel
console.log(chalk.bgBlue.white.bold(' ▸ build '))
const tasks = rootPkg.workspaces
	.map((ws) => {
		const dir = join(rootDir, ws)
		const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
		return pkg.scripts?.build ? { label: pkg.name, command: 'npm run build', cwd: dir } : null
	})
	.filter(Boolean)

tasks.push(
	{
		label: '@page-agent/website',
		command: 'npm run build:website',
		cwd: join(rootDir, 'packages/website'),
	},
	{ label: '@page-agent/ext', command: 'npm run zip', cwd: join(rootDir, 'packages/extension') }
)

await parallelTask(tasks, { timeoutMs: 120_000 })
