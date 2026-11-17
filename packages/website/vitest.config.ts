import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [react()],
	test: {
		name: 'website',
		environment: 'happy-dom',
		include: ['src/**/*.test.tsx'],
		silent: 'passed-only',
	},
})
