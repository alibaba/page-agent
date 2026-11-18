import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Panel } from './Panel'
import type { PanelAgentAdapter } from './types'

import styles from './Panel.module.css'

class TestAgent extends EventTarget implements PanelAgentAdapter {
	status: PanelAgentAdapter['status'] = 'idle'
	lastResult = null
	history: PanelAgentAdapter['history'] = []
	task = ''
	onAskUser?: PanelAgentAdapter['onAskUser']
	execute = vi.fn(async (task: string) => {
		this.task = task
		this.setStatus('running')
	})
	stop = vi.fn(async () => this.setStatus('stopped'))
	dispose = vi.fn()

	setStatus(status: PanelAgentAdapter['status']) {
		this.status = status
		this.dispatchEvent(new Event('statuschange'))
	}
}

describe('Panel task drafts', () => {
	let agent: TestAgent
	let panel: Panel
	let input: HTMLInputElement

	beforeEach(() => {
		vi.useFakeTimers()
		agent = new TestAgent()
		panel = new Panel(agent)
		panel.show()
		input = panel.wrapper.querySelector('input')!
	})

	afterEach(() => {
		panel.dispose()
		vi.clearAllTimers()
		vi.useRealTimers()
	})

	function enter(options: KeyboardEventInit = {}) {
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ...options }))
	}

	function expectInputVisible() {
		const section = panel.wrapper.querySelector(`.${styles.inputSectionWrapper}`)!
		expect(section.classList.contains(styles.hidden)).toBe(false)
		expect(input.disabled).toBe(false)
		expect(input.readOnly).toBe(false)
	}

	it.each(['completed', 'error', 'stopped'] as const)(
		'keeps a draft through %s and only submits it after the run ends',
		(status) => {
			input.value = 'First task'
			enter()
			expect(agent.execute).toHaveBeenCalledExactlyOnceWith('First task')
			expect(input.value).toBe('')
			expectInputVisible()

			input.value = '  Next task  '
			enter()
			agent.dispatchEvent(new CustomEvent('activity', { detail: { type: 'thinking' } }))
			agent.dispatchEvent(new Event('historychange'))
			expect(agent.execute).toHaveBeenCalledTimes(1)
			expect(input.value).toBe('  Next task  ')

			agent.setStatus(status)
			expectInputVisible()
			expect(input.value).toBe('  Next task  ')
			expect(agent.execute).toHaveBeenCalledTimes(1)
			enter()
			expect(agent.execute).toHaveBeenLastCalledWith('Next task')
			expect(input.value).toBe('')
		}
	)

	it('keeps the next-task draft separate from an answer to the agent', async () => {
		agent.setStatus('running')
		input.value = 'Next task'
		const controller = new AbortController()
		const answer = agent.onAskUser!('Which city?', { signal: controller.signal })
		expect(input.value).toBe('')
		expectInputVisible()

		input.value = 'London'
		enter()
		await expect(answer).resolves.toBe('London')
		expect(agent.execute).not.toHaveBeenCalled()
		expect(input.value).toBe('Next task')
		expectInputVisible()

		// The completed question's abort listener must not overwrite later edits.
		input.value = 'Edited next task'
		controller.abort()
		agent.setStatus('completed')
		expect(input.value).toBe('Edited next task')
	})

	it('restores the draft if a question is interrupted', async () => {
		agent.setStatus('running')
		input.value = 'Next task'
		const controller = new AbortController()
		const answer = agent.onAskUser!('Which city?', { signal: controller.signal })
		const rejection = expect(answer).rejects.toMatchObject({ name: 'AbortError' })
		input.value = 'Unfinished answer'
		controller.abort()
		await rejection
		agent.setStatus('stopped')
		expect(input.value).toBe('Next task')
		expectInputVisible()
	})

	it('respects promptForNextTask=false while still accepting answers', async () => {
		panel.dispose()
		panel = new Panel(agent, { promptForNextTask: false })
		input = panel.wrapper.querySelector('input')!
		agent.history = [{ type: 'observation', content: 'Working' }]
		agent.setStatus('running')
		const section = panel.wrapper.querySelector(`.${styles.inputSectionWrapper}`)!
		expect(section.classList.contains(styles.hidden)).toBe(true)
		const answer = agent.onAskUser!('Which city?')
		expectInputVisible()
		input.value = 'London'
		enter()
		await expect(answer).resolves.toBe('London')
		expect(section.classList.contains(styles.hidden)).toBe(true)
		agent.setStatus('completed')
		expect(section.classList.contains(styles.hidden)).toBe(true)
	})

	it('does not submit IME composition or blank input', () => {
		input.value = '输入'
		enter({ isComposing: true })
		expect(input.value).toBe('输入')
		input.value = '  '
		enter()
		expect(agent.execute).not.toHaveBeenCalled()
	})
})
