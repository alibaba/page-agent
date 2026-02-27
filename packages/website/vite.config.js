import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { config as dotenvConfig } from 'dotenv'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pageAgentPkg = JSON.parse(
	readFileSync(resolve(__dirname, '../page-agent/package.json'), 'utf-8')
)

// Load .env from repo root
dotenvConfig({ path: resolve(__dirname, '../../.env') })

// All SPA routes that need index.html copies for direct access on static hosts
const SPA_ROUTES = [
	'docs',
	'docs/introduction/overview',
	'docs/introduction/quick-start',
	'docs/introduction/limitations',
	'docs/introduction/troubleshooting',
	'docs/features/custom-tools',
	'docs/features/data-masking',
	'docs/features/custom-instructions',
	'docs/features/models',
	'docs/features/chrome-extension',
	'docs/advanced/page-agent',
	'docs/advanced/page-agent-core',
	'docs/advanced/custom-ui',
	'docs/integration/security-permissions',
	'docs/integration/best-practices',
	'docs/integration/third-party-agent',
]

function spaRoutes() {
	return {
		name: 'spa-routes',
		closeBundle() {
			const dist = resolve(__dirname, 'dist')
			const src = join(dist, 'index.html')
			for (const route of SPA_ROUTES) {
				const dir = join(dist, route)
				mkdirSync(dir, { recursive: true })
				copyFileSync(src, join(dir, 'index.html'))
			}
			console.log(`  ✓ Copied index.html to ${SPA_ROUTES.length} SPA routes`)
		},
	}
}

// Website Config (React Documentation Site)
export default defineConfig(({ mode }) => ({
	base: '/page-agent/',
	clearScreen: false,
	plugins: [react(), tailwindcss(), spaRoutes()],
	build: {
		chunkSizeWarningLimit: 2000,
		cssCodeSplit: true,
		rollupOptions: {
			onwarn: function (message, handler) {
				if (message.code === 'EVAL') return
				handler(message)
			},
		},
	},
	resolve: {
		alias: {
			// Self root
			'@': resolve(__dirname, 'src'),

			// Monorepo packages (always bundle local code instead of npm versions)
			'@page-agent/page-controller': resolve(__dirname, '../page-controller/src/PageController.ts'),
			'@page-agent/llms': resolve(__dirname, '../llms/src/index.ts'),
			'@page-agent/core': resolve(__dirname, '../core/src/PageAgentCore.ts'),
			'@page-agent/ui': resolve(__dirname, '../ui/src/index.ts'),

			'page-agent': resolve(__dirname, '../page-agent/src/PageAgent.ts'),
		},
	},
	define: {
		...(mode === 'development' && {
			'import.meta.env.LLM_MODEL_NAME': JSON.stringify(process.env.LLM_MODEL_NAME),
			'import.meta.env.LLM_API_KEY': JSON.stringify(process.env.LLM_API_KEY),
			'import.meta.env.LLM_BASE_URL': JSON.stringify(process.env.LLM_BASE_URL),
		}),
		'import.meta.env.VERSION': JSON.stringify(pageAgentPkg.version),
	},
}))
