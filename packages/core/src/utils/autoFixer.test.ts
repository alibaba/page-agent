import { InvokeError, InvokeErrorTypes } from '@eb-agent/llms'
import { describe, expect, it } from 'vitest'

import { normalizeResponse } from './autoFixer'

function toolCallResponse(argumentsString: string) {
	return {
		choices: [
			{
				message: {
					tool_calls: [{ function: { name: 'AgentOutput', arguments: argumentsString } }],
				},
			},
		],
	}
}

describe('normalizeResponse', () => {
	it('repairs and recovers a real-world malformed tool_call response instead of crashing or forcing a retry', () => {
		// Reproduces a real model output: an unquoted string value breaks JSON
		// syntax (`"evaluation_previous_goal": Input the task subject...` has no
		// opening/closing quotes around the value). Before the fix, safeJsonParse
		// silently kept this as a raw string and a later `.action = ...` write
		// threw an opaque native TypeError ("Cannot create property 'action' on
		// string ...") that escaped uncaught and aborted the entire agent run.
		// jsonrepair fixes this class of near-JSON mistake in place, so the step
		// succeeds on the first try instead of burning retries (and, if the model
		// keeps making the same mistake, exhausting them and stalling the run).
		const malformed =
			'{"evaluation_previous_goal": Input the task subject for the follow-up task for Westfield Digital lead. Success., "memory": "test", "next_goal": "Set the Due Date field.", "action": {"input_text": {"index": 5, "text": "21/08/2026"}}}'

		const result = normalizeResponse(toolCallResponse(malformed))
		const args = JSON.parse(result.choices[0].message.tool_calls[0].function.arguments)

		expect(args.evaluation_previous_goal).toBe(
			'Input the task subject for the follow-up task for Westfield Digital lead. Success.'
		)
		expect(args.action).toEqual({ input_text: { index: 5, text: '21/08/2026' } })
	})

	it('repairs JSON wrapped in prose/code fences, which jsonrepair alone cannot handle', () => {
		// Some models wrap tool_call arguments in a markdown code fence or add
		// leading/trailing commentary. jsonrepair expects its input to already be
		// JSON-shaped, so this needs the {...} extraction fallback in safeJsonParse.
		const fenced =
			'Here is the tool call:\n```json\n{"evaluation_previous_goal": "Success.", "memory": "m", "next_goal": "n", "action": {"wait": {"seconds": 1}}}\n```'

		const result = normalizeResponse(toolCallResponse(fenced))
		const args = JSON.parse(result.choices[0].message.tool_calls[0].function.arguments)

		expect(args.action).toEqual({ wait: { seconds: 1 } })
	})

	it('throws a retryable InvokeError instead of crashing when arguments are unrepairable garbage', () => {
		const garbage = '{{{{{ this is not json at all ][['

		let caught: unknown
		try {
			normalizeResponse(toolCallResponse(garbage))
		} catch (error) {
			caught = error
		}

		expect(caught).toBeInstanceOf(InvokeError)
		expect((caught as InvokeError).type).toBe(InvokeErrorTypes.INVALID_TOOL_ARGS)
		expect((caught as InvokeError).retryable).toBe(true)
	})

	it('still normalizes well-formed tool_call arguments', () => {
		const valid = JSON.stringify({
			evaluation_previous_goal: 'Success.',
			memory: 'test',
			next_goal: 'Click submit.',
			action: { click_element_by_index: { index: 3 } },
		})

		const result = normalizeResponse(toolCallResponse(valid))
		const args = JSON.parse(result.choices[0].message.tool_calls[0].function.arguments)

		expect(args.action).toEqual({ click_element_by_index: { index: 3 } })
	})
})
