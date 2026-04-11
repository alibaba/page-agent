#!/usr/bin/env node
/**
 * Swap source-first dev entrypoints for dist-first publish entrypoints.
 *
 * This script is called by `prepublishOnly` in each publishable package.
 * It reads the `publishConfig` object and promotes its fields to top level,
 * storing the original dev fields in `_devConfig` so `restore-dev.js` can undo it.
 *
 * Usage: node ../../scripts/prepare-publish.js
 */
import { copyFileSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const pkgPath = join(process.cwd(), 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

const publishConfig = pkg.publishConfig
if (!publishConfig) {
	console.log('  No publishConfig found, skipping manifest rewrite.')
	process.exit(0)
}

const PUBLISH_FIELDS = ['main', 'module', 'types', 'exports']

const devConfig = {}
for (const field of PUBLISH_FIELDS) {
	if (field in publishConfig) {
		devConfig[field] = pkg[field]
		pkg[field] = publishConfig[field]
	}
}

pkg._devConfig = devConfig
delete pkg.publishConfig

writeFileSync(pkgPath, JSON.stringify(pkg, null, '    ') + '\n')
console.log(`  ✓ Manifest rewritten for publish (${Object.keys(devConfig).join(', ')})`)

const root = join(process.cwd(), '../..')
copyFileSync(join(root, 'LICENSE'), join(process.cwd(), 'LICENSE'))
console.log('  ✓ LICENSE copied')

const readmeSrc = join(root, 'README.md')
const readmeDest = join(process.cwd(), 'README.md')
if (pkg.name === 'page-agent') {
	copyFileSync(readmeSrc, readmeDest)
	console.log('  ✓ README.md copied')
}
