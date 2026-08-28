// @ts-check
import { config as dotenvConfig } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
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
		// analyzer()
	],
	publicDir: false,
	build: {
		lib: {
			entry: resolve(__dirname, 'src/demo.ts'),
			name: 'EBAgent',
			fileName: () => `eb-agent.demo.js`,
			formats: ['iife'],
		},
		outDir: resolve(__dirname, 'dist', 'iife'),
		cssCodeSplit: true,
		// minify: false,
		rollupOptions: {
			// output: {
			// 	// force use .js as extension
			// 	entryFileNames: 'eb-agent.js',
			// },
			onwarn: function (message, handler) {
				if (message.code === 'EVAL') return
				handler(message)
			},
		},
	},
	define: {
		'import.meta.env.LLM_MODEL_NAME': JSON.stringify(process.env.LLM_MODEL_NAME),
		// SECURITY: never inline the API key — this bundle is distributed publicly
		// (CDN + npm tarball). For a private local test build only, set
		// INLINE_DEMO_API_KEY=true in the environment.
		'import.meta.env.LLM_API_KEY': JSON.stringify(
			process.env.INLINE_DEMO_API_KEY === 'true' ? process.env.LLM_API_KEY : undefined
		),
		'import.meta.env.LLM_BASE_URL': JSON.stringify(process.env.LLM_BASE_URL),
		// Vision-capable model used only by the identify_image tool. Falls back to the
		// main model/baseURL/apiKey above when unset (see demo.ts).
		'import.meta.env.LLM_VISION_MODEL_NAME': JSON.stringify(process.env.LLM_VISION_MODEL_NAME),
	},
}))
