#!/usr/bin/env node
/**
 * Removes build artifacts across every workspace.
 *
 * Uses Node's filesystem APIs so cleanup works consistently on Windows,
 * macOS, and Linux instead of relying on a Unix-only rm command.
 */
import { readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const artifactDirs = ['dist', '.output']
const rootPkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))

for (const artifactDir of artifactDirs) {
	for (const workspace of rootPkg.workspaces) {
		rmSync(join(rootDir, workspace, artifactDir), { recursive: true, force: true })
	}
}
