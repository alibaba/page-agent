#!/usr/bin/env node
/**
 * Restore package.json from the backup created by pre-publish.js,
 * then clean up temporary files (backup, LICENSE, README.md).
 *
 * Usage: node ../../scripts/post-publish.js   (from a package dir)
 */
import { existsSync, readFileSync, renameSync, rmSync } from 'fs'
import { join } from 'path'

const pkgPath = join(process.cwd(), 'package.json')
const bakPath = pkgPath + '.bak'

if (!existsSync(bakPath)) {
	console.log('  No backup found, nothing to restore.')
	process.exit(0)
}

const name = JSON.parse(readFileSync(pkgPath, 'utf-8')).name

renameSync(bakPath, pkgPath)
console.log('  ✓ package.json restored from backup')

rmSync(join(process.cwd(), 'LICENSE'), { force: true })
console.log('  ✓ LICENSE removed')

if (name === 'page-agent') {
	rmSync(join(process.cwd(), 'README.md'), { force: true })
	console.log('  ✓ README.md removed')
}
