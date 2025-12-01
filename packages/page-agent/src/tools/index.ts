/**
 * Internal tools for PageAgent.
 * @note Adapted from browser-use
 */
import zod, { type z } from 'zod'

import type { PageAgent } from '../PageAgent'
import {
	clickElement,
	getElementByIndex,
	getSystemInfo,
	inputTextElement,
	scrollHorizontally,
	scrollVertically,
	selectOptionElement,
	waitFor,
} from './actions'
// debug
import * as utils from './actions'

// @ts-expect-error debug only
window.utils = utils

/**
 * Internal tool definition that has access to PageAgent `this` context
 */
export interface PageAgentTool<TParams = any> {
	// name: string
	description: string
	inputSchema: z.ZodType<TParams>
	execute: (this: PageAgent, args: TParams) => Promise<string>
}

export function tool<TParams>(options: PageAgentTool<TParams>): PageAgentTool<TParams> {
	return options
}

/**
 * Internal tools for PageAgent.
 * Note: Using any to allow different parameter types for each tool
 */
export const tools = new Map<string, PageAgentTool>()

// tools.set(
// 	'get_current_html',
// 	tool({
// 		description: 'Get the current (updated) simplified HTML of the page',
// 		inputSchema: zod.object({}),
// 		execute: function (this: PageAgent) {
// 			this.updateTree()
// 			return this.simplifiedHTML
// 		},
// 	})
// )

tools.set(
	'done',
	tool({
		description:
			'Complete task - provide a summary of results for the user. Set success=True if task completed successfully, false otherwise. Text should be your response to the user summarizing results.',
		inputSchema: zod.object({
			text: zod.string(),
			success: zod.boolean().default(true),
		}),
		execute: async function (this: PageAgent, input) {
			// @note main loop will handle this one
			// this.onDone(input.text, input.success)
			return Promise.resolve('Task completed')
		},
	})
)

tools.set(
	'wait',
	tool({
		description:
			'Wait for x seconds. default 1s (max 10 seconds, min 1 second). This can be used to wait until the page or data is fully loaded.',
		inputSchema: zod.object({
			seconds: zod.number().min(1).max(10).default(1),
		}),
		execute: async function (this: PageAgent, input) {
			const lastTimeUpdate = this.lastTimeUpdate
			const actualWaitTime = Math.max(0, input.seconds - (Date.now() - lastTimeUpdate) / 1000)
			console.log(`actualWaitTime: ${actualWaitTime} seconds`)
			await waitFor(actualWaitTime)
			return `✅ Waited for ${input.seconds} seconds.` + (await getSystemInfo())
		},
	})
)

tools.set(
	'ask_user',
	tool({
		description:
			'Ask the user a question and wait for their answer. Use this if you need more information or clarification.',
		inputSchema: zod.object({
			question: zod.string(),
		}),
		execute: async function (this: PageAgent, input) {
			const answer = await this.panel.askUser(input.question)
			return `✅ Received user answer: ${answer}` + (await getSystemInfo())
		},
	})
)

tools.set(
	'click_element_by_index',
	tool({
		description: 'Click element by index',
		inputSchema: zod.object({
			index: zod.int().min(0),
		}),
		execute: async function (this: PageAgent, input) {
			const element = getElementByIndex(this, input.index)
			const elemText = this.elementTextMap.get(input.index)
			await clickElement(element)

			// @workaround: Handle links that open in new tabs
			if (element instanceof HTMLAnchorElement && element.target === '_blank') {
				return `⚠️ Clicked link that opens in a new tab (${elemText ? elemText : input.index}). You are not capable of reading new tabs.`
			}

			return `✅ Clicked element (${elemText ? elemText : input.index}).` + (await getSystemInfo())
		},
	})
)

tools.set(
	'input_text',
	tool({
		description: 'Click and input text into a input interactive element',
		inputSchema: zod.object({
			index: zod.int().min(0),
			text: zod.string(),
		}),
		execute: async function (this: PageAgent, input) {
			const element = getElementByIndex(this, input.index)
			const elemText = this.elementTextMap.get(input.index)
			await inputTextElement(element, input.text)
			return (
				`✅ Input text (${input.text}) into element (${elemText ? elemText : input.index}).` +
				(await getSystemInfo())
			)
		},
	})
)

tools.set(
	'select_dropdown_option',
	tool({
		description:
			'Select dropdown option for interactive element index by the text of the option you want to select',
		inputSchema: zod.object({
			index: zod.int().min(0),
			text: zod.string(),
		}),
		execute: async function (this: PageAgent, input) {
			const element = getElementByIndex(this, input.index)
			const elemText = this.elementTextMap.get(input.index)
			await selectOptionElement(element as HTMLSelectElement, input.text)
			return (
				`✅ Selected option (${input.text}) in element (${elemText ? elemText : input.index}).` +
				(await getSystemInfo())
			)
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
			'Scroll the page by specified number of pages (set down=True to scroll down, down=False to scroll up, num_pages=number of pages to scroll like 0.5 for half page, 1.0 for one page, etc.). Optional index parameter to scroll within a specific element or its scroll container (works well for dropdowns and custom UI components). Optional pixels parameter to scroll by a specific number of pixels instead of pages.',
		inputSchema: zod.object({
			down: zod.boolean().default(true),
			num_pages: zod.number().min(0).max(10).optional().default(0.1),
			pixels: zod.number().int().min(0).optional(),
			index: zod.number().int().min(0).optional(),
		}),
		execute: async function (this: PageAgent, input) {
			const { down, num_pages, index, pixels } = input

			const scroll_amount = pixels ? pixels : num_pages * (down ? 1 : -1) * window.innerHeight

			const element = index !== undefined ? getElementByIndex(this, index) : null

			return (await scrollVertically(down, scroll_amount, element)) + (await getSystemInfo())
		},
	})
)

tools.set(
	'scroll_horizontally',
	tool({
		description:
			'Scroll the page or element horizontally (set right=True to scroll right, right=False to scroll left, pixels=number of pixels to scroll). Optional index parameter to scroll within a specific element or its scroll container (works well for wide tables).',
		inputSchema: zod.object({
			right: zod.boolean().default(true),
			pixels: zod.number().int().min(0),
			index: zod.number().int().min(0).optional(),
		}),
		execute: async function (this: PageAgent, input) {
			const { right, pixels, index } = input

			const scroll_amount = pixels * (right ? 1 : -1)

			const element = index !== undefined ? getElementByIndex(this, index) : null

			return (await scrollHorizontally(right, scroll_amount, element)) + (await getSystemInfo())
		},
	})
)

tools.set(
	'execute_javascript',
	tool({
		description:
			'Execute JavaScript code on the current page. Supports async/await syntax. Use with caution!',
		inputSchema: zod.object({
			script: zod.string(),
		}),
		execute: async function (this: PageAgent, input) {
			try {
				// Wrap script in async function to support await
				const asyncFunction = eval(`(async () => { ${input.script} })`)
				const result = await asyncFunction()
				return `✅ Executed JavaScript. Result: ${result}` + (await getSystemInfo())
			} catch (error) {
				return `❌ Error executing JavaScript: ${error}` + (await getSystemInfo())
			}
		},
	})
)

// @todo get_dropdown_options
// @todo select_dropdown_option
// @todo send_keys
// @todo upload_file
// @todo go_back
// @todo extract_structured_data
