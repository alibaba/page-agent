/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * DOM → capability generation (§8, §9 of the WebMCP Architecture Enhancement brief).
 *
 * @remarks
 * The goal is business actions, not UI interactions: a name/email/phone form plus a
 * "Save Customer" button becomes ONE `create_customer(name, email, phone)` tool, not
 * four `type_*`/`click_save` tools. Anything this pass cannot model confidently is
 * simply not emitted — the existing free-form DOM agent remains the fallback, so a
 * missed capability costs nothing but a slower path.
 *
 * This module emits plain descriptors. Turning them into executable capabilities is
 * `@eb-agent/core`'s job, which keeps this package free of any capability-layer or
 * LLM dependency.
 */
import { type Locator, buildLocator } from './locator'

/** One input of a generated capability. */
export interface DomCapabilityField {
	/** Parameter name exposed to the agent, e.g. `customer_name`. */
	name: string
	/** Human label the field had in the UI. */
	label: string
	locator: Locator
	kind: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date'
	required: boolean
	/** For `select`: the option texts, so the agent passes a value that exists. */
	options?: string[]
	placeholder?: string
}

/** A candidate business action discovered in the page's UI. */
export interface DomCapabilityDescriptor {
	name: string
	description: string
	fields: DomCapabilityField[]
	submit?: { locator: Locator; label: string }
	/** Container the action lives in — used to read back a result after submitting. */
	container: Locator
	risk: 'read' | 'reversible' | 'consequential'
	/** 0..1. Capped below 1: only declared capabilities are certain. */
	confidence: number
	/** URL the descriptor was generated on. */
	page: string
}

const MAX_FIELDS = 12
const MAX_CAPABILITIES = 20

/** Verbs that decide both the generated name and the risk level. */
const ACTION_VERBS: {
	pattern: RegExp
	verb: string
	risk: DomCapabilityDescriptor['risk']
}[] = [
	{ pattern: /\b(search|find|lookup|filter|query)\b/i, risk: 'read', verb: 'search' },
	{ pattern: /\b(sign in|log in|login|authenticate)\b/i, risk: 'reversible', verb: 'sign_in' },
	{ pattern: /\b(create|add|new|register|sign up|signup)\b/i, risk: 'reversible', verb: 'create' },
	// `apply` is its own action, not a synonym of update: "Apply Coupon" and
	// "Update Profile" are different things to a user and to an agent.
	{ pattern: /\b(apply|redeem)\b/i, risk: 'reversible', verb: 'apply' },
	{ pattern: /\b(save|update|edit|change|modify)\b/i, risk: 'reversible', verb: 'update' },
	{ pattern: /\b(delete|remove|destroy|archive)\b/i, risk: 'consequential', verb: 'delete' },
	{
		pattern: /\b(pay|checkout|purchase|order|refund|transfer|send|submit payment)\b/i,
		risk: 'consequential',
		verb: 'submit',
	},
	{ pattern: /\b(cancel|unsubscribe|revoke)\b/i, risk: 'consequential', verb: 'cancel' },
	{ pattern: /\b(submit|confirm|continue|next)\b/i, risk: 'reversible', verb: 'submit' },
]

const SUBMIT_TEXT =
	/(search|save|create|add|submit|apply|update|delete|send|confirm|go|sign in|log in|continue|checkout|pay)/i

/**
 * Scan the live document for candidate business actions.
 *
 * @param options.root - Subtree to scan. Defaults to the whole document.
 * @param options.maxCapabilities - Safety cap; the agent's tool list must stay legible.
 */
export function scanDomCapabilities(options?: {
	root?: ParentNode
	maxCapabilities?: number
}): DomCapabilityDescriptor[] {
	if (typeof document === 'undefined') return []

	const root = options?.root ?? document
	const limit = options?.maxCapabilities ?? MAX_CAPABILITIES
	const page = typeof window !== 'undefined' ? window.location.href : ''

	const scopes = collectScopes(root)
	const descriptors: DomCapabilityDescriptor[] = []
	const usedNames = new Set<string>()

	for (const scope of scopes) {
		if (descriptors.length >= limit) break

		const descriptor = describeScope(scope, page)
		if (!descriptor) continue

		// Disambiguate duplicate names (two search forms on one page).
		let name = descriptor.name
		let suffix = 2
		while (usedNames.has(name)) {
			name = `${descriptor.name}_${suffix++}`
		}
		usedNames.add(name)

		descriptors.push({ ...descriptor, name })
	}

	return descriptors
}

/**
 * Candidate containers, most specific first. A `<form>` is the strongest signal;
 * beyond that we accept explicit search/dialog roles and generic containers that
 * hold both inputs and a plausible submit control.
 */
function collectScopes(root: ParentNode): HTMLElement[] {
	const scopes: HTMLElement[] = []
	const seen = new Set<HTMLElement>()

	const push = (element: Element | null) => {
		if (!(element instanceof HTMLElement)) return
		if (seen.has(element)) return
		if (!isVisible(element)) return
		seen.add(element)
		scopes.push(element)
	}

	root.querySelectorAll('form').forEach(push)
	root.querySelectorAll('[role="search"]').forEach(push)
	root.querySelectorAll('dialog, [role="dialog"]').forEach(push)
	root.querySelectorAll('fieldset').forEach(push)

	// Generic containers: an input whose nearest common ancestor with a button
	// contains no other scope already captured.
	const inputs = Array.from(
		root.querySelectorAll<HTMLElement>('input, select, textarea, [contenteditable="true"]')
	).filter(isVisible)

	for (const input of inputs) {
		if (scopes.some((scope) => scope.contains(input))) continue

		let container: HTMLElement | null = input.parentElement
		let depth = 0
		while (container && depth < 5) {
			const buttons = container.querySelectorAll('button, [role="button"], input[type="submit"]')
			if (buttons.length > 0) {
				push(container)
				break
			}
			container = container.parentElement
			depth++
		}
	}

	return scopes
}

function describeScope(scope: HTMLElement, page: string): DomCapabilityDescriptor | null {
	const fieldElements = Array.from(
		scope.querySelectorAll<HTMLElement>('input, select, textarea, [contenteditable="true"]')
	)
		.filter(isVisible)
		.filter((element) => !isIgnoredInput(element))
		.slice(0, MAX_FIELDS)

	if (fieldElements.length === 0) return null

	const submit = findSubmit(scope)

	// Without a submit control we cannot commit the action, and a bag of inputs is
	// not a business action. Leave it to the DOM agent.
	if (!submit) return null

	const fields = fieldElements
		.map((element) => describeField(element))
		.filter((field): field is DomCapabilityField => field !== null)

	if (fields.length === 0) return null

	const heading = findHeading(scope)
	const submitLabel = labelOf(submit)
	const { verb, risk } = classifyAction(`${submitLabel} ${heading}`)
	const object = deriveObject(heading, scope, fields)

	const name = [verb, object].filter(Boolean).join('_')
	const description = buildDescription(verb, object, heading, submitLabel, fields)

	return {
		name,
		description,
		fields,
		submit: { locator: buildLocator(submit), label: submitLabel },
		container: buildLocator(scope),
		risk,
		confidence: scoreConfidence(scope, fields, heading, submit),
		page,
	}
}

/** Inputs that are never part of a business action's signature. */
function isIgnoredInput(element: HTMLElement): boolean {
	const type = (element.getAttribute('type') ?? '').toLowerCase()
	if (['hidden', 'submit', 'button', 'reset', 'image', 'file'].includes(type)) return true
	if (element.hasAttribute('disabled')) return true
	if (element.getAttribute('aria-hidden') === 'true') return true
	return false
}

function findSubmit(scope: HTMLElement): HTMLElement | null {
	const explicit = scope.querySelector<HTMLElement>(
		'button[type="submit"], input[type="submit"], [role="button"][type="submit"]'
	)
	if (explicit && isVisible(explicit)) return explicit

	const buttons = Array.from(
		scope.querySelectorAll<HTMLElement>('button, [role="button"], input[type="button"]')
	).filter((button) => isVisible(button) && !button.hasAttribute('disabled'))

	if (buttons.length === 0) return null

	const byText = buttons.find((button) => SUBMIT_TEXT.test(labelOf(button)))
	if (byText) return byText

	// A single unambiguous button in the scope is very likely the commit control.
	return buttons.length === 1 ? buttons[0] : null
}

function describeField(element: HTMLElement): DomCapabilityField | null {
	const label = labelFor(element)
	const name = toSnakeCase(
		label ||
			element.getAttribute('name') ||
			element.getAttribute('aria-label') ||
			element.getAttribute('placeholder') ||
			element.getAttribute('id') ||
			''
	)

	if (!name) return null

	const tag = element.tagName.toLowerCase()
	const type = (element.getAttribute('type') ?? '').toLowerCase()

	let kind: DomCapabilityField['kind'] = 'text'
	let optionsList: string[] | undefined

	if (tag === 'select') {
		kind = 'select'
		optionsList = Array.from((element as HTMLSelectElement).options)
			.map((option) => option.textContent?.trim() ?? '')
			.filter(Boolean)
			.slice(0, 25)
	} else if (tag === 'textarea') {
		kind = 'textarea'
	} else if (type === 'checkbox') {
		kind = 'checkbox'
	} else if (type === 'radio') {
		kind = 'radio'
	} else if (type === 'number') {
		kind = 'number'
	} else if (type === 'date' || type === 'datetime-local') {
		kind = 'date'
	}

	return {
		name,
		label: label || name,
		locator: buildLocator(element),
		kind,
		required: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
		options: optionsList,
		placeholder: element.getAttribute('placeholder') ?? undefined,
	}
}

/** Resolve a form control's visible label through the usual accessibility routes. */
function labelFor(element: HTMLElement): string {
	const labelledBy = element.getAttribute('aria-labelledby')
	if (labelledBy) {
		const labelText = labelledBy
			.split(/\s+/)
			.map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim() ?? '')
			.filter(Boolean)
			.join(' ')
		if (labelText) return clean(labelText)
	}

	const ariaLabel = element.getAttribute('aria-label')
	if (ariaLabel) return clean(ariaLabel)

	const id = element.getAttribute('id')
	if (id) {
		try {
			const label = element.ownerDocument.querySelector<HTMLElement>(
				`label[for="${typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id}"]`
			)
			if (label?.textContent) return clean(label.textContent)
		} catch {
			// Invalid id for a selector — ignore and keep looking.
		}
	}

	const wrapping = element.closest('label')
	if (wrapping?.textContent) return clean(wrapping.textContent)

	const placeholder = element.getAttribute('placeholder')
	if (placeholder) return clean(placeholder)

	return ''
}

function findHeading(scope: HTMLElement): string {
	const legend = scope.querySelector('legend')
	if (legend?.textContent) return clean(legend.textContent)

	const heading = scope.querySelector('h1, h2, h3, h4, [role="heading"]')
	if (heading?.textContent) return clean(heading.textContent)

	const ariaLabel = scope.getAttribute('aria-label')
	if (ariaLabel) return clean(ariaLabel)

	// A heading immediately preceding the scope is a very common layout.
	const previous = scope.previousElementSibling
	if (previous && /^h[1-4]$/i.test(previous.tagName) && previous.textContent) {
		return clean(previous.textContent)
	}

	return ''
}

function classifyAction(text: string): { verb: string; risk: DomCapabilityDescriptor['risk'] } {
	for (const { pattern, verb, risk } of ACTION_VERBS) {
		if (pattern.test(text)) return { verb, risk }
	}
	// Unknown verb: assume it changes something, but not irreversibly.
	return { verb: 'submit', risk: 'reversible' }
}

/** The noun the action operates on, e.g. `customer` from "Customer Search". */
function deriveObject(heading: string, scope: HTMLElement, fields: DomCapabilityField[]): string {
	const source =
		heading || scope.getAttribute('name') || scope.getAttribute('id') || fields[0]?.label || ''

	// Verb words are dropped so the object stays a noun: "Apply Coupon" → `coupon`,
	// which the caller then prefixes with the classified verb → `apply_coupon`.
	const stopWords = new Set([
		'search',
		'find',
		'filter',
		'create',
		'add',
		'new',
		'save',
		'update',
		'edit',
		'delete',
		'remove',
		'submit',
		'confirm',
		'form',
		'the',
		'a',
		'an',
		'your',
		'please',
		'enter',
		'select',
		'apply',
		'redeem',
		'pay',
		'checkout',
		'cancel',
		'sign',
		'login',
		'continue',
		'next',
		'send',
	])

	const words = clean(source)
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((word) => word.length > 2 && !stopWords.has(word))
		.slice(0, 2)

	return toSnakeCase(words.join(' '))
}

function buildDescription(
	verb: string,
	object: string,
	heading: string,
	submitLabel: string,
	fields: DomCapabilityField[]
): string {
	const subject = object ? object.replace(/_/g, ' ') : (heading || 'this form').toLowerCase()
	const action = verb.replace(/_/g, ' ')
	const fieldList = fields
		.map((field) => field.label)
		.slice(0, 6)
		.join(', ')

	return clean(
		`${capitalize(action)} ${subject} using the page's own "${heading || submitLabel}" form. ` +
			`Fills ${fieldList} and activates "${submitLabel}".`
	)
}

/**
 * How much we trust this descriptor. Real semantic markup raises it; guessing from
 * a generic `<div>` keeps it low, and low-confidence capabilities stay internal
 * rather than being published to external agents (§10).
 */
function scoreConfidence(
	scope: HTMLElement,
	fields: DomCapabilityField[],
	heading: string,
	submit: HTMLElement
): number {
	let score = 0.4

	if (scope.tagName.toLowerCase() === 'form') score += 0.2
	if (heading) score += 0.1
	if (submit.getAttribute('type') === 'submit') score += 0.1

	const labelled = fields.filter((field) => field.label && field.label !== field.name).length
	if (labelled === fields.length) score += 0.15
	else if (labelled > 0) score += 0.05

	const anchored = fields.filter((field) => Boolean(field.locator.selector)).length
	if (anchored === fields.length) score += 0.1

	// Never 1: a generated capability is an inference, not a declaration.
	return Math.min(0.95, Number(score.toFixed(2)))
}

function isVisible(element: HTMLElement): boolean {
	if (!element.isConnected) return false
	const style = element.ownerDocument.defaultView?.getComputedStyle(element)
	if (!style) return true
	if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
		return false
	}
	const rect = element.getBoundingClientRect()
	return rect.width > 0 && rect.height > 0
}

function labelOf(element: HTMLElement): string {
	const value = element.getAttribute('value')
	const text = clean(element.textContent ?? '')
	return text || clean(element.getAttribute('aria-label') ?? '') || clean(value ?? '')
}

function clean(text: string): string {
	return text.replace(/\s+/g, ' ').trim()
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1)
}

function toSnakeCase(text: string): string {
	return clean(text)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/_{2,}/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 40)
}
