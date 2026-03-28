// @ts-check
/**
 * Vite config for building UMD/IIFE library bundle.
 *
 * This produces dist/umd/page-agent.js which exports PageAgent class
 * WITHOUT auto-initialization. Users can load this from CDN and use
 * it programmatically:
 *
 *   <script src="page-agent.js"></script>
 *   <script>
 *     const agent = new window.PageAgent({ model: '...', apiKey: '...' });
 *   </script>
 *
 * NOTE: Despite the "umd" directory name, this builds IIFE format which is
 * the standard for browser-only bundles. True UMD (Universal Module Definition)
 * supports CommonJS/AMD, but IIFE is sufficient for <script> tag usage.
 */
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
			/**
			 * Suppress EVAL warning from vite.
			 * Vite may emit dynamic import() calls that get flagged as eval.
			 * This is expected behavior for CSS injection plugins and is safe
			 * to suppress since we're building a browser-only IIFE bundle.
			 */
			onwarn: function (message, handler) {
				if (message.code === 'EVAL') return
				handler(message)
			},
		},
	},
}))
