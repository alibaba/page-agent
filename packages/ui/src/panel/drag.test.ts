import { describe, expect, it } from 'vitest'

import { type BaseRect, DRAG_MARGIN, type DragOffset, clampDragOffset } from './drag'

/** A 360x40 panel sitting bottom-centre of a 1000x800 viewport, like the default panel. */
const viewport = { width: 1000, height: 800 }
const panel: BaseRect = { left: 320, top: 660, width: 360, height: 40 }

// Bounds implied by `panel` + `viewport` + margin 8:
//   x in [8 - 320, 1000 - 8 - 360 - 320] = [-312, 312]
//   y in [8 - 660, 800 - 8 - 40 - 660]   = [-652, 92]

const cases: {
	name: string
	offset: DragOffset
	base?: BaseRect
	viewport?: { width: number; height: number }
	margin?: number
	expected: DragOffset
}[] = [
	{ name: 'no-op drag stays put', offset: { x: 0, y: 0 }, expected: { x: 0, y: 0 } },
	{ name: 'drag right', offset: { x: 100, y: 0 }, expected: { x: 100, y: 0 } },
	{ name: 'drag left', offset: { x: -100, y: 0 }, expected: { x: -100, y: 0 } },
	{ name: 'drag up', offset: { x: 0, y: -200 }, expected: { x: 0, y: -200 } },
	{ name: 'drag down', offset: { x: 0, y: 50 }, expected: { x: 0, y: 50 } },
	{ name: 'drag diagonally', offset: { x: -40, y: 60 }, expected: { x: -40, y: 60 } },

	// Clamped at each edge
	{ name: 'clamped at left edge', offset: { x: -9999, y: 0 }, expected: { x: -312, y: 0 } },
	{ name: 'clamped at right edge', offset: { x: 9999, y: 0 }, expected: { x: 312, y: 0 } },
	{ name: 'clamped at top edge', offset: { x: 0, y: -9999 }, expected: { x: 0, y: -652 } },
	{ name: 'clamped at bottom edge', offset: { x: 0, y: 9999 }, expected: { x: 0, y: 92 } },
	{
		name: 'clamped on both axes at once',
		offset: { x: -9999, y: 9999 },
		expected: { x: -312, y: 92 },
	},

	// Exact boundary values are allowed through untouched
	{ name: 'exactly on the left bound', offset: { x: -312, y: 0 }, expected: { x: -312, y: 0 } },
	{ name: 'exactly on the right bound', offset: { x: 312, y: 0 }, expected: { x: 312, y: 0 } },
	{ name: 'exactly on the top bound', offset: { x: 0, y: -652 }, expected: { x: 0, y: -652 } },
	{ name: 'exactly on the bottom bound', offset: { x: 0, y: 92 }, expected: { x: 0, y: 92 } },
	{ name: 'one px past the right bound', offset: { x: 313, y: 0 }, expected: { x: 312, y: 0 } },
	{ name: 'one px inside the right bound', offset: { x: 311, y: 0 }, expected: { x: 311, y: 0 } },

	// Margin is honoured
	{
		name: 'zero margin lets the panel touch the edge',
		offset: { x: 9999, y: 9999 },
		margin: 0,
		expected: { x: 320, y: 100 },
	},
	{
		name: 'a large margin shrinks the travel',
		offset: { x: 9999, y: 9999 },
		margin: 100,
		expected: { x: 220, y: 0 },
	},

	// Degenerate: panel bigger than the viewport. The lower bound wins, so the
	// top-left corner parks at `margin` and the overflow runs off bottom-right.
	{
		name: 'panel wider than the viewport pins its left edge to the margin',
		offset: { x: 9999, y: 0 },
		base: { left: 0, top: 660, width: 1200, height: 40 },
		expected: { x: 8, y: 0 },
	},
	{
		name: 'panel wider than the viewport ignores a leftward drag too',
		offset: { x: -9999, y: 0 },
		base: { left: 0, top: 660, width: 1200, height: 40 },
		expected: { x: 8, y: 0 },
	},
	{
		name: 'panel taller than the viewport pins its top edge to the margin',
		offset: { x: 0, y: 9999 },
		base: { left: 320, top: 0, width: 360, height: 900 },
		expected: { x: 0, y: 8 },
	},

	// Degenerate: no layout information at all
	{
		name: 'zero-size rect at the origin snaps to the margin',
		offset: { x: 0, y: 0 },
		base: { left: 0, top: 0, width: 0, height: 0 },
		expected: { x: 8, y: 8 },
	},
	{
		name: 'zero-size rect still clamps to the far edge',
		offset: { x: 9999, y: 9999 },
		base: { left: 0, top: 0, width: 0, height: 0 },
		expected: { x: 992, y: 792 },
	},
]

describe('clampDragOffset', () => {
	it.each(cases)('$name', ({ offset, base, viewport: vp, margin, expected }) => {
		expect(clampDragOffset(offset, base ?? panel, vp ?? viewport, margin)).toEqual(expected)
	})

	it('defaults to an 8px margin', () => {
		expect(DRAG_MARGIN).toBe(8)
		expect(clampDragOffset({ x: 9999, y: 0 }, panel, viewport)).toEqual(
			clampDragOffset({ x: 9999, y: 0 }, panel, viewport, 8)
		)
	})
})
