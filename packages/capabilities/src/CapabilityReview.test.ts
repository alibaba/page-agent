import { describe, expect, it } from 'vitest'

import { CapabilityReviewManager, MemoryReviewStore } from './CapabilityReview'
import type { Capability, CapabilitySource } from './types'

function capability(id: string, source: CapabilitySource): Capability {
	return {
		id,
		name: id,
		description: `Does ${id}`,
		inputSchema: { type: 'object', properties: {} },
		source,
		executionType: source === 'native_webmcp' ? 'webmcp' : 'dom',
		risk: 'read',
		confidence: source === 'dom' ? 0.7 : 1,
		execute: async () => ({ content: 'ok' }),
	}
}

describe('CapabilityReviewManager', () => {
	it('treats declared capabilities as already approved', async () => {
		const manager = new CapabilityReviewManager(new MemoryReviewStore())
		await manager.load()

		expect(manager.stateOf(capability('a', 'native_webmcp'))).toBe('approved')
		expect(manager.stateOf(capability('b', 'developer_defined'))).toBe('approved')
		expect(manager.stateOf(capability('c', 'remote_mcp'))).toBe('approved')
	})

	it('holds inferred capabilities pending until a human looks', async () => {
		const manager = new CapabilityReviewManager(new MemoryReviewStore())
		await manager.load()

		expect(manager.stateOf(capability('d', 'dom'))).toBe('pending')
		expect(manager.stateOf(capability('e', 'api'))).toBe('pending')
	})

	it('records and persists a decision', async () => {
		const store = new MemoryReviewStore()
		const manager = new CapabilityReviewManager(store)
		await manager.load()

		await manager.set('dom:search', 'approved')

		const reloaded = new CapabilityReviewManager(store)
		await reloaded.load()

		expect(reloaded.get('dom:search')?.state).toBe('approved')
	})

	it('applies customer edits to name, description and risk', async () => {
		const manager = new CapabilityReviewManager(new MemoryReviewStore())
		await manager.load()

		const original = capability('dom:update_coupon', 'dom')
		await manager.set(original.id, 'approved', {
			name: 'apply_coupon',
			description: 'Apply a discount code',
			risk: 'consequential',
		})

		const edited = manager.applyEdits(original)

		expect(edited.name).toBe('apply_coupon')
		expect(edited.description).toBe('Apply a discount code')
		expect(edited.risk).toBe('consequential')
		// The original object is untouched.
		expect(original.name).toBe('dom:update_coupon')
	})

	it('leaves an unedited capability exactly as it was', async () => {
		const manager = new CapabilityReviewManager(new MemoryReviewStore())
		await manager.load()

		const original = capability('dom:search', 'dom')
		expect(manager.applyEdits(original)).toBe(original)
	})

	it('summarizes the inventory for the dashboard', async () => {
		const manager = new CapabilityReviewManager(new MemoryReviewStore())
		await manager.load()

		const capabilities = [
			capability('native', 'native_webmcp'),
			capability('generated1', 'dom'),
			capability('generated2', 'dom'),
		]

		await manager.set('generated2', 'rejected')

		expect(manager.summarize(capabilities)).toEqual({
			discovered: 3,
			approved: 1,
			pending: 1,
			rejected: 1,
		})
	})

	it('emits a change event so the dashboard can repaint', async () => {
		const manager = new CapabilityReviewManager(new MemoryReviewStore())
		await manager.load()

		let changes = 0
		manager.addEventListener('change', () => changes++)

		await manager.set('dom:x', 'approved')
		await manager.clear('dom:x')

		expect(changes).toBe(2)
	})
})
