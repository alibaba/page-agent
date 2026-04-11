import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const bundlePath = resolve(process.cwd(), 'dist/iife/page-agent.demo.js')
const bundle = readFileSync(bundlePath, 'utf8').trimStart()

const wrapperPrefix = bundle.startsWith('(function() {')
	? '(function() {'
	: bundle.startsWith('(function(){')
		? '(function(){'
		: null

if (!wrapperPrefix) {
	console.error('Expected demo bundle to be wrapped in an outer IIFE.')
	process.exit(1)
}

const firstInnerLine = bundle.slice(wrapperPrefix.length).trimStart().split('\n', 1)[0]?.trim()
if (!firstInnerLine?.startsWith('var St=') && !firstInnerLine?.startsWith('(function()')) {
	console.error('Expected bundle helpers to stay inside the outer IIFE wrapper.')
	process.exit(1)
}

console.log('Demo bundle wrapper looks correct.')
