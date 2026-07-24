import type { LLMConfig } from '@page-os/llms'

// Demo LLM for testing.
// TODO: point at the EqualByte LLM gateway (see PRODUCTIZATION-TASKS.md Phase 2/3).
export const DEMO_MODEL = 'deepseek-chat'
export const DEMO_BASE_URL = 'https://api.deepseek.com'
// export const DEMO_API_KEY = ''

export const DEMO_CONFIG: LLMConfig = {
	baseURL: DEMO_BASE_URL,
	model: DEMO_MODEL,
	// apiKey: DEMO_API_KEY,
}

/** Legacy testing endpoints that should be auto-migrated to DEMO_BASE_URL */
export const LEGACY_TESTING_ENDPOINTS: string[] = []

export function isTestingEndpoint(url: string): boolean {
	const normalized = url.replace(/\/+$/, '')
	return normalized === DEMO_BASE_URL || LEGACY_TESTING_ENDPOINTS.some((ep) => normalized === ep)
}

export function migrateLegacyEndpoint(config: LLMConfig): LLMConfig {
	const normalized = config.baseURL.replace(/\/+$/, '')
	if (LEGACY_TESTING_ENDPOINTS.some((ep) => normalized === ep)) {
		return { ...DEMO_CONFIG }
	}
	return config
}
