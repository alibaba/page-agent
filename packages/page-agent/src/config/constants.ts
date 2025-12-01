/**
 * @note Since isTopElement depends on elementFromPoint,
 * it returns null when out of viewport, this feature has no practical use, only differ between -1 and 0
 */
// export const VIEWPORT_EXPANSION = 100
export const VIEWPORT_EXPANSION = -1

// Dev environment: use .env config if available, otherwise fallback to testing api
export const DEFAULT_MODEL_NAME: string =
	import.meta.env.DEV && import.meta.env.LLM_MODEL_NAME
		? import.meta.env.LLM_MODEL_NAME
		: 'PAGE-AGENT-FREE-TESTING-RANDOM'

export const DEFAULT_API_KEY: string =
	import.meta.env.DEV && import.meta.env.LLM_API_KEY
		? import.meta.env.LLM_API_KEY
		: 'PAGE-AGENT-FREE-TESTING-RANDOM'

export const DEFAULT_BASE_URL: string =
	import.meta.env.DEV && import.meta.env.LLM_BASE_URL
		? import.meta.env.LLM_BASE_URL
		: 'https://hwcxiuzfylggtcktqgij.supabase.co/functions/v1/llm-testing-proxy'

// internal

export const LLM_MAX_RETRIES = 2
export const MAX_STEPS = 20
export const DEFAULT_TEMPERATURE = 0.7 // higher randomness helps auto-recovery
export const DEFAULT_MAX_TOKENS = 4096
