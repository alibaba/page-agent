/**
 * RecordingReplayAgent — Converts a Recording into task + systemInstruction
 * for the existing PageAgentCore execution loop.
 *
 * Core idea: the recording becomes a "plan" injected via systemInstruction.
 * The LLM reads the plan + observes the actual page → adaptive execution.
 * Zero changes to PageAgentCore.
 */

import type { Recording, RecordedStep, ElementDescriptor } from '@/lib/recording-types'
import REPLAY_PROMPT_TEMPLATE from './replay_prompt.md?raw'

// ─── Step Formatting ───────────────────────────────────────────────

/** Format a single step into a compact one-line string for LLM consumption (~10 tokens/step) */
function formatStepForLLM(step: RecordedStep, index: number): string {
	const prefix = `[${index + 1}]`
	const act = step.act
	const el = step.el

	switch (act.type) {
		case 'click': {
			const target = describeElement(el)
			const context = el?.context ? ` in ${el.context}` : ''
			const idxNote = el?.idx !== undefined ? ` (index:${el.idx})` : ''
			return `${prefix} click ${target}${idxNote}${context}`
		}

		case 'input': {
			const target = describeElement(el)
			const paramNote = act.param ? ` [PARAM:${act.param}]` : ''
			const idxNote = el?.idx !== undefined ? ` (index:${el.idx})` : ''
			return `${prefix} type "${act.value}" → ${target}${idxNote}${paramNote}`
		}

		case 'select': {
			const target = describeElement(el)
			const paramNote = act.param ? ` [PARAM:${act.param}]` : ''
			const idxNote = el?.idx !== undefined ? ` (index:${el.idx})` : ''
			return `${prefix} select "${act.value}" in ${target}${idxNote}${paramNote}`
		}

		case 'scroll':
			return `${prefix} scroll ${act.direction} ${act.pixels}px`

		case 'navigate': {
			const paramNote = act.param ? ` [PARAM:${act.param}]` : ''
			return `${prefix} navigate to ${act.url}${paramNote}`
		}

		case 'newTab':
			return `${prefix} open new tab: ${act.url}`

		case 'switchTab':
			return `${prefix} switch to tab ${act.tabIdx}`

		case 'closeTab':
			return `${prefix} close tab ${act.tabIdx}`

		case 'keypress': {
			const mods = act.modifiers?.join('+') ?? ''
			const key = mods ? `${mods}+${act.key}` : act.key
			const target = el ? ` → ${describeElement(el)}` : ''
			const idxNote = el?.idx !== undefined ? ` (index:${el.idx})` : ''
			return `${prefix} press ${key}${target}${idxNote}`
		}

		case 'wait':
			return `${prefix} wait ${act.seconds}s`

		default:
			return `${prefix} ${JSON.stringify(act)}`
	}
}

/** Create a compact element description string */
function describeElement(el?: ElementDescriptor): string {
	if (!el) return 'element'

	const parts: string[] = []

	// Text is highest priority
	if (el.text) {
		parts.push(`"${el.text.slice(0, 40)}"`)
	}

	// Tag + role
	if (el.tag) {
		const roleStr = el.role ? ` role="${el.role}"` : ''
		parts.push(`(${el.tag}${roleStr})`)
	}

	// Additional attributes for disambiguation
	if (el.ariaLabel) parts.push(`aria-label="${el.ariaLabel}"`)
	if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`)
	if (el.name) parts.push(`name="${el.name}"`)

	// URL context
	if (parts.length === 0 && el.selector) {
		parts.push(el.selector)
	}

	return parts.join(' ') || 'element'
}

// ─── Parameter Handling ────────────────────────────────────────────

/** Extract all param names from a recording */
export function extractParams(recording: Recording): Map<string, string> {
	const params = new Map<string, string>()

	for (const step of recording.steps) {
		const act = step.act
		if ('param' in act && act.param && 'value' in act) {
			params.set(act.param, act.value as string)
		}
	}

	return params
}

/** Apply parameter overrides to a recording (returns a new copy) */
export function applyParamOverrides(
	recording: Recording,
	overrides: Record<string, string>
): Recording {
	const newSteps = recording.steps.map((step) => {
		const act = step.act
		if ('param' in act && act.param && act.param in overrides) {
			return {
				...step,
				act: { ...act, value: overrides[act.param] },
			}
		}
		return step
	})

	return { ...recording, steps: newSteps }
}

// ─── Task Building ─────────────────────────────────────────────────

export interface ReplayTaskResult {
	task: string
	systemInstruction: string
}

/**
 * Build a replay task + system instruction from a Recording.
 *
 * @param recording - The recording to replay
 * @param paramOverrides - Optional parameter value overrides
 * @param nlModification - Optional natural language modification instruction
 */
export function buildReplayTask(
	recording: Recording,
	paramOverrides?: Record<string, string>,
	nlModification?: string
): ReplayTaskResult {
	// Apply param overrides
	const effectiveRecording = paramOverrides
		? applyParamOverrides(recording, paramOverrides)
		: recording

	// Format steps as compact plan
	const planLines = effectiveRecording.steps.map((step, i) => formatStepForLLM(step, i))
	const plan = planLines.join('\n')

	// Build system instruction from template
	let systemInstruction = REPLAY_PROMPT_TEMPLATE.replace('{{PLAN}}', plan)

	// Handle natural language modification
	if (nlModification?.trim()) {
		systemInstruction = systemInstruction.replace('{{NL_MOD}}', nlModification.trim())
	} else {
		// Remove the NL modification section entirely (handle any line endings)
		systemInstruction = systemInstruction.replace(
			/<natural_language_modification>\s*\{\{NL_MOD\}\}\s*<\/natural_language_modification>/,
			''
		)
	}

	// Build task description
	const taskDesc = recording.desc || recording.name || 'Replay recorded browser automation'
	const startUrlNote = recording.startUrl ? `\nStart at: ${recording.startUrl}` : ''
	const task = `${taskDesc}${startUrlNote}\n\nFollow the plan in the system instruction to complete this task.`

	return { task, systemInstruction }
}
