import type { BrowserState, PageController } from '@page-agent/page-controller'
import { describe, expect, it, vi } from 'vitest'
import * as z from 'zod/v4'

import { PageAgentCore, tool } from './PageAgentCore'
import type { ExecutionResult } from './types'

type TestFetch = (...args: Parameters<typeof globalThis.fetch>) => Promise<Response>

function agentResponse(args: unknown): Response {
	return new Response(
		JSON.stringify({
			choices: [
				{
					finish_reason: 'tool_calls',
					message: {
						tool_calls: [
							{
								function: {
									name: 'AgentOutput',
									arguments: JSON.stringify(args),
								},
							},
						],
					},
				},
			],
			usage: {},
		})
	)
}

function createPageController(overrides: Partial<PageController> = {}): PageController {
	const browserState: BrowserState = {
		url: 'https://example.test/',
		title: 'Test page',
		header: '',
		content: '',
		footer: '',
	}

	return {
		showMask: vi.fn(async () => {}),
		hideMask: vi.fn(),
		cleanUpHighlights: vi.fn(),
		getLastUpdateTime: vi.fn(() => Date.now()),
		getBrowserState: vi.fn(async () => browserState),
		dispose: vi.fn(),
		...overrides,
	} as unknown as PageController
}

function createAgent(
	customFetch: TestFetch,
	options: Partial<ConstructorParameters<typeof PageAgentCore>[0]> = {}
): PageAgentCore {
	return new PageAgentCore({
		baseURL: 'https://llm.test',
		model: 'test-model',
		maxRetries: 0,
		stepDelay: 0,
		customFetch,
		customSystemPrompt: 'test',
		pageController: createPageController(),
		...options,
	})
}

function createFetchMock() {
	return vi.fn<TestFetch>()
}

function onceActivity(
	agent: PageAgentCore,
	predicate: (detail: unknown) => boolean
): Promise<void> {
	return new Promise((resolve) => {
		const onActivity = (event: Event) => {
			if (!predicate((event as CustomEvent).detail)) return
			agent.removeEventListener('activity', onActivity)
			resolve()
		}

		agent.addEventListener('activity', onActivity)
	})
}

function isExecutingTool(detail: unknown, toolName: string): boolean {
	return (
		typeof detail === 'object' &&
		detail !== null &&
		'type' in detail &&
		'tool' in detail &&
		detail.type === 'executing' &&
		detail.tool === toolName
	)
}

function doneResponse(text: string, success = true): Response {
	return agentResponse({ action: { done: { text, success } } })
}

function waitResponse(seconds = 10): Response {
	return agentResponse({ action: { wait: { seconds } } })
}

/**
 * Start a task that blocks on `wait`, returning once the tool is executing.
 * The running promise is wrapped so awaiting this helper does not await the task.
 */
async function startBlockedTask(
	agent: PageAgentCore,
	task = 'first'
): Promise<{ result: Promise<ExecutionResult> }> {
	const waitStarted = onceActivity(agent, (detail) => isExecutingTool(detail, 'wait'))
	const result = agent.execute(task)
	await waitStarted
	return { result }
}

describe.concurrent('PageAgentCore lifecycle', () => {
	describe('normal execution', () => {
		it('runs a task to natural completion', async () => {
			const fetchMock = createFetchMock().mockResolvedValueOnce(doneResponse('all done'))
			const agent = createAgent(fetchMock)

			const result = await agent.execute('do something')

			expect(result).toMatchObject({ success: true, data: 'all done' })
			expect(agent.status).toBe('completed')
			expect(fetchMock).toHaveBeenCalledTimes(1)
		})

		it('completes (not errors) when the LLM reports task failure', async () => {
			const fetchMock = createFetchMock().mockResolvedValueOnce(doneResponse('gave up', false))
			const agent = createAgent(fetchMock)

			const result = await agent.execute('do something')

			expect(result).toMatchObject({ success: false, data: 'gave up' })
			expect(agent.status).toBe('completed')
		})

		it('throws when a task is already running', async () => {
			const fetchMock = createFetchMock().mockResolvedValueOnce(waitResponse())
			const agent = createAgent(fetchMock)
			const { result } = await startBlockedTask(agent)

			await expect(agent.execute('second')).rejects.toThrow('A task is already running.')

			await agent.stop()
			await result
		})
	})

	describe('stop', () => {
		it('aborts the running task and keeps the agent reusable', async () => {
			const fetchMock = createFetchMock()
				.mockResolvedValueOnce(waitResponse())
				.mockResolvedValueOnce(doneResponse('second task'))
			const agent = createAgent(fetchMock)
			const { result: firstTask } = await startBlockedTask(agent)

			await agent.stop()
			expect(agent.status).toBe('stopped')
			await expect(firstTask).resolves.toMatchObject({ success: false, data: 'Task aborted' })

			const secondTask = await agent.execute('second')
			expect(secondTask).toMatchObject({ success: true, data: 'second task' })
			expect(agent.status).toBe('completed')
		})

		it('resolves only after the run has fully settled', async () => {
			const fetchMock = createFetchMock().mockResolvedValueOnce(waitResponse())
			const agent = createAgent(fetchMock)
			const { result } = await startBlockedTask(agent)

			await agent.stop()
			expect(agent.status).toBe('stopped')
			await expect(result).resolves.toMatchObject({ success: false })
		})

		it('is a no-op when no task is running', async () => {
			const agent = createAgent(createFetchMock())

			await expect(agent.stop()).resolves.toBeUndefined()
			await expect(agent.stop()).resolves.toBeUndefined()
			expect(agent.status).toBe('idle')
		})
	})

	describe('dispose', () => {
		it('aborts the running task and blocks further execution', async () => {
			const fetchMock = createFetchMock().mockResolvedValueOnce(waitResponse())
			const agent = createAgent(fetchMock)
			const { result: task } = await startBlockedTask(agent)

			agent.dispose()
			await expect(task).resolves.toMatchObject({ success: false, data: 'Task aborted' })

			expect(agent.disposed).toBe(true)
			await expect(agent.execute('again')).rejects.toThrow('has been disposed')
		})

		it('is idempotent', () => {
			const agent = createAgent(createFetchMock())

			expect(() => {
				agent.dispose()
				agent.dispose()
			}).not.toThrow()
			expect(agent.disposed).toBe(true)
		})
	})

	describe('error handling', () => {
		it('fails the task when the network request rejects', async () => {
			const fetchMock = createFetchMock().mockRejectedValue(new Error('network down'))
			const agent = createAgent(fetchMock)

			const result = await agent.execute('do something')

			expect(result.success).toBe(false)
			expect(agent.status).toBe('error')
		})

		it('fails the task when a tool throws', async () => {
			const fetchMock = createFetchMock().mockResolvedValue(agentResponse({ action: { boom: {} } }))
			const agent = createAgent(fetchMock, {
				customTools: {
					boom: tool({
						description: 'Always throws.',
						inputSchema: z.object({}),
						execute: async () => {
							throw new Error('tool exploded')
						},
					}),
				},
			})

			const result = await agent.execute('trigger tool error')

			expect(result.success).toBe(false)
			expect(agent.status).toBe('error')
		})

		it('re-throws and sets error status when onBeforeTask throws', async () => {
			const agent = createAgent(createFetchMock(), {
				onBeforeTask: async () => {
					throw new Error('setup failed')
				},
			})

			await expect(agent.execute('do something')).rejects.toThrow('setup failed')
			expect(agent.status).toBe('error')
			expect(agent.history.some((e) => e.type === 'error')).toBe(false)
		})

		it('re-throws and sets error status when onAfterTask throws', async () => {
			const fetchMock = createFetchMock().mockResolvedValueOnce(doneResponse('all done'))
			const agent = createAgent(fetchMock, {
				onAfterTask: async () => {
					throw new Error('teardown failed')
				},
			})

			await expect(agent.execute('do something')).rejects.toThrow('teardown failed')
			expect(agent.status).toBe('error')
		})

		it('stays reusable after onBeforeTask throws', async () => {
			const fetchMock = createFetchMock().mockResolvedValueOnce(doneResponse('second'))
			let failOnce = true
			const agent = createAgent(fetchMock, {
				onBeforeTask: async () => {
					if (failOnce) {
						failOnce = false
						throw new Error('setup failed')
					}
				},
			})

			await expect(agent.execute('first')).rejects.toThrow('setup failed')
			const result = await agent.execute('second')
			expect(result).toMatchObject({ success: true, data: 'second' })
		})

		it('re-throws and sets error status when onBeforeStep throws', async () => {
			const agent = createAgent(createFetchMock(), {
				onBeforeStep: async () => {
					throw new Error('before step failed')
				},
			})

			await expect(agent.execute('do something')).rejects.toThrow('before step failed')
			expect(agent.status).toBe('error')
			expect(agent.history.some((e) => e.type === 'error')).toBe(false)
		})

		it('re-throws and sets error status when onAfterStep throws', async () => {
			const fetchMock = createFetchMock().mockResolvedValueOnce(doneResponse('all done'))
			const agent = createAgent(fetchMock, {
				onAfterStep: async () => {
					throw new Error('after step failed')
				},
			})

			await expect(agent.execute('do something')).rejects.toThrow('after step failed')
			expect(agent.status).toBe('error')
			expect(agent.history.some((e) => e.type === 'error')).toBe(false)
		})
	})

	describe('cancellation edge cases', () => {
		it('aborts wait while reading the last page update time', async () => {
			let resolveLastUpdate!: (value: number) => void
			let notifyLastUpdateStarted!: () => void
			const lastUpdateStarted = new Promise<void>((resolve) => {
				notifyLastUpdateStarted = resolve
			})
			const lastUpdate = new Promise<number>((resolve) => {
				resolveLastUpdate = resolve
			})
			const pageController = createPageController({
				getLastUpdateTime: vi.fn(() => {
					notifyLastUpdateStarted()
					return lastUpdate
				}),
			})
			const fetchMock = createFetchMock().mockResolvedValueOnce(waitResponse())
			const agent = createAgent(fetchMock, { pageController })

			const task = agent.execute('wait for page')
			await onceActivity(agent, (detail) => isExecutingTool(detail, 'wait'))
			await lastUpdateStarted

			let stopSettled = false
			const stopped = agent.stop().then(() => {
				stopSettled = true
			})

			await new Promise((resolve) => setTimeout(resolve, 0))
			const stoppedBeforeLastUpdateResolved = stopSettled
			resolveLastUpdate(Date.now())
			await stopped

			expect(stoppedBeforeLastUpdateResolved).toBe(true)
			await expect(task).resolves.toMatchObject({ success: false, data: 'Task aborted' })
			expect(agent.status).toBe('stopped')
		})

		it('rejects a new task while a stop is still settling', async () => {
			const fetchMock = createFetchMock().mockResolvedValueOnce(waitResponse())
			const agent = createAgent(fetchMock)
			const { result: firstTask } = await startBlockedTask(agent)

			const stopped = agent.stop()

			await expect(agent.execute('too early')).rejects.toThrow('A task is already running.')

			await stopped
			await expect(firstTask).resolves.toMatchObject({ success: false, data: 'Task aborted' })
			expect(fetchMock).toHaveBeenCalledTimes(1)
		})

		it('discards a custom tool result that resolves after stop', async () => {
			let resolveTool!: () => void
			let notifyToolStarted!: () => void
			const toolFinished = new Promise<void>((resolve) => {
				resolveTool = resolve
			})
			const toolStarted = new Promise<void>((resolve) => {
				notifyToolStarted = resolve
			})
			const fetchMock = createFetchMock().mockResolvedValue(
				agentResponse({ action: { slow_tool: {} } })
			)
			const agent = createAgent(fetchMock, {
				customTools: {
					slow_tool: tool({
						description: 'A tool that deliberately ignores cancellation.',
						inputSchema: z.object({}),
						execute: async () => {
							notifyToolStarted()
							await toolFinished
							return 'ignored stop'
						},
					}),
				},
			})

			const task = agent.execute('run slow tool')
			await toolStarted

			const stopped = agent.stop()
			resolveTool()
			await stopped

			await expect(task).resolves.toMatchObject({ success: false, data: 'Task aborted' })
			expect(agent.status).toBe('stopped')
		})
	})
})
