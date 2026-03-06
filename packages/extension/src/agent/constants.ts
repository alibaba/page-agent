import type { LLMConfig } from '@page-agent/llms'

export const DEMO_API_KEY = 'NA'

/** Legacy testing endpoints that are no longer supported */
export const LEGACY_TESTING_ENDPOINTS = [
	'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy',
	'https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run',
]

export function isTestingEndpoint(url: string): boolean {
	const normalized = url.replace(/\/+$/, '')
	return LEGACY_TESTING_ENDPOINTS.some((ep) => normalized === ep)
}

export function migrateLegacyEndpoint(config: LLMConfig): LLMConfig {
	return config
}
