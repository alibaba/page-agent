/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * Executes a generated capability against the live DOM.
 *
 * @remarks
 * This is the compatibility layer that lets a capability keep a stable contract
 * (`search_customers(name, status)`) while its implementation is still clicks and
 * keystrokes. When the same action later becomes available over WebMCP or a real
 * API, only the backing execution changes — the tool the agent sees does not.
 */
import { clickElement, inputTextElement, selectOptionElement } from '../actions'
import { waitFor } from '../utils'
import type { DomCapabilityDescriptor, DomCapabilityField } from './domScanner'
import { resolveLocator } from './locator'

export interface DomExecutionResult {
	success: boolean
	message: string
	/** Text read back from the capability's container after the action settled. */
	output?: string
}

/** Max characters of page text read back as the capability's result. */
const MAX_OUTPUT = 1500

/**
 * Fill the descriptor's fields with `input` and activate its submit control.
 *
 * Missing optional fields are skipped; a missing *required* field, or a field whose
 * locator no longer resolves, fails loudly rather than silently submitting a
 * half-filled form.
 */
export async function executeDomCapability(
	descriptor: DomCapabilityDescriptor,
	input: Record<string, unknown>,
	signal?: AbortSignal
): Promise<DomExecutionResult> {
	signal?.throwIfAborted()

	const filled: string[] = []

	for (const field of descriptor.fields) {
		signal?.throwIfAborted()

		const value = input?.[field.name]
		const provided = value !== undefined && value !== null && value !== ''

		if (!provided) {
			if (field.required) {
				return {
					success: false,
					message: `❌ Required field "${field.name}" was not provided to ${descriptor.name}.`,
				}
			}
			continue
		}

		const element = resolveLocator(field.locator)
		if (!element || !element.isConnected) {
			return {
				success: false,
				message:
					`❌ The "${field.label}" field of ${descriptor.name} is no longer on the page ` +
					`(the UI likely changed). Fall back to direct DOM interaction for this step.`,
			}
		}

		try {
			await applyFieldValue(element, field, value)
			filled.push(`${field.name}=${toText(value)}`)
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to set "${field.label}" on ${descriptor.name}: ${String(error)}`,
			}
		}
	}

	signal?.throwIfAborted()

	if (!descriptor.submit) {
		return {
			success: true,
			message: `✅ Filled ${descriptor.name} (${filled.join(', ') || 'no fields'}). No submit control to activate.`,
		}
	}

	const submit = resolveLocator(descriptor.submit.locator)
	if (!submit || !submit.isConnected) {
		// The form is filled; a missing submit button is recoverable by the DOM agent.
		return {
			success: false,
			message:
				`⚠️ Filled ${descriptor.name} (${filled.join(', ')}), but the ` +
				`"${descriptor.submit.label}" control is no longer on the page. ` +
				`Submit it directly instead.`,
		}
	}

	await clickElement(submit)

	// Let the application react (navigation, XHR, re-render) before reading back.
	await waitFor(0.6)

	signal?.throwIfAborted()

	const output = readBack(descriptor)

	return {
		success: true,
		message:
			`✅ ${descriptor.name} executed (${filled.join(', ') || 'no inputs'}) ` +
			`via "${descriptor.submit.label}".`,
		output,
	}
}

/**
 * Render a model-supplied argument as input text without ever producing
 * `[object Object]` in a user-visible form field.
 */
function toText(value: unknown): string {
	if (typeof value === 'string') return value
	if (value === null || value === undefined) return ''
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value) ?? ''
		} catch {
			return ''
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-base-to-string
	return String(value)
}

async function applyFieldValue(
	element: HTMLElement,
	field: DomCapabilityField,
	value: unknown
): Promise<void> {
	switch (field.kind) {
		case 'select': {
			await selectOptionElement(element as HTMLSelectElement, String(value))
			return
		}

		case 'checkbox':
		case 'radio': {
			const input = element as HTMLInputElement
			const shouldCheck =
				value === true || value === 'true' || value === 1 || value === 'yes' || value === 'on'
			if (input.checked !== shouldCheck) await clickElement(element)
			return
		}

		default: {
			await inputTextElement(element, toText(value))
			return
		}
	}
}

/**
 * Read the capability's own container after submitting.
 *
 * Search-style actions are only useful if the agent gets the results back, and the
 * container is where an application renders them. When the container is gone (the
 * app navigated), fall back to the main landmark.
 */
function readBack(descriptor: DomCapabilityDescriptor): string | undefined {
	const container = resolveLocator(descriptor.container)
	const target =
		container && container.isConnected
			? (container.parentElement ?? container)
			: (document.querySelector('main') ?? document.body)

	const text = (target?.innerText ?? '').replace(/\s{2,}/g, ' ').trim()
	if (!text) return undefined

	return text.length > MAX_OUTPUT ? text.slice(0, MAX_OUTPUT) + '...' : text
}
