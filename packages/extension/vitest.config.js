import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'ext',
		include: ['src/**/*.test.ts'],
		silent: 'passed-only',
	},
})
