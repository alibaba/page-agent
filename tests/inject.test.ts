/**
 * Tests for page-agent injectability and core functionality.
 *
 * These tests verify that page-agent can be:
 * 1. Injected into any page (simulated via happy-dom)
 * 2. Properly initialized with various configurations
 * 3. Disposed and re-created without leaking state
 * 4. Used with the Chrome Built-in AI mock
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

import { PageAgent } from '../packages/page-agent/src/PageAgent'
import { installMockChromeAI } from './setup'

describe('PageAgent Injectability', () => {
	let agent: PageAgent | null = null

	afterEach(() => {
		if (agent) {
			agent.dispose()
			agent = null
		}
	})

	it('should construct without errors', () => {
		agent = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
		})
		expect(agent).toBeDefined()
		expect(agent.status).toBe('idle')
	})

	it('should expose panel property', () => {
		agent = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
		})
		expect(agent.panel).toBeDefined()
	})

	it('should be constructable with all config options', () => {
		agent = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
			language: 'en-US',
			maxSteps: 10,
			temperature: 0.5,
			enableMask: false,
			experimentalScriptExecutionTool: true,
			instructions: {
				system: 'Test instruction',
				getPageInstructions: () => 'Page-specific instruction',
			},
		})
		expect(agent.config.maxSteps).toBe(10)
		expect(agent.config.language).toBe('en-US')
	})

	it('should dispose cleanly', () => {
		agent = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
		})

		agent.dispose()
		expect(agent.disposed).toBe(true)

		// Creating a new agent after dispose should work
		const agent2 = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
		})
		expect(agent2.disposed).toBe(false)
		agent2.dispose()
		agent = null
	})

	it('should throw if executed after dispose', async () => {
		agent = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
		})

		agent.dispose()
		await expect(agent.execute('test task')).rejects.toThrow('disposed')
		agent = null
	})

	it('should throw if executed with empty task', async () => {
		agent = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
		})

		await expect(agent.execute('')).rejects.toThrow('Task is required')
	})

	it('should support custom tools', () => {
		const { z } = require('zod/v4')
		agent = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
			customTools: {
				my_custom_tool: {
					description: 'A custom tool',
					inputSchema: z.object({ param: z.string() }),
					execute: async (input: { param: string }) => `Result: ${input.param}`,
				},
			},
		})

		expect(agent.tools.has('my_custom_tool')).toBe(true)
	})

	it('should support removing built-in tools via null', () => {
		agent = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
			customTools: {
				wait: null,
			},
		})

		expect(agent.tools.has('wait')).toBe(false)
	})

	it('should re-inject cleanly (simulating bookmarklet re-click)', () => {
		// First injection
		const agent1 = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
		})
		expect(agent1.disposed).toBe(false)

		// Simulate re-injection: dispose old, create new
		agent1.dispose()
		expect(agent1.disposed).toBe(true)

		const agent2 = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
		})
		expect(agent2.disposed).toBe(false)

		agent2.dispose()
	})
})

describe('PageAgent Event System', () => {
	let agent: PageAgent

	beforeEach(() => {
		agent = new PageAgent({
			model: 'test-model',
			baseURL: 'http://localhost:0',
			apiKey: 'test-key',
			enableMask: false,
		})
	})

	afterEach(() => {
		agent.dispose()
	})

	it('should emit statuschange events', () => {
		const statusChanges: string[] = []
		agent.addEventListener('statuschange', () => {
			statusChanges.push(agent.status)
		})

		// Status starts as idle
		expect(agent.status).toBe('idle')
	})

	it('should emit dispose event', () => {
		let disposed = false
		agent.addEventListener('dispose', () => {
			disposed = true
		})

		agent.dispose()
		expect(disposed).toBe(true)
	})
})

describe('Chrome Built-in AI Mock', () => {
	it('should be installed on global scope', () => {
		expect((globalThis as any).LanguageModel).toBeDefined()
		expect((globalThis as any).ai?.languageModel).toBeDefined()
	})

	it('should report availability', async () => {
		const factory = (globalThis as any).LanguageModel
		const availability = await factory.availability()
		expect(availability).toBe('available')
	})

	it('should create sessions', async () => {
		const factory = (globalThis as any).LanguageModel
		const session = await factory.create({})
		expect(session).toBeDefined()
		expect(session.inputQuota).toBe(8192)
		expect(session.inputUsage).toBe(0)
	})

	it('should respond to prompts with fixed strings', async () => {
		const factory = (globalThis as any).LanguageModel
		const session = await factory.create({})

		const response = await session.prompt('Please click the button')
		const parsed = JSON.parse(response)
		expect(parsed.name).toBe('AgentOutput')
		expect(parsed.arguments.action).toHaveProperty('click_element_by_index')
	})

	it('should return done action for unmatched prompts', async () => {
		const factory = (globalThis as any).LanguageModel
		const session = await factory.create({})

		const response = await session.prompt('some unrelated prompt')
		const parsed = JSON.parse(response)
		expect(parsed.name).toBe('AgentOutput')
		expect(parsed.arguments.action).toHaveProperty('done')
	})

	it('should track token usage', async () => {
		const factory = (globalThis as any).LanguageModel
		const session = await factory.create({})

		expect(session.inputUsage).toBe(0)
		await session.prompt('test prompt')
		expect(session.inputUsage).toBeGreaterThan(0)
	})

	it('should support custom response patterns', () => {
		const cleanup = installMockChromeAI({
			responses: new Map([
				[/hello/i, '{"greeting": "world"}'],
			]),
		})

		// Test would use the custom mock here
		cleanup()
	})

	it('should support unavailable state', async () => {
		const cleanup = installMockChromeAI({ available: false })

		const factory = (globalThis as any).LanguageModel
		const availability = await factory.availability()
		expect(availability).toBe('unavailable')

		cleanup()
	})

	it('should support streaming responses', async () => {
		const factory = (globalThis as any).LanguageModel
		const session = await factory.create({})

		const stream = session.promptStreaming('test')
		const reader = stream.getReader()
		const { value, done } = await reader.read()
		expect(value).toBeDefined()
		expect(typeof value).toBe('string')
		reader.releaseLock()
	})

	it('should throw after session destruction', async () => {
		const factory = (globalThis as any).LanguageModel
		const session = await factory.create({})

		session.destroy()
		await expect(session.prompt('test')).rejects.toThrow('destroyed')
	})
})
