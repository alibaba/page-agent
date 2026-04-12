// @ts-check
import { config as dotenvConfig } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenvConfig({ path: resolve(__dirname, '../../.env'), quiet: true })

export default defineConfig({
	plugins: [cssInjectedByJsPlugin({ relativeCSSInjection: true })],
	publicDir: false,
	esbuild: {
		keepNames: true,
	},
	resolve: {},
	build: {
		emptyOutDir: false,
		lib: {
			entry: resolve(__dirname, 'src/demo.ts'),
			name: 'PageAgent',
			fileName: () => 'page-agent.demo.js',
			formats: ['iife'],
		},
		outDir: resolve(__dirname, 'dist', 'iife'),
		cssCodeSplit: true,
		rollupOptions: {
			onwarn: function (message, handler) {
				if (message.code === 'EVAL') return
				handler(message)
			},
		},
	},
	define: {
		'import.meta.env.LLM_MODEL_NAME': JSON.stringify(process.env.LLM_MODEL_NAME),
		'import.meta.env.LLM_API_KEY': JSON.stringify(process.env.LLM_API_KEY),
		'import.meta.env.LLM_BASE_URL': JSON.stringify(process.env.LLM_BASE_URL),
	},
})
