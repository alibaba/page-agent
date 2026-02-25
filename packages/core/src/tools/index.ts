/**
 * Internal tools for PageAgent.
 * @note Adapted from browser-use
 */
import * as z from 'zod'

import type { PageAgentCore } from '../PageAgentCore'
import { waitFor } from '../utils'

/**
 * Internal tool definition that has access to PageAgent `this` context
 */
export interface PageAgentTool<TParams = any> {
	// name: string
	description: string
	inputSchema: z.ZodType<TParams>
	execute: (this: PageAgentCore, args: TParams) => Promise<string>
}

export function tool<TParams>(options: PageAgentTool<TParams>): PageAgentTool<TParams> {
	return options
}

/**
 * Internal tools for PageAgent.
 * Note: Using any to allow different parameter types for each tool
 */
export const tools = new Map<string, PageAgentTool>()

tools.set(
	'done',
	tool({
		description:
			'Complete task. Text is your final response to the user — keep it concise unless the user explicitly asks for detail.',
		inputSchema: z.object({
			text: z.string(),
			success: z.boolean().default(true),
		}),
		execute: async function (this: PageAgentCore, input) {
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
		execute: async function (this: PageAgentCore, input) {
			// try to subtract LLM calling time from the actual wait time
			const lastTimeUpdate = await this.pageController.getLastUpdateTime()
			const actualWaitTime = Math.max(0, input.seconds - (Date.now() - lastTimeUpdate) / 1000)
			console.log(`actualWaitTime: ${actualWaitTime} seconds`)
			await waitFor(actualWaitTime)

			return `✅ Waited for ${input.seconds} seconds.`
		},
	})
)

tools.set(
	'ask_user',
	tool({
		description:
			'Ask the user a question and wait for their answer. Use this if you need more information or clarification.',
		inputSchema: z.object({
			question: z.string(),
		}),
		execute: async function (this: PageAgentCore, input) {
			if (!this.onAskUser) {
				throw new Error('ask_user tool requires onAskUser callback to be set')
			}
			const answer = await this.onAskUser(input.question)
			return `User answered: ${answer}`
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
		execute: async function (this: PageAgentCore, input) {
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
		execute: async function (this: PageAgentCore, input) {
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
		execute: async function (this: PageAgentCore, input) {
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
		description: 'Scroll the page vertically. Use index for scroll elements (dropdowns/custom UI).',
		inputSchema: z.object({
			down: z.boolean().default(true),
			num_pages: z.number().min(0).max(10).optional().default(0.1),
			pixels: z.number().int().min(0).optional(),
			index: z.number().int().min(0).optional(),
		}),
		execute: async function (this: PageAgentCore, input) {
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
			'Scroll the page horizontally, or within a specific element by index. Useful for wide tables.',
		inputSchema: z.object({
			right: z.boolean().default(true),
			pixels: z.number().int().min(0),
			index: z.number().int().min(0).optional(),
		}),
		execute: async function (this: PageAgentCore, input) {
			const result = await this.pageController.scrollHorizontally(input)
			return result.message
		},
	})
)

tools.set(
	'execute_javascript',
	tool({
		description:
			'Execute JavaScript code on the current page. Supports async/await syntax. Use with caution!',
		inputSchema: z.object({
			script: z.string(),
		}),
		execute: async function (this: PageAgentCore, input) {
			const result = await this.pageController.executeJavascript(input.script)
			return result.message
		},
	})
)

// @todo send_keys
// @todo upload_file
// @todo go_back
// @todo extract_structured_data
