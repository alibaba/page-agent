#!/usr/bin/env node
/**
 * Restore source-first dev entrypoints after publish.
 *
 * Undoes what `prepare-publish.js` did by reading `_devConfig`
 * and reinstating the original dev fields + `publishConfig`.
 *
 * Usage: node ../../scripts/restore-dev.js
 */
import { readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'

const pkgPath = join(process.cwd(), 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

const devConfig = pkg._devConfig
if (!devConfig) {
	console.log('  No _devConfig found, skipping manifest restore.')
	process.exit(0)
}

const PUBLISH_FIELDS = ['main', 'module', 'types', 'exports']

const publishConfig = {}
for (const field of PUBLISH_FIELDS) {
	if (field in devConfig) {
		publishConfig[field] = pkg[field]
		pkg[field] = devConfig[field]
	}
}

pkg.publishConfig = publishConfig
delete pkg._devConfig

writeFileSync(pkgPath, JSON.stringify(pkg, null, '    ') + '\n')
console.log(`  ✓ Manifest restored for dev (${Object.keys(publishConfig).join(', ')})`)

const licensePath = join(process.cwd(), 'LICENSE')
rmSync(licensePath, { force: true })
console.log('  ✓ LICENSE removed')

if (pkg.name === 'page-agent') {
	rmSync(join(process.cwd(), 'README.md'), { force: true })
	console.log('  ✓ README.md removed')
}
