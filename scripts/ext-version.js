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

const newVersion = process.argv[2]
if (!newVersion) {
	console.log(chalk.yellow('⚠️  Usage: npm run ext:version <version>\n'))
	exit(1)
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const oldVersion = pkg.version

pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, '    ') + '\n')

console.log(
	chalk.green.bold('\n✓') +
		` ${chalk.bold('@page-agent/ext')}: ${chalk.dim(oldVersion)} → ${chalk.yellow(newVersion)}\n`
)

const tagName = `EXT_v${newVersion}`
console.log(chalk.cyan.bold('📋 Next steps:\n'))
console.log(chalk.blueBright(`npm i`))
console.log(
	chalk.blueBright(`git add . && git commit -m "chore(ext): bump version to ${newVersion}"`)
)
console.log(chalk.blueBright(`git tag -a ${tagName} -m "${tagName}"`))
console.log(chalk.blueBright(`git push && git push origin ${tagName}\n`))
