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
			const composed: boolean[] = []
			for (const evt of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter']) {
				target.addEventListener(evt, (event) => {
					seen.push(evt)
					if (evt === 'pointerover' || evt === 'mouseover') composed.push(event.composed)
				})
			}

			// Stub index 0 -> our target.
			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: target,
			})

			const result = await controller.hoverElement(0)
			expect(result.success).toBe(true)
			expect(result.message).toContain('Dispatched synthetic hover events')
			expect(seen).toEqual(
				expect.arrayContaining(['pointerover', 'pointerenter', 'mouseover', 'mouseenter'])
			)
			expect(composed).toEqual([true, true])
		})

		it('dispatches enter events on ancestors when hovering a descendant directly', async () => {
			document.body.innerHTML = '<div id="menu"><button id="item">Item</button></div>'
			const menu = document.querySelector<HTMLDivElement>('#menu')!
			const item = document.querySelector<HTMLButtonElement>('#item')!
			const entered: string[] = []
			for (const evt of ['pointerenter', 'mouseenter']) {
				menu.addEventListener(evt, () => entered.push(evt))
			}

			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: item,
			})

			await controller.hoverElement(0)

			expect(entered).toEqual(['pointerenter', 'mouseenter'])
		})

		it('clears ancestor hover after hovering a descendant directly', async () => {
			document.body.innerHTML =
				'<div id="menu"><button id="item">Item</button></div><button id="outside">Outside</button>'
			const menu = document.querySelector<HTMLDivElement>('#menu')!
			const item = document.querySelector<HTMLButtonElement>('#item')!
			const outside = document.querySelector<HTMLButtonElement>('#outside')!
			const menuLeaves: string[] = []
			for (const evt of ['pointerleave', 'mouseleave']) {
				menu.addEventListener(evt, () => menuLeaves.push(evt))
			}

			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: item,
			})
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(1, {
				ref: outside,
			})

			await controller.hoverElement(0)
			const result = await controller.clickElement(1)

			expect(result.success).toBe(true)
			expect(menuLeaves).toEqual(['pointerleave', 'mouseleave'])
		})

		it('clears synthetic hover when the controller is disposed', async () => {
			document.body.innerHTML = '<div id="menu"><button id="item">Item</button></div>'
			const menu = document.querySelector<HTMLDivElement>('#menu')!
			const item = document.querySelector<HTMLButtonElement>('#item')!
			const menuLeaves: string[] = []
			const itemLeaves: string[] = []
			for (const evt of ['pointerleave', 'mouseleave']) {
				menu.addEventListener(evt, () => menuLeaves.push(evt))
				item.addEventListener(evt, () => itemLeaves.push(evt))
			}

			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: item,
			})

			await controller.hoverElement(0)
			controller.dispose()

			expect(itemLeaves).toEqual(['pointerleave', 'mouseleave'])
			expect(menuLeaves).toEqual(['pointerleave', 'mouseleave'])
		})

		it('preserves mouse pointer metadata when clearing synthetic hover', async () => {
			document.body.innerHTML =
				'<button id="item">Item</button><button id="outside">Outside</button>'
			const item = document.querySelector<HTMLButtonElement>('#item')!
			const outside = document.querySelector<HTMLButtonElement>('#outside')!
			const pointerTypes: string[] = []
			for (const evt of ['pointerout', 'pointerleave']) {
				item.addEventListener(evt, (event) =>
					pointerTypes.push((event as PointerEvent).pointerType)
				)
			}

			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: item,
			})
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(1, {
				ref: outside,
			})

			await controller.hoverElement(0)
			await controller.hoverElement(1)

			expect(pointerTypes).toEqual(['mouse', 'mouse'])
		})

		it('dispatches leave events when moving synthetic hover to another element', async () => {
			document.body.innerHTML =
				'<button id="first">First</button><button id="second">Second</button>'
			const first = document.querySelector<HTMLButtonElement>('#first')!
			const second = document.querySelector<HTMLButtonElement>('#second')!
			const left: string[] = []
			for (const evt of ['pointerout', 'pointerleave', 'mouseout', 'mouseleave']) {
				first.addEventListener(evt, () => left.push(evt))
			}

			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: first,
			})
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(1, {
				ref: second,
			})

			await controller.hoverElement(0)
			await controller.hoverElement(1)
			expect(left).toEqual(['pointerout', 'mouseout', 'pointerleave', 'mouseleave'])
		})

		it('preserves hover when moving from a menu trigger into its descendant', async () => {
			document.body.innerHTML = '<div id="trigger">Open<div id="item">Item</div></div>'
			const trigger = document.querySelector<HTMLDivElement>('#trigger')!
			const item = document.querySelector<HTMLDivElement>('#item')!
			const events: { type: string; relatedTarget: EventTarget | null }[] = []
			for (const evt of ['pointerout', 'pointerleave', 'mouseout', 'mouseleave']) {
				trigger.addEventListener(evt, (event) =>
					events.push({ type: event.type, relatedTarget: (event as MouseEvent).relatedTarget })
				)
			}

			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: trigger,
			})
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(1, {
				ref: item,
			})

			await controller.hoverElement(0)
			await controller.hoverElement(1)

			expect(events).toEqual([
				{ type: 'pointerout', relatedTarget: item },
				{ type: 'mouseout', relatedTarget: item },
			])
		})

		it('clears synthetic hover before clicking outside the hovered subtree', async () => {
			document.body.innerHTML =
				'<button id="first">First</button><button id="second">Second</button>'
			const first = document.querySelector<HTMLButtonElement>('#first')!
			const second = document.querySelector<HTMLButtonElement>('#second')!
			const left: string[] = []
			for (const evt of ['pointerout', 'pointerleave', 'mouseout', 'mouseleave']) {
				first.addEventListener(evt, () => left.push(evt))
			}

			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: first,
			})
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(1, {
				ref: second,
			})

			await controller.hoverElement(0)
			const result = await controller.clickElement(1)

			expect(result.success).toBe(true)
			expect(left).toEqual(['pointerout', 'mouseout', 'pointerleave', 'mouseleave'])
		})

		it('clears click hover before hovering another element', async () => {
			document.body.innerHTML =
				'<button id="clicked">Clicked</button><button id="hovered">Hovered</button>'
			const clicked = document.querySelector<HTMLButtonElement>('#clicked')!
			const hovered = document.querySelector<HTMLButtonElement>('#hovered')!
			const left: string[] = []
			const pointerTypes: string[] = []
			for (const evt of ['pointerout', 'pointerleave', 'mouseout', 'mouseleave']) {
				clicked.addEventListener(evt, (event) => {
					left.push(evt)
					if (event instanceof PointerEvent) pointerTypes.push(event.pointerType)
				})
			}

			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: clicked,
			})
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(1, {
				ref: hovered,
			})

			await controller.clickElement(0)
			await controller.hoverElement(1)

			expect(left).toEqual(['pointerout', 'pointerleave', 'mouseout', 'mouseleave'])
			expect(pointerTypes).toEqual(['mouse', 'mouse'])
		})

		it('clears the full hover ancestry after entering a descendant', async () => {
			document.body.innerHTML =
				'<div id="menu"><button id="item">Item</button></div><button id="outside">Outside</button>'
			const menu = document.querySelector<HTMLDivElement>('#menu')!
			const item = document.querySelector<HTMLButtonElement>('#item')!
			const outside = document.querySelector<HTMLButtonElement>('#outside')!
			const menuLeaves: string[] = []
			const itemLeaves: string[] = []
			for (const evt of ['pointerleave', 'mouseleave']) {
				menu.addEventListener(evt, () => menuLeaves.push(evt))
				item.addEventListener(evt, () => itemLeaves.push(evt))
			}

			const controller = new PageController({ experimentalPointerActions: true })
			;(controller as unknown as { isIndexed: boolean }).isIndexed = true
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(0, {
				ref: menu,
			})
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(1, {
				ref: item,
			})
			;(controller as unknown as { selectorMap: Map<number, unknown> }).selectorMap.set(2, {
				ref: outside,
			})

			await controller.hoverElement(0)
			await controller.hoverElement(1)
			await controller.clickElement(2)

			expect(itemLeaves).toEqual(['pointerleave', 'mouseleave'])
			expect(menuLeaves).toEqual(['pointerleave', 'mouseleave'])
		})
	})
})
