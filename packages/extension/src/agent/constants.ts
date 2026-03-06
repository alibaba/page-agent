import type { LLMConfig } from '@page-agent/llms'

export const DEMO_API_KEY = 'NA'

/**
 * Returns true if the URL points to a removed testing endpoint that should no
 * longer be used. Checks are intentionally done on unique resource identifiers
 * rather than full URLs so the source does not embed defunct server addresses.
 */
export function isLegacyEndpoint(url: string): boolean {
	const normalized = url.replace(/\/+$/, '').toLowerCase()
	// Matches the defunct Alibaba Cloud FC testing proxy and old Supabase proxy
	return (
		normalized.includes('page-ag-testing-ohftxirgbn') ||
		normalized.includes('hwcxiuzfylggtcktqgij.supabase.co')
	)
}

/** Clear a legacy endpoint from stored config so the user is prompted to enter their own */
export function migrateLegacyEndpoint(config: LLMConfig): LLMConfig | null {
	if (isLegacyEndpoint(config.baseURL)) {
		return null
	}
	return config
}
