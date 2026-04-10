// @ts-check
import { config as dotenvConfig } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
// import { analyzer } from 'vite-bundle-analyzer'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from repo root
dotenvConfig({ path: resolve(__dirname, '../../.env'), quiet: true })

// UMD Bundle for CDN
// - alias all local packages so that they can be build in
// - no external
// - no d.ts. dts does not work with monorepo aliasing
export default defineConfig(() => ({
	plugins: [
		cssInjectedByJsPlugin({ relativeCSSInjection: true }),
		{
			name: 'wrap-demo-bundle-scope',
			generateBundle(_options, bundle) {
				for (const chunk of Object.values(bundle)) {
					if (chunk.type === 'chunk' && chunk.fileName.endsWith('.js')) {
						chunk.code = `(() => {\n${chunk.code}\n})()\n`
					}
				}
			},
		},
		// analyzer()
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
			entry: resolve(__dirname, 'src/demo.ts'),
			name: 'PageAgent',
			fileName: () => `page-agent.demo.js`,
			formats: ['iife'],
		},
		outDir: resolve(__dirname, 'dist', 'iife'),
		cssCodeSplit: true,
		// minify: false,
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
}))
