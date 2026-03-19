/**
 * autoNameRecording — Call LLM to generate name and description for a recording
 *
 * Uses a lightweight direct API call (no tool-calling overhead).
 * Falls back to empty strings if the call fails.
 */

import type { LLMConfig } from '@page-agent/llms'
import type { RecordedStep, Recording } from '@/lib/recording-types'

/** Compact step summary for the naming prompt (~5 tokens per step) */
function summarizeStep(step: RecordedStep, index: number): string {
	const act = step.act
	const el = step.el
	const elDesc = el?.text ? `"${el.text.slice(0, 30)}"` : el?.tag || ''

	switch (act.type) {
		case 'click':
			return `${index + 1}. click ${elDesc}`
		case 'input':
			return `${index + 1}. type "${act.value.slice(0, 20)}" → ${elDesc}`
		case 'select':
			return `${index + 1}. select "${act.value}" in ${elDesc}`
		case 'scroll':
			return `${index + 1}. scroll ${act.direction}`
		case 'navigate':
			return `${index + 1}. go to ${act.url}`
		case 'newTab':
			return `${index + 1}. new tab: ${act.url}`
		case 'switchTab':
			return `${index + 1}. switch tab`
		case 'closeTab':
			return `${index + 1}. close tab`
		case 'keypress':
			return `${index + 1}. press ${act.key}`
		case 'wait':
			return `${index + 1}. wait ${act.seconds}s`
		default:
			return `${index + 1}. ${act.type}`
	}
}

const NAMING_PROMPT = `You are a concise naming assistant. Given a sequence of browser actions, generate:
1. A short name (2-6 words, like "搜索B站视频" or "Login to GitHub")
2. A one-sentence description of what the action sequence does

Respond in JSON format: {"name": "...", "desc": "..."}
Use the same language as the page titles and content. Do NOT include any markdown or explanation.`

export interface AutoNameResult {
	name: string
	desc: string
}

/**
 * Call LLM to generate a name and description for the recording.
 * Returns { name: '', desc: '' } on failure.
 */
export async function autoNameRecording(
	steps: RecordedStep[],
	startUrl: string,
	llmConfig: LLMConfig
): Promise<AutoNameResult> {
	const fallback: AutoNameResult = { name: '', desc: '' }

	if (!llmConfig?.baseURL || !llmConfig?.apiKey || !llmConfig?.model) {
		return fallback
	}

	if (steps.length === 0) {
		return fallback
	}

	// Build compact step summary
	const stepsSummary = steps.map((s, i) => summarizeStep(s, i)).join('\n')
	const userMsg = `Start URL: ${startUrl}\n\nActions:\n${stepsSummary}`

	try {
		const response = await fetch(`${llmConfig.baseURL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${llmConfig.apiKey}`,
			},
			body: JSON.stringify({
				model: llmConfig.model,
				temperature: 0.3,
				messages: [
					{ role: 'system', content: NAMING_PROMPT },
					{ role: 'user', content: userMsg },
				],
			}),
		})

		if (!response.ok) {
			console.debug('[autoNameRecording] API error:', response.status)
			return fallback
		}

		const data = await response.json()
		const content = data?.choices?.[0]?.message?.content?.trim()

		if (!content) return fallback

		// Parse JSON — handle possible markdown wrapping
		const jsonStr = content.replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
		const parsed = JSON.parse(jsonStr)

		return {
			name: typeof parsed.name === 'string' ? parsed.name.slice(0, 50) : '',
			desc: typeof parsed.desc === 'string' ? parsed.desc.slice(0, 200) : '',
		}
	} catch (err) {
		console.debug('[autoNameRecording] Failed:', err)
		return fallback
	}
}
