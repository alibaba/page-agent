/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * JSON Schema ⇄ Zod conversion at the capability boundary.
 *
 * @remarks
 * The capability layer speaks JSON Schema, because that is what WebMCP and MCP
 * exchange. The agent loop speaks Zod, because that is what the existing tool
 * contract and `normalizeResponse`'s action validation are built on. Converting
 * here — rather than teaching either side about the other — keeps both intact.
 */
import type { JSONSchema } from '@eb-agent/capabilities'
import * as z from 'zod/v4'

/**
 * Build a Zod schema from a JSON Schema.
 *
 * Covers the subset tools actually use: objects, strings, numbers, booleans,
 * enums, arrays and `required`. Anything outside it (`$ref`, `oneOf`, tuples)
 * degrades to `z.unknown()` for that node — permissive rather than rejecting a
 * valid call, since the capability itself validates its own input anyway
 * (WebMCP's `executeTool` does, and generated DOM tools check required fields).
 */
export function jsonSchemaToZod(schema: JSONSchema | undefined): z.ZodType {
	if (!schema || typeof schema !== 'object') return z.looseObject({})

	if (Array.isArray(schema.enum) && schema.enum.length > 0) {
		const values = schema.enum.filter((value): value is string => typeof value === 'string')
		if (values.length === schema.enum.length && values.length > 0) {
			return describe(z.enum(values as [string, ...string[]]), schema.description)
		}
		return describe(z.unknown(), schema.description)
	}

	switch (schema.type) {
		case 'string':
			return describe(z.string(), schema.description)

		case 'number':
			return describe(z.number(), schema.description)

		case 'integer':
			return describe(z.int(), schema.description)

		case 'boolean':
			return describe(z.boolean(), schema.description)

		case 'array':
			return describe(z.array(jsonSchemaToZod(schema.items)), schema.description)

		case 'null':
			return describe(z.null(), schema.description)

		case 'object':
		case undefined: {
			if (!schema.properties || typeof schema.properties !== 'object') {
				// No `type` and no `properties` means we cannot model this node —
				// typically `oneOf`/`anyOf`/`$ref`. Accept any value rather than
				// rejecting a call the capability itself would have handled fine.
				if (schema.type === undefined) return describe(z.unknown(), schema.description)

				// A declared object with no properties: accept any object rather than
				// forcing the model to send `{}` for a tool that takes free-form input.
				return describe(z.looseObject({}), schema.description)
			}

			const required = new Set(Array.isArray(schema.required) ? schema.required : [])
			const shape: Record<string, z.ZodType> = {}

			for (const [key, value] of Object.entries(schema.properties)) {
				const field = jsonSchemaToZod(value)
				shape[key] = required.has(key) ? field : field.optional()
			}

			return describe(z.object(shape), schema.description)
		}

		default:
			return describe(z.unknown(), schema.description)
	}
}

/**
 * Convert a Zod schema to JSON Schema for publication through WebMCP.
 * Falls back to a permissive object rather than throwing — a tool that cannot
 * describe itself is still better than a crash during registration.
 */
export function zodToJsonSchema(schema: z.ZodType): JSONSchema {
	try {
		return z.toJSONSchema(schema, { target: 'openapi-3.0' }) as JSONSchema
	} catch (error) {
		console.warn('[capabilities] Could not convert Zod schema to JSON Schema:', error)
		return { type: 'object', properties: {} }
	}
}

function describe(schema: z.ZodType, description?: string): z.ZodType {
	return description ? schema.describe(description) : schema
}
