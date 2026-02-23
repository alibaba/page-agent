import type { LLMConfig } from '@page-agent/llms'

// Demo LLM for testing
export const DEMO_MODEL = 'qwen3.5-plus'
export const DEMO_BASE_URL =
	'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy-qwen'
export const DEMO_API_KEY = 'NA'

export const DEMO_CONFIG: LLMConfig = {
	apiKey: DEMO_API_KEY,
	baseURL: DEMO_BASE_URL,
	model: DEMO_MODEL,
}
