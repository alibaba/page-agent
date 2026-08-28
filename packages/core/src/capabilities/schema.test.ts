import { describe, expect, it } from 'vitest'
import * as z from 'zod/v4'

import { jsonSchemaToZod, zodToJsonSchema } from './schema'

describe('jsonSchemaToZod', () => {
	it('enforces required fields so a malformed action is caught before dispatch', () => {
		const schema = jsonSchemaToZod({
			type: 'object',
			properties: { orderId: { type: 'string' } },
			required: ['orderId'],
		})

		expect(schema.safeParse({ orderId: 'ORD-1' }).success).toBe(true)
		expect(schema.safeParse({}).success).toBe(false)
	})

	it('leaves optional fields optional', () => {
		const schema = jsonSchemaToZod({
			type: 'object',
			properties: { query: { type: 'string' }, page: { type: 'number' } },
			required: ['query'],
		})

		expect(schema.safeParse({ query: 'a' }).success).toBe(true)
		expect(schema.safeParse({ query: 'a', page: 2 }).success).toBe(true)
		expect(schema.safeParse({ page: 2 }).success).toBe(false)
	})

	it('supports enums, arrays, booleans and integers', () => {
		const schema = jsonSchemaToZod({
			type: 'object',
			properties: {
				status: { type: 'string', enum: ['Active', 'Inactive'] },
				tags: { type: 'array', items: { type: 'string' } },
				confirmed: { type: 'boolean' },
				count: { type: 'integer' },
			},
			required: ['status'],
		})

		expect(
			schema.safeParse({ status: 'Active', tags: ['a'], confirmed: true, count: 3 }).success
		).toBe(true)
		expect(schema.safeParse({ status: 'Unknown' }).success).toBe(false)
		expect(schema.safeParse({ status: 'Active', count: 1.5 }).success).toBe(false)
	})

	it('accepts anything for a schema with no declared properties', () => {
		expect(jsonSchemaToZod({ type: 'object' }).safeParse({ whatever: 1 }).success).toBe(true)
		expect(jsonSchemaToZod(undefined).safeParse({ whatever: 1 }).success).toBe(true)
	})

	it('degrades to permissive rather than rejecting unsupported constructs', () => {
		const schema = jsonSchemaToZod({
			type: 'object',
			properties: { weird: { oneOf: [{ type: 'string' }, { type: 'number' }] } },
		})

		expect(schema.safeParse({ weird: 'a' }).success).toBe(true)
		expect(schema.safeParse({ weird: 1 }).success).toBe(true)
	})

	it('survives a round trip through JSON Schema', () => {
		const original = z.object({ query: z.string(), limit: z.number().optional() })
		const roundTripped = jsonSchemaToZod(zodToJsonSchema(original))

		expect(roundTripped.safeParse({ query: 'a' }).success).toBe(true)
		expect(roundTripped.safeParse({ limit: 5 }).success).toBe(false)
	})

	it('produces a schema the LLM tool layer can serialize', () => {
		const schema = jsonSchemaToZod({
			type: 'object',
			properties: { query: { type: 'string', description: 'Search text' } },
			required: ['query'],
		})

		const json = z.toJSONSchema(schema, { target: 'openapi-3.0' }) as unknown as {
			properties: { query: { description?: string } }
			required?: string[]
		}

		expect(json.properties.query.description).toBe('Search text')
		expect(json.required).toEqual(['query'])
	})
})
