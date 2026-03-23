// @ts-check
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(() => ({
	plugins: [
		cssInjectedByJsPlugin({ relativeCSSInjection: true }),
	],
	publicDir: false,
	esbuild: {
		keepNames: true,
	},
	resolve: {
		alias: {
			'@page-agent/page-controller': resolve(__dirname, '../page-controller/src/PageController.ts'),
			'@page-agent/llms': resolve(__dirname, '../llms/src/index.ts'),
			'@page-agent/core': resolve(__dirname, '../core/src/PageAgentCore.ts'),
			'@page-agent/ui': resolve(__dirname, '../ui/src/index.ts'),
		},
	},
	build: {
		lib: {
			entry: resolve(__dirname, 'src/page-agent.ts'),
			name: 'PageAgent',
			fileName: () => `page-agent.js`,
			formats: ['iife'],
		},
		outDir: resolve(__dirname, 'dist', 'umd'),
		cssCodeSplit: true,
		rollupOptions: {
			onwarn: function (message, handler) {
				if (message.code === 'EVAL') return
				handler(message)
			},
		},
	},
}))
