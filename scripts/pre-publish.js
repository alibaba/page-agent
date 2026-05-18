#!/usr/bin/env node
/**
 * Backup package.json, then rewrite it for publish:
 *   - Promote `publishConfig` fields to top level
 *   - Remove `publishConfig` (npm doesn't need the wrapper)
 *   - Copy LICENSE (and README.md for the main package)
 *
 * Usage: node ../../scripts/pre-publish.js   (from a package dir)
 */
import { copyFileSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const pkgPath = join(process.cwd(), 'package.json')
const raw = readFileSync(pkgPath, 'utf-8')
const pkg = JSON.parse(raw)

const publishConfig = pkg.publishConfig
if (!publishConfig) {
	console.log('  No publishConfig found, skipping manifest rewrite.')
	process.exit(0)
}

// Backup the original file byte-for-byte
copyFileSync(pkgPath, pkgPath + '.bak')
console.log('  ✓ package.json backed up')

for (const [field, value] of Object.entries(publishConfig)) {
	pkg[field] = value
}
delete pkg.publishConfig

writeFileSync(pkgPath, JSON.stringify(pkg, null, '    ') + '\n')
console.log(`  ✓ Manifest rewritten for publish (${Object.keys(publishConfig).join(', ')})`)

const root = join(process.cwd(), '../..')
copyFileSync(join(root, 'LICENSE'), join(process.cwd(), 'LICENSE'))
console.log('  ✓ LICENSE copied')

if (pkg.name === 'page-agent') {
	copyFileSync(join(root, 'README.md'), join(process.cwd(), 'README.md'))
	console.log('  ✓ README.md copied')
}
