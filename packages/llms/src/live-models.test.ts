/**
 * Live compatibility test — hits real provider APIs.
 *
 * Purpose: verify request formatting and `modelPatch` (see `utils.ts`) work
 * for every model below, across the providers that serve them. Not a
 * correctness/quality eval — the tool call is trivial and forced via
 * `toolChoiceName`, so a failure here means the request/response shape is
 * wrong for that model, not that the model is "dumb".
 *
 * Tests `OpenAIClient` directly (not the `LLM` retry wrapper), so a failure
 * always reflects the very first request/response — no retry can mask it.
 *
 * Each provider's tests skip (not fail) when its `TESTING_*_KEY` env var is
 * absent, so this stays CI-safe. To actually run these, put keys in the
 * repo-root `.env`:
 *
 *   TESTING_OPENROUTER_KEY=...
 *   TESTING_DEEPSEEK_KEY=...
 *   TESTING_ALIYUN_KEY=...
 */
import { config as dotenvConfig } from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import * as z from 'zod/v4'

import { OpenAIClient } from './OpenAIClient'
import { parseLLMConfig } from './index'
import type { Message, Tool } from './types'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenvConfig({ path: resolve(__dirname, '../../../.env'), quiet: true })

const TEST_TIMEOUT = 30_000

/**
 * Mirrors `packages/website/src/pages/docs/features/models/page.tsx`.
 * This package cannot depend on the website, so the list is duplicated here.
 * Keep both lists in sync manually when models are added or renamed.
 */
const MODEL_GROUPS: Record<string, string[]> = {
	Qwen: [
		'qwen3.7-max',
		'qwen3.7-plus',
		'qwen3.6-max',
		'qwen3.6-plus',
		'qwen3.6-flash',
		'qwen3.5-plus',
		'qwen3.5-flash',
		'qwen3-max',
	],
	OpenAI: [
		'gpt-5.5',
		'gpt-5.4',
		'gpt-5.4-mini',
		'gpt-5.4-nano',
		'gpt-5.2',
		'gpt-5.1',
		'gpt-5',
		'gpt-5-mini',
		'gpt-4.1',
		'gpt-4.1-mini',
	],
	DeepSeek: ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-3.2'],
	Google: [
		'gemini-3.5-flash',
		'gemini-3.1-pro',
		'gemini-3.1-flash-lite',
		'gemini-2.5-pro',
		'gemini-2.5-flash',
	],
	Anthropic: [
		'claude-sonnet-5',
		'claude-opus-4-8',
		'claude-opus-4-7',
		'claude-opus-4-6',
		'claude-opus-4-5',
		'claude-sonnet-4-5',
		'claude-haiku-4-5',
	],
	MiniMax: ['MiniMax-M3', 'MiniMax-M2.7', 'MiniMax-M2.5'],
	xAI: ['grok-4.3', 'grok-build-0.1'],
	MoonshotAI: ['kimi-k2.7-code', 'kimi-k2.6', 'kimi-k2.5'],
	'Z.AI': ['glm-5.2', 'glm-5.1', 'glm-5', 'glm-4.7'],
}

/**
 * OpenRouter lists every model as `<vendor-slug>/<model-id>`, lowercase.
 * See the commented-out entries in the repo-root `.env` for real examples,
 * e.g. `x-ai/grok-4.1-fast`, `qwen/qwen3-coder-next`, `deepseek/deepseek-v3.2-exp`.
 */
const OPENROUTER_VENDOR_SLUG: Record<string, string> = {
	Qwen: 'qwen',
	OpenAI: 'openai',
	DeepSeek: 'deepseek',
	Google: 'google',
	Anthropic: 'anthropic',
	MiniMax: 'minimax',
	xAI: 'x-ai',
	MoonshotAI: 'moonshotai',
	'Z.AI': 'z-ai',
}

/**
 * Overrides for models whose OpenRouter id doesn't match the
 * `<vendor-slug>/<lowercased-name>` heuristic — dated snapshots, "-preview"
 * suffixes, "v"-prefixed versions, or dots instead of hyphens in the
 * version number. Verified against `GET https://openrouter.ai/api/v1/models`
 * on 2026-07-03; re-check when models are added to `MODEL_GROUPS`.
 */
const OPENROUTER_ID_OVERRIDES: Record<string, string> = {
	'qwen3.6-max': 'qwen/qwen3.6-max-preview',
	'qwen3.5-plus': 'qwen/qwen3.5-plus-20260420',
	'qwen3.5-flash': 'qwen/qwen3.5-flash-02-23',
	'deepseek-3.2': 'deepseek/deepseek-v3.2',
	'gemini-3.1-pro': 'google/gemini-3.1-pro-preview',
	'claude-opus-4-8': 'anthropic/claude-opus-4.8',
	'claude-opus-4-7': 'anthropic/claude-opus-4.7',
	'claude-opus-4-6': 'anthropic/claude-opus-4.6',
	'claude-opus-4-5': 'anthropic/claude-opus-4.5',
	'claude-sonnet-4-5': 'anthropic/claude-sonnet-4.5',
	'claude-haiku-4-5': 'anthropic/claude-haiku-4.5',
}

/**
 * Derive a model's OpenRouter id from its brand (a `MODEL_GROUPS` key) and
 * native model name.
 */
function toOpenRouterModelId(brand: string, model: string): string {
	if (model in OPENROUTER_ID_OVERRIDES) return OPENROUTER_ID_OVERRIDES[model]
	const slug = OPENROUTER_VENDOR_SLUG[brand]
	if (!slug) throw new Error(`No OpenRouter vendor slug mapped for brand "${brand}"`)
	return `${slug}/${model.toLowerCase()}`
}

const PROVIDERS = {
	openrouter: {
		baseURL: 'https://openrouter.ai/api/v1',
		apiKey: process.env.TESTING_OPENROUTER_KEY,
	},
	aliyun: {
		baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
		apiKey: process.env.TESTING_ALIYUN_KEY,
	},
	deepseek: {
		baseURL: 'https://api.deepseek.com',
		apiKey: process.env.TESTING_DEEPSEEK_KEY,
	},
} as const

const ECHO_TOOL: Tool<{ message: string }, string> = {
	description: 'Echo back the given message in uppercase.',
	inputSchema: z.object({ message: z.string() }),
	execute: async ({ message }) => message.toUpperCase(),
}

const PROMPT: Message[] = [
	{
		role: 'user',
		content: 'Call the "echo" tool with message set to "ping". You must call the tool.',
	},
]

async function expectEchoToolCall(baseURL: string, apiKey: string, model: string) {
	const client = new OpenAIClient(parseLLMConfig({ baseURL, apiKey, model }))
	const result = await client.invoke(PROMPT, { echo: ECHO_TOOL }, new AbortController().signal, {
		toolChoiceName: 'echo',
	})
	expect(result.toolResult).toBe('PING')
}

describe.concurrent('OpenRouter — all listed models', () => {
	const { baseURL, apiKey } = PROVIDERS.openrouter

	for (const [brand, models] of Object.entries(MODEL_GROUPS)) {
		for (const model of models) {
			const id = toOpenRouterModelId(brand, model)
			it.skipIf(!apiKey)(
				id,
				async () => {
					await expectEchoToolCall(baseURL, apiKey!, id)
				},
				TEST_TIMEOUT
			)
		}
	}
})

// Aliyun native ids that don't match the display name in MODEL_GROUPS.
const ALIYUN_ID_OVERRIDES: Record<string, string> = {
	'qwen3.6-max': 'qwen3.6-max-preview',
}

describe.concurrent('Aliyun DashScope — Qwen native', () => {
	const { baseURL, apiKey } = PROVIDERS.aliyun

	for (const model of MODEL_GROUPS.Qwen) {
		const id = ALIYUN_ID_OVERRIDES[model] ?? model
		it.skipIf(!apiKey)(
			id,
			async () => {
				await expectEchoToolCall(baseURL, apiKey!, id)
			},
			TEST_TIMEOUT
		)
	}
})

describe.concurrent('DeepSeek — native', () => {
	const { baseURL, apiKey } = PROVIDERS.deepseek
	// deepseek-3.2 isn't served on DeepSeek's own API (only via OpenRouter
	// resellers) — its official API only accepts deepseek-v4-pro/-flash.
	const nativeModels = MODEL_GROUPS.DeepSeek.filter((model) => model !== 'deepseek-3.2')

	for (const model of nativeModels) {
		it.skipIf(!apiKey)(
			model,
			async () => {
				await expectEchoToolCall(baseURL, apiKey!, model)
			},
			TEST_TIMEOUT
		)
	}
})
