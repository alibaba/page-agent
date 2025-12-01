import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import 'dotenv/config'
import process from 'node:process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Website Config (React Documentation Site)
export default defineConfig({
	base: './',
	clearScreen: false,
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			// Self root
			'@': resolve(__dirname, 'src'),

			// Simplified monorepo solution (raw npm workspace with hoisting)
			'page-agent': resolve(__dirname, '../page-agent/src/PageAgent.ts'),
		},
	},
	define: {
		'import.meta.env.LLM_MODEL_NAME': JSON.stringify(process.env.LLM_MODEL_NAME),
		'import.meta.env.LLM_API_KEY': JSON.stringify(process.env.LLM_API_KEY),
		'import.meta.env.LLM_BASE_URL': JSON.stringify(process.env.LLM_BASE_URL),
	},
})
