// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UseAgentResult } from '../../agent/useAgent'
import App from './App'

const { useAgent } = vi.hoisted(() => ({ useAgent: vi.fn() }))
vi.mock('../../agent/useAgent', () => ({ useAgent }))
vi.mock('@/lib/db', () => ({ saveSession: vi.fn() }))
vi.mock('@/components/ConfigPanel', () => ({ ConfigPanel: () => null }))
vi.mock('@/components/HistoryDetail', () => ({ HistoryDetail: () => null }))
vi.mock('@/components/HistoryList', () => ({ HistoryList: () => null }))
vi.mock('@/components/cards', () => ({ ActivityCard: () => null, EventCard: () => null }))
vi.mock('@/components/misc', () => ({
	EmptyState: () => null,
	Logo: () => null,
	MotionOverlay: () => null,
	StatusDot: () => null,
}))

describe('Side panel task drafts', () => {
	let container: HTMLDivElement
	let root: Root
	let agent: UseAgentResult

	beforeEach(async () => {
		vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
		agent = {
			status: 'running',
			history: [],
			activity: null,
			currentTask: 'First task',
			config: null,
			execute: vi.fn().mockResolvedValue({ success: true }),
			stop: vi.fn(),
			configure: vi.fn(),
		}
		useAgent.mockImplementation(() => agent)
		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)
		await act(async () => root.render(createElement(App)))
	})

	afterEach(async () => {
		await act(async () => root.unmount())
		container.remove()
		vi.unstubAllGlobals()
	})

	async function typeDraft(value: string) {
		const input = container.querySelector('textarea')!
		await act(async () => {
			Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
				input,
				value
			)
			input.dispatchEvent(new Event('input', { bubbles: true }))
		})
		return input
	}

	it.each(['completed', 'error', 'stopped'] as const)(
		'allows drafting while running and preserves the draft after %s',
		async (status) => {
			const input = await typeDraft('Next task')
			expect(input.disabled).toBe(false)
			expect(input.readOnly).toBe(false)
			await act(async () => {
				input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
			})
			expect(agent.execute).not.toHaveBeenCalled()
			expect(input.value).toBe('Next task')
			expect(container.querySelector('[aria-label="Stop task"]')).not.toBeNull()

			agent.status = status
			await act(async () => root.render(createElement(App)))
			expect(input.value).toBe('Next task')
			expect(agent.execute).not.toHaveBeenCalled()
			await act(async () =>
				container.querySelector<HTMLButtonElement>('[aria-label="Send"]')!.click()
			)
			expect(agent.execute).toHaveBeenCalledExactlyOnceWith('Next task')
			expect(input.value).toBe('')
		}
	)

	it('keeps Stop available without discarding the draft', async () => {
		const input = await typeDraft('Next task')
		await act(async () =>
			container.querySelector<HTMLButtonElement>('[aria-label="Stop task"]')!.click()
		)
		expect(agent.stop).toHaveBeenCalledOnce()
		expect(input.value).toBe('Next task')
		expect(agent.execute).not.toHaveBeenCalled()
	})
})
