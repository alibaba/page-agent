/**
 * Internal tools for EBAgent.
 * @note Adapted from browser-use
 */
import * as z from 'zod/v4'

import type { EBAgentCore } from '../EBAgentCore'
import { waitFor } from '../utils'

/**
 * Per-invocation context passed to every tool execution.
 * Tools MUST honor `signal` to support cooperative cancellation.
 */
export interface ToolContext {
	signal: AbortSignal
}

/**
 * Internal tool definition that has access to EBAgent `this` context
 */
export interface EBAgentTool<TParams = any> {
	// name: string
	description: string
	inputSchema: z.ZodType<TParams>
	execute: (this: EBAgentCore, args: TParams, ctx: ToolContext) => Promise<string>
}

export function tool<TParams>(options: EBAgentTool<TParams>): EBAgentTool<TParams> {
	return options
}

/**
 * Internal tools for EBAgent.
 * Note: Using any to allow different parameter types for each tool
 */
export const tools = new Map<string, EBAgentTool>()

tools.set(
	'done',
	tool({
		description:
			'Complete task. Text is your final response to the user — keep it concise unless the user explicitly asks for detail. ' +
			'This ends the task permanently and nothing runs after it. Do NOT call this while text merely states what you plan ' +
			'to do next ("let me search...", "I will now...") — if you know the next action, take it instead of narrating it here. ' +
			'If `text` would end in a question the user needs to answer, use `ask_user` instead — ' +
			'a question left in this text will never be answered, since the next user message starts an unrelated new task.',
		inputSchema: z.object({
			text: z.string(),
			success: z.boolean().default(true),
		}),
		execute: async function (this: EBAgentCore, input) {
			// @note main loop will handle this one
			return Promise.resolve('Task completed')
		},
	})
)

tools.set(
	'wait',
	tool({
		description: 'Wait for x seconds. Can be used to wait until the page or data is fully loaded.',
		inputSchema: z.object({
			seconds: z.number().min(1).max(10).default(1),
		}),
		execute: async function (this: EBAgentCore, input, { signal }) {
			// try to subtract LLM calling time from the actual wait time
			const lastTimeUpdate = await this.pageController.getLastUpdateTime()
			const secondsSinceLastUpdate = (Date.now() - lastTimeUpdate) / 1000
			const actualWaitTime = Math.max(0, input.seconds - secondsSinceLastUpdate)
			console.log(`actualWaitTime: ${actualWaitTime} seconds`)
			await waitFor(actualWaitTime, signal)

			const waitedSeconds = (secondsSinceLastUpdate + actualWaitTime).toFixed(2)
			return `✅ Waited for ${waitedSeconds} seconds.`
		},
	})
)

tools.set(
	'ask_user',
	tool({
		description:
			'Ask the user a question and wait for their answer. Only use this when genuinely blocked — ' +
			'e.g. you need credentials you do not have, or must choose between multiple valid interpretations ' +
			'that only the user can resolve. Do NOT use it to confirm information already visible in browser_state ' +
			'or already returned by identify_image. ' +
			'When the answer is a choice between known values, ALWAYS pass them as `options` so the user can pick one instead of typing. ' +
			'Set `input_type` to "number" when you expect a numeric answer.',
		inputSchema: z.object({
			question: z.string(),
			options: z
				.array(z.string())
				.max(8)
				.optional()
				.describe('Mutually exclusive answer choices, shown to the user as buttons'),
			input_type: z
				.enum(['text', 'number'])
				.optional()
				.describe('Expected free-form answer type when no option fits'),
		}),
		execute: async function (this: EBAgentCore, input, { signal }) {
			if (!this.onAskUser) {
				throw new Error('ask_user tool requires onAskUser callback to be set')
			}
			const answer = await this.onAskUser(input.question, {
				signal,
				choices: input.options,
				inputType: input.input_type,
			})
			return `User answered: ${answer}`
		},
	})
)

tools.set(
	'identify_image',
	tool({
		description:
			'Analyze the image attached to this task with a vision model and identify what it depicts — ' +
			'a product, medicine, gemstone, garment, or anything else. Returns category, best-guess name, ' +
			'a description, and attributes (e.g. color, brand, material) you can use to decide what to do next ' +
			'(e.g. what to search for). Only available when an image was attached to the task. ' +
			'Call this once, near the start of the task, before taking any other action.',
		inputSchema: z.object({}),
		execute: async function (this: EBAgentCore) {
			const result = await this.identifyImage()
			const attributes = result.attributes
				? Object.entries(result.attributes)
						.map(([key, value]) => `${key}: ${value}`)
						.join(', ')
				: ''
			return (
				`Category: ${result.category}\n` +
				`Identified as: ${result.name}\n` +
				`Description: ${result.description}` +
				(attributes ? `\nAttributes: ${attributes}` : '')
			)
		},
	})
)

tools.set(
	'click_element_by_index',
	tool({
		description: 'Click element by index',
		inputSchema: z.object({
			index: z.int().min(0),
		}),
		execute: async function (this: EBAgentCore, input) {
			const result = await this.pageController.clickElement(input.index)
			return result.message
		},
	})
)

tools.set(
	'input_text',
	tool({
		description: 'Click and type text into an interactive input element',
		inputSchema: z.object({
			index: z.int().min(0),
			text: z.string(),
		}),
		execute: async function (this: EBAgentCore, input) {
			const result = await this.pageController.inputText(input.index, input.text)
			return result.message
		},
	})
)

tools.set(
	'select_dropdown_option',
	tool({
		description:
			'Select dropdown option for interactive element index by the text of the option you want to select',
		inputSchema: z.object({
			index: z.int().min(0),
			text: z.string(),
		}),
		execute: async function (this: EBAgentCore, input) {
			const result = await this.pageController.selectOption(input.index, input.text)
			return result.message
		},
	})
)

/**
 * @note Reference from browser-use
 */
tools.set(
	'scroll',
	tool({
		description:
			'Scroll vertically. Without index: scrolls the document. With index: scrolls the container at that index (or its nearest scrollable ancestor). Use index of a data-scrollable element to scroll a specific area.',
		inputSchema: z.object({
			down: z.boolean().default(true),
			num_pages: z.number().min(0).max(10).optional().default(0.1),
			pixels: z.number().int().min(0).optional(),
			index: z.number().int().min(0).optional(),
		}),
		execute: async function (this: EBAgentCore, input) {
			const result = await this.pageController.scroll({
				...input,
				numPages: input.num_pages,
			})
			return result.message
		},
	})
)

/**
 * @todo Tables need a dedicated parser to extract structured data. This tool is useless.
 */
tools.set(
	'scroll_horizontally',
	tool({
		description:
			'Scroll horizontally. Without index: scrolls the document. With index: scrolls the container at that index (or its nearest scrollable ancestor). Use index of a data-scrollable element to scroll a specific area.',
		inputSchema: z.object({
			right: z.boolean().default(true),
			pixels: z.number().int().min(0),
			index: z.number().int().min(0).optional(),
		}),
		execute: async function (this: EBAgentCore, input) {
			const result = await this.pageController.scrollHorizontally(input)
			return result.message
		},
	})
)

tools.set(
	'execute_javascript',
	tool({
		description:
			'Execute JavaScript code on the current page. Supports async/await syntax. Use with caution! ' +
			'An `AbortSignal` named `signal` is available in scope: long-running async code MUST honor it ' +
			'(e.g. `await fetch(url, { signal })`, or `signal.throwIfAborted()` in loops)',
		inputSchema: z.object({
			script: z.string(),
		}),
		execute: async function (this: EBAgentCore, input, { signal }) {
			const result = await this.pageController.executeJavascript(input.script, signal)
			signal.throwIfAborted()
			return result.message
		},
	})
)

tools.set(
	'send_keys',
	tool({
		description:
			'Send a single key press to element by index. Use this for search boxes and forms that ' +
			'submit on Enter rather than via a separate visible button — after `input_text`, sending ' +
			'"Enter" to the same index is often required to actually trigger the search/submit.',
		inputSchema: z.object({
			index: z.int().min(0),
			key: z.enum([
				'Enter',
				'Tab',
				'Escape',
				'ArrowDown',
				'ArrowUp',
				'ArrowLeft',
				'ArrowRight',
				'Backspace',
				'Delete',
			]),
		}),
		execute: async function (this: EBAgentCore, input) {
			const result = await this.pageController.sendKeys(input.index, input.key)
			return result.message
		},
	})
)

// @todo upload_file
// @todo extract_structured_data
