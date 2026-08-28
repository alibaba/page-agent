import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'capabilities',
		include: ['src/**/*.test.ts'],
		silent: 'passed-only',
	},
})
