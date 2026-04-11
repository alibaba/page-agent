import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const bundlePath = resolve(process.cwd(), 'dist/iife/page-agent.demo.js')
const bundle = readFileSync(bundlePath, 'utf8')
const trimmed = bundle.trimStart()

if (trimmed.startsWith('(function(){') || trimmed.startsWith('(function() {')) {
	console.log('Demo bundle is already wrapped.')
	process.exit(0)
}

writeFileSync(bundlePath, `(function() {\n${bundle}\n})();\n`)
console.log('Wrapped demo bundle in an outer IIFE.')
