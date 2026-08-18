import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'ui',
		environment: 'happy-dom',
		include: ['src/**/*.test.ts'],
		silent: 'passed-only',
	},
})
