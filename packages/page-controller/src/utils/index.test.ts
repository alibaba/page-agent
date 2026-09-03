import { describe, expect, it } from 'vitest'

import { getIframeOffset } from './index'

/**
 * Build an element inside a chain of frames. `offsets[0]` is the innermost
 * frame's position in its parent, and so on outward.
 */
function elementInFrames(offsets: { x: number; y: number }[]): HTMLElement {
	// The top window has no frameElement.
	let view: unknown = { frameElement: null }

	for (const { x, y } of [...offsets].reverse()) {
		const frame = {
			getBoundingClientRect: () => ({ left: x, top: y }),
			ownerDocument: { defaultView: view },
		}
		view = { frameElement: frame }
	}

	return { ownerDocument: { defaultView: view } } as unknown as HTMLElement
}

describe('getIframeOffset', () => {
	it('is zero in the top frame', () => {
		expect(getIframeOffset(elementInFrames([]))).toEqual({ x: 0, y: 0 })
	})

	it('reads a single frame', () => {
		expect(getIframeOffset(elementInFrames([{ x: 10, y: 20 }]))).toEqual({ x: 10, y: 20 })
	})

	it('sums every frame in a nested chain', () => {
		// Only the innermost frame used to be read, so the pointer landed
		// 100,200 short of the element.
		expect(
			getIframeOffset(
				elementInFrames([
					{ x: 10, y: 20 },
					{ x: 100, y: 200 },
				])
			)
		).toEqual({ x: 110, y: 220 })
	})

	it('stops on a frame chain that does not terminate', () => {
		const frame: any = { getBoundingClientRect: () => ({ left: 1, top: 1 }) }
		frame.ownerDocument = { defaultView: { frameElement: frame } }
		const element = { ownerDocument: { defaultView: { frameElement: frame } } } as HTMLElement

		expect(() => getIframeOffset(element)).not.toThrow()
	})
})
