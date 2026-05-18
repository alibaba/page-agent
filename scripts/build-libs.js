#!/usr/bin/env node
/**
 * Equivalent to: npm run build --workspaces --if-present
 *
 * Reads the workspace list from root package.json, filters to those with a
 * "build" script, and runs them all concurrently via parallelTask.
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { parallelTask } from './parallel-task.js'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const rootPkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))

const tasks = rootPkg.workspaces
	.map((ws) => {
		const dir = join(rootDir, ws)
		const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
		return pkg.scripts?.build ? { label: pkg.name, command: 'npm run build', cwd: dir } : null
	})
	.filter(Boolean)

await parallelTask(tasks, { timeoutMs: 120_000 })
