import { configDefaults, defineConfig } from 'vitest/config'

// Convention: `*.live.test.ts` hits real provider APIs (slow, costs tokens)
// and only runs via `npm run test:live`. Everything else runs on `npm test`.
export default defineConfig({
	test: {
		// Suppress console output from passing tests; failed tests still get their logs.
		silent: 'passed-only',
		projects: [
			{
				test: {
					name: 'llms',
					include: ['src/**/*.test.ts'],
					exclude: [...configDefaults.exclude, 'src/**/*.live.test.ts'],
				},
			},
			{
				test: {
					name: 'llms:live',
					include: ['src/**/*.live.test.ts'],
					// Keep live provider suites under OpenRouter's ~20 req/min free-route cap.
					maxConcurrency: 2,
				},
			},
		],
	},
})
