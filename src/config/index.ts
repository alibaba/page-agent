import type { DomConfig } from '@/dom'
import type { SupportedLanguage } from '@/i18n'

import { DEFAULT_API_KEY, DEFAULT_BASE_URL, DEFAULT_MODEL_NAME, LLM_MAX_RETRIES } from './constants'

export interface LLMConfig {
	baseURL?: string
	apiKey?: string
	modelName?: string
	temperature?: number
	maxTokens?: number
	maxRetries?: number
}

export interface UIConfig {
	// theme?: 'light' | 'dark'
	language?: SupportedLanguage
}

export type PageAgentConfig = LLMConfig & DomConfig & UIConfig

export function parseLLMConfig(config: LLMConfig): Required<LLMConfig> {
	return {
		baseURL: config.baseURL ?? DEFAULT_BASE_URL,
		apiKey: config.apiKey ?? DEFAULT_API_KEY,
		modelName: config.modelName ?? DEFAULT_MODEL_NAME,
		temperature: config.temperature ?? 0.7,
		maxTokens: config.maxTokens ?? 4096,
		maxRetries: config.maxRetries ?? LLM_MAX_RETRIES,
	}
}
