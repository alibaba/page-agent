import { describe, expect, it } from 'vitest'

import { CapabilityRegistry } from './CapabilityRegistry'
import { CapabilityResolver } from './CapabilityResolver'
import type { CapabilitySource } from './types'

function registryWith(names: [string, CapabilitySource][]): CapabilityRegistry {
	const registry = new CapabilityRegistry()
	for (const [name, source] of names) {
		registry.register({
			name,
			description: `Perform ${name.replace(/_/g, ' ')}`,
			inputSchema: { type: 'object', properties: {} },
			source,
			executionType: source === 'native_webmcp' ? 'webmcp' : 'dom',
			risk: 'read',
			execute: async () => ({ content: 'ok' }),
		})
	}
	return registry
}

describe('CapabilityResolver', () => {
	it('matches an exact name', () => {
		const resolver = new CapabilityResolver(registryWith([['search_customer', 'native_webmcp']]))

		const resolution = resolver.resolve('search_customer')

		expect(resolution).toMatchObject({ kind: 'capability', matchedBy: 'name' })
	})

	it('matches a synonym of the same business action', () => {
		const resolver = new CapabilityResolver(registryWith([['create_customer', 'native_webmcp']]))

		const resolution = resolver.resolve('add_customer')

		expect(resolution).toMatchObject({ kind: 'capability', matchedBy: 'action' })
	})

	it('falls back to DOM automation when nothing matches', () => {
		const resolver = new CapabilityResolver(registryWith([['search_customer', 'native_webmcp']]))

		const resolution = resolver.resolve('apply_coupon')

		expect(resolution.kind).toBe('dom_fallback')
	})

	it('falls back rather than guessing when the registry is empty', () => {
		const resolver = new CapabilityResolver(new CapabilityRegistry())

		expect(resolver.resolve('anything').kind).toBe('dom_fallback')
	})

	it('picks the higher-priority implementation of a duplicated action', () => {
		const resolver = new CapabilityResolver(
			registryWith([
				['add_customer', 'dom'],
				['create_customer', 'native_webmcp'],
			])
		)

		const resolution = resolver.resolve('create_customer')

		expect(resolution.kind).toBe('capability')
		if (resolution.kind === 'capability') {
			expect(resolution.capability.source).toBe('native_webmcp')
		}
	})
})
