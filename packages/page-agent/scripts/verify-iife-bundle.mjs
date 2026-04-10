import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const bundlePath = resolve(__dirname, '../dist/iife/page-agent.demo.js')
const code = readFileSync(bundlePath, 'utf8').trimStart()

if (!code.startsWith('(function(){')) {
	console.error(
		'Expected IIFE demo bundle to be wrapped in an isolated closure for bookmarklet injection safety.'
	)
	process.exit(1)
}

console.log('IIFE demo bundle is isolated.')
