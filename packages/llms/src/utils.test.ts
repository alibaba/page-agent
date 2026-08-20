import { fileURLToPath } from 'node:url'
import { build, minify } from 'vite'
import { describe, expect, it } from 'vitest'

import { modelPatch, normalizeModelName } from './utils'

describe('modelPatch', () => {
	it('remains executable when a consumer bundle drops console calls', async () => {
		const entryId = 'virtual:drop-console-entry'
		const resolvedEntryId = `\0${entryId}`
		const resultKey = '__PAGE_AGENT_DROP_CONSOLE_TEST_RESULT__'
		const utilsPath = fileURLToPath(new URL('./utils.ts', import.meta.url))

		const buildResult = await build({
			configFile: false,
			logLevel: 'silent',
			plugins: [
				{
					name: 'drop-console-test-entry',
					resolveId(id) {
						if (id === entryId) return resolvedEntryId
					},
					load(id) {
						if (id !== resolvedEntryId) return
						return `
							import { modelPatch } from ${JSON.stringify(utilsPath)}
							globalThis[${JSON.stringify(resultKey)}] = modelPatch({ model: 'qwen-plus' })
						`
					},
				},
			],
			build: {
				minify: false,
				rollupOptions: { input: entryId },
				write: false,
			},
		})

		const buildOutputs = Array.isArray(buildResult) ? buildResult : [buildResult]
		const chunk = buildOutputs
			.flatMap((output) => ('output' in output ? output.output : []))
			.find((output) => output.type === 'chunk')
		expect(chunk).toBeDefined()
		if (!chunk || chunk.type !== 'chunk') throw new Error('Vite did not produce an output chunk')

		const optimizedBundle = await minify('drop-console-bundle.js', chunk.code, {
			compress: { dropConsole: true },
			mangle: false,
		})
		expect(optimizedBundle.code).not.toMatch(/\bconsole\b/)

		const moduleUrl = `data:text/javascript;base64,${Buffer.from(optimizedBundle.code).toString('base64')}`
		await import(/* @vite-ignore */ moduleUrl)

		const testGlobals = globalThis as typeof globalThis & Record<string, unknown>
		expect(testGlobals[resultKey]).toEqual({
			model: 'qwen-plus',
			enable_thinking: false,
		})
		delete testGlobals[resultKey]
	})
})

describe('normalizeModelName', () => {
	it.each([
		['gpt-5.2', 'gpt-52'],
		['gpt_5_2', 'gpt52'],
		['GPT-52-2026-01-01', 'gpt-52-2026-01-01'],
		['openai/gpt-5.2-chat', 'gpt-52-chat'],
		['claude_sonnet4_5', 'claudesonnet45'],
	])('%s -> %s', (input, expected) => {
		expect(normalizeModelName(input)).toBe(expected)
	})
})
