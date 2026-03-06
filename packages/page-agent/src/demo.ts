/**
 * IIFE demo entry - auto-initializes with built-in demo API for testing
 */
import { PageAgent, type PageAgentConfig } from './PageAgent'

// Clean up existing instances to prevent multiple injections from bookmarklet
if (window.pageAgent) {
	window.pageAgent.dispose()
}

// Mount to global window object
window.PageAgent = PageAgent

console.log('🚀 page-agent.js loaded!')

// in case document.x is not ready yet
setTimeout(() => {
	const currentScript = document.currentScript as HTMLScriptElement | null
	let config: PageAgentConfig

	if (currentScript) {
		console.log('🚀 page-agent.js detected current script:', currentScript.src)
		const url = new URL(currentScript.src)
		const model = url.searchParams.get('model') || import.meta.env.LLM_MODEL_NAME
		const baseURL = url.searchParams.get('baseURL') || import.meta.env.LLM_BASE_URL
		const apiKey = url.searchParams.get('apiKey') || import.meta.env.LLM_API_KEY || 'NA'
		const language = (url.searchParams.get('lang') as 'zh-CN' | 'en-US') || 'en-US'
		config = { model, baseURL, apiKey, language }
	} else {
		console.log('🚀 page-agent.js no current script detected, using env config')
		config = {
			model: import.meta.env.LLM_MODEL_NAME,
			baseURL: import.meta.env.LLM_BASE_URL,
			apiKey: import.meta.env.LLM_API_KEY || 'NA',
		}
	}

	// Create agent
	if (!config.model || !config.baseURL) {
		console.error(
			'🚀 page-agent.js: LLM not configured. Provide model and baseURL via URL params (?model=...&baseURL=...) or LLM_MODEL_NAME/LLM_BASE_URL env vars.'
		)
		return
	}
	window.pageAgent = new PageAgent(config)
	window.pageAgent.panel.show()

	console.log('🚀 page-agent.js initialized with config:', window.pageAgent.config)
})
