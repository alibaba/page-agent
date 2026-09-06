import { describe, expect, it } from 'vitest'

import { normalizeResponse } from './autoFixer'

function toolCallResponse(args: string, name = 'AgentOutput') {
	return {
		choices: [{ message: { tool_calls: [{ function: { name, arguments: args } }] } }],
	}
}

function resolvedAction(response: any) {
	return JSON.parse(response.choices[0].message.tool_calls[0].function.arguments).action
}

describe('normalizeResponse', () => {
	it('keeps a well-formed response', () => {
		const response = toolCallResponse(JSON.stringify({ action: { wait: { seconds: 2 } } }))
		expect(resolvedAction(normalizeResponse(response))).toEqual({ wait: { seconds: 2 } })
	})

	// A model that answers with something other than an object used to crash the
	// fixer: reading `.action` off null throws, and assigning it to a primitive
	// throws too, because the module is strict-mode code.
	it.each(['null', '123', '"text"', 'true', '[1, 2]'])(
		'falls back to wait for non-object arguments (%s)',
		(args) => {
			const response = toolCallResponse(args)
			expect(() => normalizeResponse(response)).not.toThrow()
			expect(resolvedAction(normalizeResponse(response))).toEqual({ wait: { seconds: 1 } })
		}
	)

	// `{"type":"function"}` without the `function` key reached
	// `resolvedArguments.function.arguments`.
	it('tolerates a function wrapper with no function body', () => {
		const response = { choices: [{ message: { content: '{"type":"function"}' } }] }
		expect(() => normalizeResponse(response)).not.toThrow()
		expect(resolvedAction(normalizeResponse(response))).toEqual({ wait: { seconds: 1 } })
	})
})
