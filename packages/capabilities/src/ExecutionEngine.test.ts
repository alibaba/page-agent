import { describe, expect, it, vi } from 'vitest'

import { CapabilityRegistry } from './CapabilityRegistry'
import { CapabilityDeniedError, ExecutionEngine } from './ExecutionEngine'
import { PolicyEngine } from './PolicyEngine'
import type { AuditEvent, CapabilityInput, PolicyConfig, RiskLevel } from './types'

function setup(
	options: {
		risk?: RiskLevel
		policy?: PolicyConfig
		onApproval?: ExecutionEngineConfigApproval
		execute?: CapabilityInput['execute']
	} = {}
) {
	const registry = new CapabilityRegistry()
	const audits: AuditEvent[] = []

	const capability = registry.register({
		name: 'refund_payment',
		description: 'Refund a payment',
		inputSchema: { type: 'object', properties: { orderId: { type: 'string' } } },
		source: 'developer_defined',
		executionType: 'javascript',
		risk: options.risk ?? 'consequential',
		execute: options.execute ?? (async () => ({ content: 'refunded' })),
	})

	const engine = new ExecutionEngine({
		registry,
		policy: new PolicyEngine(options.policy),
		session: 'session-1',
		onApproval: options.onApproval,
		onAudit: (event) => audits.push(event),
	})

	return { registry, engine, capability, audits }
}

type ExecutionEngineConfigApproval = NonNullable<
	ConstructorParameters<typeof ExecutionEngine>[0]['onApproval']
>

const signal = () => new AbortController().signal

describe('ExecutionEngine', () => {
	it('runs read-only capabilities without asking anyone', async () => {
		const { engine, capability, audits } = setup({ risk: 'read' })

		const result = await engine.execute(capability, {}, { signal: signal() })

		expect(result.content).toBe('refunded')
		expect(audits[0].status).toBe('success')
		expect(audits[0].approved).toBeUndefined()
	})

	it('requires approval before a consequential capability runs', async () => {
		let summary = ''
		let asked = 0
		const onApproval: ExecutionEngineConfigApproval = async (request) => {
			asked++
			summary = request.summary
			return true
		}
		const { engine, capability, audits } = setup({ onApproval })

		await engine.execute(capability, { orderId: 'ORD-1' }, { signal: signal() })

		expect(asked).toBe(1)
		// The human sees the actual arguments, not just the tool name.
		expect(summary).toContain('ORD-1')
		expect(audits[0].approved).toBe(true)
	})

	it('does not execute when the human declines', async () => {
		const execute = vi.fn(async () => ({ content: 'should not happen' }))
		const { engine, capability, audits } = setup({ onApproval: async () => false, execute })

		await expect(engine.execute(capability, {}, { signal: signal() })).rejects.toThrow(
			CapabilityDeniedError
		)

		expect(execute).not.toHaveBeenCalled()
		expect(audits[0].status).toBe('denied')
		expect(audits[0].approved).toBe(false)
	})

	it('refuses a consequential capability when no approval handler exists', async () => {
		const execute = vi.fn(async () => ({ content: 'should not happen' }))
		const { engine, capability } = setup({ execute })

		await expect(engine.execute(capability, {}, { signal: signal() })).rejects.toThrow(
			/no approval handler is configured/i
		)
		expect(execute).not.toHaveBeenCalled()
	})

	it('honors an explicit blocklist over risk level', async () => {
		const { engine, capability } = setup({
			risk: 'read',
			policy: { blocklist: ['refund_payment'] },
		})

		await expect(engine.execute(capability, {}, { signal: signal() })).rejects.toThrow(
			/blocked by policy/i
		)
	})

	it('records an audit event when the capability itself throws', async () => {
		const { engine, capability, audits } = setup({
			risk: 'read',
			execute: async () => {
				throw new Error('backend exploded')
			},
		})

		await expect(engine.execute(capability, {}, { signal: signal() })).rejects.toThrow(
			'backend exploded'
		)

		expect(audits[0].status).toBe('error')
		expect(audits[0].error).toBe('backend exploded')
		expect(audits[0].durationMs).toBeGreaterThanOrEqual(0)
	})

	it('captures the full audit shape for governance', async () => {
		const { engine, capability, audits } = setup({ risk: 'read' })

		await engine.execute(capability, { orderId: 'ORD-9' }, { signal: signal(), page: '/orders' })

		expect(audits[0]).toMatchObject({
			session: 'session-1',
			tool: 'refund_payment',
			executionType: 'javascript',
			source: 'developer_defined',
			risk: 'read',
			status: 'success',
			page: '/orders',
			arguments: { orderId: 'ORD-9' },
		})
	})

	it('surfaces an unknown capability by name instead of failing silently', async () => {
		const { engine } = setup()

		await expect(engine.executeByName('nope', {}, { signal: signal() })).rejects.toThrow(
			/not available on this page/i
		)
	})

	it('an audit sink that throws cannot break execution', async () => {
		const registry = new CapabilityRegistry()
		const capability = registry.register({
			name: 'ping',
			description: 'ping',
			inputSchema: { type: 'object', properties: {} },
			source: 'developer_defined',
			executionType: 'javascript',
			risk: 'read',
			execute: async () => ({ content: 'pong' }),
		})

		const engine = new ExecutionEngine({
			registry,
			policy: new PolicyEngine(),
			session: 's',
			onAudit: () => {
				throw new Error('sink is down')
			},
		})

		await expect(engine.execute(capability, {}, { signal: signal() })).resolves.toMatchObject({
			content: 'pong',
		})
	})
})
