// @ts-check
import chalk from 'chalk'
import { dirname, resolve } from 'path'
import dts from 'unplugin-dts/vite'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

console.log(chalk.cyan(`📦 Building @page-agent/llms`))

export default defineConfig({
	clearScreen: false,
	plugins: [dts({ tsconfigPath: './tsconfig.dts.json', bundleTypes: true })],
	publicDir: false,
	esbuild: {
		keepNames: true,
	},
	build: {
		lib: {
			entry: resolve(__dirname, 'src/index.ts'),
			name: 'PageAgentLLMs',
			fileName: 'page-agent-llms',
			formats: ['es'],
		},
		outDir: resolve(__dirname, 'dist', 'lib'),
		rollupOptions: {
			external: ['chalk', 'zod', 'zod/v4'],
		},
		minify: false,
		sourcemap: true,
	},
	define: {
		'process.env.NODE_ENV': '"production"',
	},
})
