import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'ui',
		include: ['src/**/*.test.ts'],
		silent: 'passed-only',
	},
})
