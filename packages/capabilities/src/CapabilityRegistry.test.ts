import { describe, expect, it } from 'vitest'

import { CapabilityRegistry } from './CapabilityRegistry'
import type { CapabilityInput, CapabilitySource } from './types'

function makeCapability(
	name: string,
	source: CapabilitySource,
	overrides: Partial<CapabilityInput> = {}
): CapabilityInput {
	return {
		name,
		description: `Does ${name}`,
		inputSchema: { type: 'object', properties: {} },
		source,
		executionType: source === 'native_webmcp' ? 'webmcp' : 'dom',
		risk: 'read',
		execute: async () => ({ content: `${name} ran` }),
		...overrides,
	}
}

describe('CapabilityRegistry', () => {
	it('normalizes names and fills in defaults', () => {
		const registry = new CapabilityRegistry()

		const capability = registry.register(makeCapability('Search Customers!', 'dom'))

		expect(capability.name).toBe('search_customers')
		expect(capability.id).toBe('dom:search_customers')
		expect(capability.confidence).toBe(1)
	})

	it('caps site-authored descriptions at the documented budget', () => {
		const registry = new CapabilityRegistry()

		const capability = registry.register(
			makeCapability('search', 'native_webmcp', { description: 'x'.repeat(900) })
		)

		expect(capability.description.length).toBeLessThanOrEqual(503) // 500 + '...'
	})

	it('prefers a natively declared tool over an equivalent generated one', () => {
		const registry = new CapabilityRegistry()

		registry.register(makeCapability('add_customer', 'dom', { confidence: 0.9 }))
		registry.register(makeCapability('create_customer', 'native_webmcp'))

		const exposed = registry.list()

		expect(exposed).toHaveLength(1)
		expect(exposed[0].source).toBe('native_webmcp')
		expect(exposed[0].name).toBe('create_customer')
	})

	it('keeps genuinely different actions on the same object', () => {
		const registry = new CapabilityRegistry()

		registry.register(makeCapability('create_customer', 'dom'))
		registry.register(makeCapability('delete_customer', 'dom'))
		registry.register(makeCapability('search_customer', 'dom'))

		expect(
			registry
				.list()
				.map((capability) => capability.name)
				.sort()
		).toEqual(['create_customer', 'delete_customer', 'search_customer'])
	})

	it('reports what deduplication hid, and why', () => {
		const registry = new CapabilityRegistry()

		registry.register(makeCapability('add_customer', 'dom'))
		registry.register(makeCapability('create_customer', 'native_webmcp'))

		const shadowed = registry.shadowed()

		expect(shadowed).toHaveLength(1)
		expect(shadowed[0].capability.name).toBe('add_customer')
		expect(shadowed[0].shadowedBy.name).toBe('create_customer')
	})

	it('hides capabilities below the confidence floor', () => {
		const registry = new CapabilityRegistry()

		registry.register(makeCapability('search_orders', 'dom', { confidence: 0.4 }))
		registry.register(makeCapability('list_invoices', 'dom', { confidence: 0.8 }))

		const exposed = registry.list({ minConfidence: 0.6 })

		expect(exposed.map((capability) => capability.name)).toEqual(['list_invoices'])
	})

	it('scopes capabilities to the page they were found on', () => {
		const registry = new CapabilityRegistry()

		registry.register(makeCapability('search_orders', 'dom', { page: 'https://a.example/orders' }))
		registry.register(makeCapability('list_invoices', 'dom', { page: 'https://a.example/billing' }))

		const exposed = registry.list({ page: 'https://a.example/orders' })

		expect(exposed.map((capability) => capability.name)).toEqual(['search_orders'])
	})

	it('refreshes one source without disturbing developer-defined tools', () => {
		const registry = new CapabilityRegistry()

		registry.register(makeCapability('cancel_order', 'developer_defined'))
		registry.register(makeCapability('search_products', 'dom'))

		registry.unregisterBySource('dom')

		expect(registry.all().map((capability) => capability.name)).toEqual(['cancel_order'])
	})

	it('emits a change event when the exposed set changes', () => {
		const registry = new CapabilityRegistry()
		let changes = 0
		registry.addEventListener('change', () => changes++)

		registry.register(makeCapability('search_products', 'dom'))
		registry.unregister('dom:search_products')

		expect(changes).toBe(2)
	})
})
