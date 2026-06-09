import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'llms',
		include: ['src/**/*.test.ts'],
		// Suppress console output from passing tests; failed tests still get their logs.
		silent: 'passed-only',
	},
})
