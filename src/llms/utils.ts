/**
 * Utility functions for LLM integration
 */
import { z } from 'zod'

import type { Tool } from './types'

/**
 * Convert Zod schema to OpenAI tool format
 * Uses Zod 4 native z.toJSONSchema()
 */
export function zodToOpenAITool(name: string, tool: Tool) {
	return {
		type: 'function' as const,
		function: {
			name,
			description: tool.description,
			parameters: z.toJSONSchema(tool.inputSchema, { target: 'openapi-3.0' }),
		},
	}
}
