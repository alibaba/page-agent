// @ts-check
import chalk from 'chalk'
import 'dotenv/config'
import process from 'node:process'
import { dirname, resolve } from 'path'
import dts from 'unplugin-dts/vite'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ============================================================================
// Library Config (ES Module for NPM Package)
// ============================================================================
/** @type {import('vite').UserConfig} */
const libConfig = {
	clearScreen: false,
	plugins: [
		dts({ tsconfigPath: './tsconfig.json', bundleTypes: true }),
		cssInjectedByJsPlugin({ relativeCSSInjection: true }),
	],
	publicDir: false,
	esbuild: {
		keepNames: true,
	},
	build: {
		lib: {
			entry: resolve(__dirname, 'src/PageAgent.ts'),
			name: 'PageAgent',
			fileName: 'page-agent',
			formats: ['es'],
		},
		outDir: resolve(__dirname, 'dist', 'lib'),
		rollupOptions: {
			external: ['ai', 'ai-motion', 'chalk', 'zod'],
		},
		minify: false,
		sourcemap: true,
		cssCodeSplit: true,
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
}

// ============================================================================
// UMD Config (Browser Bundle for CDN)
// ============================================================================
/** @type {import('vite').UserConfig} */
const umdConfig = {
	plugins: [cssInjectedByJsPlugin({ relativeCSSInjection: true })],
	publicDir: false,
	esbuild: {
		keepNames: true,
	},
	build: {
		lib: {
			entry: resolve(__dirname, 'src/entry.ts'),
			name: 'PageAgent',
			fileName: 'page-agent',
			formats: ['umd'],
		},
		outDir: resolve(__dirname, 'dist', 'umd'),
		cssCodeSplit: true,
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
}

// ============================================================================

const MODE = process.env.MODE

console.log(chalk.cyan(`📦 Build mode: ${chalk.bold(MODE || 'lib')}`))

let config
if (MODE === 'umd') {
	config = umdConfig
} else {
	config = libConfig
}

export default defineConfig(config)
