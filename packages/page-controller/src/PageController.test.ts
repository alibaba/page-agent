import { describe, expect, it } from 'vitest'

import { PageController } from './PageController'

describe('PageController', () => {
	it('constructs and exposes the current url', async () => {
		const controller = new PageController()
		expect(controller).toBeInstanceOf(PageController)
		expect(await controller.getCurrentUrl()).toBe(window.location.href)
	})

	describe('executeJavascript', () => {
		it('runs a script and returns its result', async () => {
			const controller = new PageController()
			const result = await controller.executeJavascript('return 1 + 2')
			expect(result).toMatchObject({ success: true })
			expect(result.message).toContain('3')
		})

		it('exposes the abort signal to the script scope', async () => {
			const controller = new PageController()
			const controllerSignal = new AbortController()
			controllerSignal.abort()

			const result = await controller.executeJavascript(
				'return signal.aborted',
				controllerSignal.signal
			)
			expect(result).toMatchObject({ success: true })
			expect(result.message).toContain('true')
		})

		it('reports a syntax error as a failed result', async () => {
			const controller = new PageController()
			const result = await controller.executeJavascript('return (')
			expect(result.success).toBe(false)
			expect(result.message).toContain('❌')
		})
	})

	describe('hoverElement (experimental)', () => {
		it('returns a disabled failure when experimentalPointerActions is not set', async () => {
			const controller = new PageController()
			const result = await controller.hoverElement(0)
			expect(result.success).toBe(false)
			expect(result.message).toContain('experimentalPointerActions')
		})

		it('dispatches hover events when experimentalPointerActions is enabled', async () => {
			document.body.innerHTML = '<button id="target">Hover me</button>'
			const target = document.querySelector<HTMLButtonElement>('#target')!

			const seen: string[] = []
			for (const evt of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter']) {
				target.addEventListener(evt, () => seen.push(evt))
			}

			// Stub index 0 -> our target.
			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: target,
			})

			const result = await controller.hoverElement(0)
			expect(result.success).toBe(true)
			expect(result.message).toContain('Hovered over element')
			expect(seen).toEqual(
				expect.arrayContaining(['pointerover', 'pointerenter', 'mouseover', 'mouseenter'])
			)
		})
	})
})
