import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['packages/*/src/__tests__/**/*.test.ts'],
	},
	resolve: {
		alias: {
			'@page-agent/llms': '/packages/llms/src',
			'@page-agent/core': '/packages/core/src',
			'@page-agent/ui': '/packages/ui/src',
			'@page-agent/page-controller': '/packages/page-controller/src',
		},
	},
})
