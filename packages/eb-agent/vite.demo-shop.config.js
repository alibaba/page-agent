// @ts-check
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Dev server for the §22 WebMCP capability demo (`demo/index.html`).
 *
 * Serves the demo straight from workspace sources, so there is nothing to build
 * and no API key to configure — the page drives the capability layer directly.
 *
 * Run: npm run dev:shop -w eb-agent
 * Then open the URL with chrome://flags/#enable-webmcp-testing enabled to see
 * native WebMCP discovery alongside the DOM-generated capability.
 */
export default defineConfig({
	root: resolve(__dirname, 'demo'),
	server: { port: 5175, open: true },
	resolve: {
		alias: {
			'@eb-agent/capabilities': resolve(__dirname, '../capabilities/src/index.ts'),
			'@eb-agent/core': resolve(__dirname, '../core/src/EBAgentCore.ts'),
			'@eb-agent/page-controller': resolve(__dirname, '../page-controller/src/PageController.ts'),
			'@eb-agent/llms': resolve(__dirname, '../llms/src/index.ts'),
			'@eb-agent/ui': resolve(__dirname, '../ui/src/index.ts'),
		},
	},
})
