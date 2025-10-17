/**
 * @note Since isTopElement depends on elementFromPoint,
 * it returns null when out of viewport, this feature has no practical use, only differ between -1 and 0
 */
// export const VIEWPORT_EXPANSION = 100
export const VIEWPORT_EXPANSION = -1

// models

// 🥇 GPT-4.1 (best so far)
// export const DEFAULT_MODEL_NAME: string = 'gpt-41-mini-0414-global' // baseline 🌟
// export const DEFAULT_MODEL_NAME: string = 'gpt-41-0414-global' // unnecessary

// 🤞 qwen (tool call format often irregular)
// export const DEFAULT_MODEL_NAME: string = 'qwen-plus-latest' // okay
// export const DEFAULT_MODEL_NAME: string = 'qwen-turbo-latest' // BAD☠️

// 👍 Anthropic
// export const DEFAULT_MODEL_NAME: string = 'claude_sonnet4'

// 👌 DeepSeek
// export const DEFAULT_MODEL_NAME: string = 'DeepSeek-V3-671B'
// export const DEFAULT_MODEL_NAME: string = 'deepseek-v3.1'
// export const DEFAULT_MODEL_NAME: string = 'deepseek-v3'

// ☠️❌🙂‍↔️ GPT-5 (slow as hell)
// export const DEFAULT_MODEL_NAME: string = '_gpt-5-nano-0807-global'
// export const DEFAULT_MODEL_NAME: string = '_gpt-5-mini-0807-global'
// export const DEFAULT_MODEL_NAME: string = '_gpt-5-0807-global'

// ❌ Gemini (incapable tool call json schema)
// @todo need a special client for gemini
// export const DEFAULT_MODEL_NAME: string = 'gemini-2.5-pro-06-17'

// Dev environment: use .env config if available, otherwise fallback to defaults
export const DEFAULT_MODEL_NAME: string =
	import.meta.env.DEV && import.meta.env.LLM_MODEL_NAME
		? import.meta.env.LLM_MODEL_NAME
		: 'gpt-41-mini-0414-global'

export const DEFAULT_API_KEY: string =
	import.meta.env.DEV && import.meta.env.LLM_API_KEY ? import.meta.env.LLM_API_KEY : 'not-needed'

export const DEFAULT_BASE_URL: string =
	import.meta.env.DEV && import.meta.env.LLM_BASE_URL
		? import.meta.env.LLM_BASE_URL
		: 'http://localhost:3000/api/agent'

// internal

export const LLM_MAX_RETRIES = 2
export const MAX_STEPS = 20
