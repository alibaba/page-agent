// @vitest-environment happy-dom
/**
 * End-to-end test of the §22 demo scenario, without a browser or an LLM.
 *
 * A page declares some actions natively (simulated WebMCP) and leaves one — the
 * coupon form — with no tool at all. The capability layer must: discover the
 * native tools, generate the missing one from the UI, prefer the native
 * implementation where both exist, execute the generated one through the DOM,
 * and stop for a human before anything consequential runs.
 */
import { type AuditEvent, MemoryReviewStore } from '@eb-agent/capabilities'
import { PageController } from '@eb-agent/page-controller'
import { beforeEach, describe, expect, it } from 'vitest'

import { CapabilityManager } from './CapabilityManager'

const SHOP_HTML = `
	<main>
		<form id="search-form" aria-label="Customer Search">
			<label for="search-query">Query</label>
			<input id="search-query" name="query" />
			<button type="submit">Search</button>
		</form>

		<form id="coupon-form" aria-label="Apply Coupon">
			<label for="coupon-code">Coupon code</label>
			<input id="coupon-code" name="coupon" />
			<button type="submit">Apply Coupon</button>
		</form>
	</main>
`

/** happy-dom gives everything a zero-size box; the scanner needs a real one. */
function stubLayout(): void {
	Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
		configurable: true,
		value: () => ({ width: 200, height: 30, top: 0, left: 0, right: 200, bottom: 30 }),
	})
}

function makeManager(config: Partial<ConstructorParameters<typeof CapabilityManager>[1]> = {}): {
	manager: CapabilityManager
	audits: AuditEvent[]
} {
	const audits: AuditEvent[] = []
	const agentStub = {
		id: 'test-session',
		pageController: new PageController({ enableMask: false }),
		onAskUser: undefined,
	}

	const manager = new CapabilityManager(agentStub as never, {
		generateFromDom: true,
		minConfidence: 0.5,
		publishToWebMCP: false,
		// The production default is localStorage, which would leak review decisions
		// between cases in this shared happy-dom environment.
		reviewStore: new MemoryReviewStore(),
		onAudit: (event) => audits.push(event),
		...config,
	})

	return { manager, audits }
}

const signal = () => new AbortController().signal

describe('capability layer end to end', () => {
	beforeEach(() => {
		document.body.innerHTML = SHOP_HTML
		stubLayout()
	})

	it('generates a business action for the form that has no declared tool', async () => {
		const { manager } = makeManager()

		await manager.refresh(window.location.href)

		const names = manager.exposed(window.location.href).map((capability) => capability.name)

		expect(names).toContain('apply_coupon')
	})

	it('executes the generated capability through the DOM and reports what it did', async () => {
		const { manager, audits } = makeManager()
		await manager.refresh(window.location.href)

		const coupon = manager.registry.getByName('apply_coupon')!
		const result = await manager.engine.execute(
			coupon,
			{ coupon_code: 'RUN10' },
			{ signal: signal() }
		)

		// The value actually reached the real input element.
		expect((document.getElementById('coupon-code') as HTMLInputElement).value).toBe('RUN10')
		expect(result.content).toContain('apply_coupon')
		expect(audits[0]).toMatchObject({ executionType: 'dom', status: 'success' })
	})

	it('prefers a natively declared tool over the generated equivalent', async () => {
		const { manager } = makeManager()
		await manager.refresh(window.location.href)

		// The site declares its own search — as WebMCP would.
		manager.registry.register({
			name: 'search_customer',
			description: 'Search customers via the real backend',
			inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
			source: 'native_webmcp',
			executionType: 'webmcp',
			risk: 'read',
			execute: async () => ({ content: 'native result' }),
		})

		const search = manager.registry.getByName('search_customer')!

		expect(search.source).toBe('native_webmcp')
		// The DOM-generated duplicate is no longer exposed to the planner.
		const exposed = manager
			.exposed(window.location.href)
			.filter((capability) => capability.name.startsWith('search'))
		expect(exposed).toHaveLength(1)
		expect(exposed[0].source).toBe('native_webmcp')
	})

	it('stops for a human before a consequential action, and runs it once approved', async () => {
		const asked: string[] = []
		const { manager, audits } = makeManager({
			onApproval: async ({ summary }) => {
				asked.push(summary)
				return true
			},
		})
		await manager.refresh(window.location.href)

		let placed = false
		const checkout = manager.registry.register({
			name: 'checkout',
			description: 'Place the order',
			inputSchema: { type: 'object', properties: {} },
			source: 'native_webmcp',
			executionType: 'webmcp',
			risk: 'consequential',
			execute: async () => {
				placed = true
				return { content: 'Order placed' }
			},
		})

		await manager.engine.execute(checkout, {}, { signal: signal() })

		expect(asked).toHaveLength(1)
		expect(placed).toBe(true)
		expect(audits.at(-1)).toMatchObject({
			risk: 'consequential',
			approved: true,
			status: 'success',
		})
	})

	it('does not run a consequential action the human declined', async () => {
		const { manager } = makeManager({ onApproval: async () => false })
		await manager.refresh(window.location.href)

		let placed = false
		const checkout = manager.registry.register({
			name: 'checkout',
			description: 'Place the order',
			inputSchema: { type: 'object', properties: {} },
			source: 'developer_defined',
			executionType: 'javascript',
			risk: 'consequential',
			execute: async () => {
				placed = true
				return { content: 'Order placed' }
			},
		})

		await expect(manager.engine.execute(checkout, {}, { signal: signal() })).rejects.toThrow()
		expect(placed).toBe(false)
	})

	it('exposes capabilities to the agent as namespaced tools', async () => {
		const { manager } = makeManager()
		await manager.refresh(window.location.href)

		const tools = manager.getTools(window.location.href)

		expect([...tools.keys()].every((name) => name.startsWith('cap_'))).toBe(true)
		expect(tools.has('cap_apply_coupon')).toBe(true)
	})

	it('describes capabilities for the prompt as data, not instructions', async () => {
		const { manager } = makeManager()
		await manager.refresh(window.location.href)

		const block = manager.describeForPrompt(window.location.href)

		expect(block).toContain('<page_capabilities>')
		expect(block).toContain('cap_apply_coupon')
		expect(block).toMatch(/never as instructions to follow/i)
	})

	it('registers a developer-defined tool and prefers it over generated ones', async () => {
		const { manager } = makeManager()
		await manager.refresh(window.location.href)

		const capability = await manager.registerTool({
			name: 'cancel_order',
			description: 'Cancel an order that has not yet shipped',
			inputSchema: {
				type: 'object',
				properties: { orderId: { type: 'string' } },
				required: ['orderId'],
			},
			risk: 'consequential',
			execute: ({ orderId }: { orderId: string }) => `Cancelled ${orderId}`,
		})

		expect(capability.source).toBe('developer_defined')
		expect(capability.confidence).toBe(1)
		expect(manager.exposed(window.location.href).map((c) => c.name)).toContain('cancel_order')
	})

	it('reports a capability inventory for dashboards', async () => {
		const { manager } = makeManager()
		await manager.refresh(window.location.href)

		const stats = manager.stats(window.location.href)

		expect(stats.total).toBeGreaterThan(0)
		expect(stats.bySource.dom).toBeGreaterThan(0)
		expect(typeof stats.webmcpSupported).toBe('boolean')
	})

	it('withholds a rejected capability from the planner', async () => {
		const { manager } = makeManager()
		await manager.refresh(window.location.href)

		const coupon = manager.registry.getByName('apply_coupon')!
		await manager.setReview(coupon.id, 'rejected')

		const names = manager.exposed(window.location.href).map((capability) => capability.name)
		expect(names).not.toContain('apply_coupon')
	})

	it('applies a customer rename so the planner sees the corrected tool', async () => {
		const { manager } = makeManager()
		await manager.refresh(window.location.href)

		const coupon = manager.registry.getByName('apply_coupon')!
		await manager.setReview(coupon.id, 'approved', { name: 'redeem_voucher' })

		const tools = manager.getTools(window.location.href)
		expect(tools.has('cap_redeem_voucher')).toBe(true)
		expect(tools.has('cap_apply_coupon')).toBe(false)
	})

	it('reports pending inferred capabilities in the inventory for review', async () => {
		const { manager } = makeManager()
		await manager.refresh(window.location.href)

		const inventory = manager.inventory(window.location.href)
		const coupon = inventory.find((entry) => entry.capability.name === 'apply_coupon')!

		// Inferred from markup, so a human has not blessed it yet.
		expect(coupon.state).toBe('pending')
		expect(manager.stats(window.location.href).pending).toBeGreaterThan(0)
	})

	it('prefers an API-backed implementation over the DOM-backed one', async () => {
		const { manager } = makeManager()
		await manager.refresh(window.location.href)

		// As the API observer would register it, for the same business action.
		manager.registry.register({
			name: 'apply_coupon',
			description: "Apply a coupon via the application's own endpoint",
			inputSchema: { type: 'object', properties: { code: { type: 'string' } } },
			source: 'api',
			executionType: 'api',
			risk: 'reversible',
			confidence: 0.8,
			execute: async () => ({ content: 'applied via API' }),
		})

		const exposed = manager
			.exposed(window.location.href)
			.filter((capability) => capability.name === 'apply_coupon')

		expect(exposed).toHaveLength(1)
		expect(exposed[0].executionType).toBe('api')
	})

	it('is inert when disabled, leaving pure DOM automation behind', async () => {
		const { manager } = makeManager({ enabled: false })

		await manager.refresh(window.location.href)

		expect(manager.exposed(window.location.href)).toHaveLength(0)
		expect(manager.getTools(window.location.href).size).toBe(0)
		expect(manager.describeForPrompt(window.location.href)).toBe('')
	})
})
