import type { LLMConfig } from '@page-agent/llms'

// Demo LLM for testing
export const DEMO_MODEL = 'qwen3.8-flash'
export const DEMO_BASE_URL = 'https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run'
// export const DEMO_API_KEY = 'NA'

export const DEMO_CONFIG: LLMConfig = {
	baseURL: DEMO_BASE_URL,
	model: DEMO_MODEL,
	// apiKey: DEMO_API_KEY,
}

/** Testing endpoints that are no longer served */
const RETIRED_ENDPOINTS = [
	'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy',
]

/** Models that DEMO_BASE_URL no longer serves */
const RETIRED_DEMO_MODELS = ['qwen3.5-plus']

const trimTrailingSlashes = (url: string) => url.replace(/\/+$/, '')

export function isTestingEndpoint(url: string): boolean {
	const normalized = trimTrailingSlashes(url)
	return normalized === DEMO_BASE_URL || RETIRED_ENDPOINTS.includes(normalized)
}

function isRetired({ baseURL, model }: LLMConfig): boolean {
	const url = trimTrailingSlashes(baseURL)
	return (
		RETIRED_ENDPOINTS.includes(url) ||
		(url === DEMO_BASE_URL && RETIRED_DEMO_MODELS.includes(model))
	)
}

/**
 * The config to run with: the stored one, or DEMO_CONFIG when nothing is stored
 * or the stored one targets a retired testing config.
 */
export function resolveLLMConfig(stored?: LLMConfig): LLMConfig {
	return stored && !isRetired(stored) ? stored : DEMO_CONFIG
}
