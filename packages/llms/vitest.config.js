import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'llms',
		include: ['src/**/*.test.ts'],
		// Keep live provider suites under OpenRouter's ~20 req/min free-route cap.
		maxConcurrency: 2,
		// Suppress console output from passing tests; failed tests still get their logs.
		silent: 'passed-only',
	},
})
