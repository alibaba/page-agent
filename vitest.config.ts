import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	resolve: {
		alias: {
			'@page-agent/page-controller': resolve(
				__dirname,
				'packages/page-controller/src/PageController.ts'
			),
			'@page-agent/llms': resolve(__dirname, 'packages/llms/src/index.ts'),
			'@page-agent/core': resolve(__dirname, 'packages/core/src/PageAgentCore.ts'),
			'@page-agent/ui': resolve(__dirname, 'packages/ui/src/index.ts'),
		},
	},
	test: {
		globals: true,
		environment: 'happy-dom',
		include: ['tests/**/*.test.ts'],
		testTimeout: 30000,
		setupFiles: ['tests/setup.ts'],
	},
})
