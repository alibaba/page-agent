/**
 * Geometry for dragging the panel.
 *
 * The panel is positioned by CSS (`position: fixed` + a `transform` that carries
 * both the centring and the show/hide animation). Dragging therefore does not
 * touch `left`/`top`; it only feeds an extra offset into the transform through
 * the `--drag-x` / `--drag-y` custom properties. This module holds the pure maths
 * so it can be tested without a layout engine.
 */

/** Minimum gap kept between the panel and each viewport edge, in px. */
export const DRAG_MARGIN = 8

/** Pointer movement (px) that turns a press into a drag instead of a click. */
export const DRAG_THRESHOLD = 4

export interface DragOffset {
	x: number
	y: number
}

/** The panel's box as it would sit with a zero drag offset. */
export interface BaseRect {
	left: number
	top: number
	width: number
	height: number
}

export interface ViewportSize {
	width: number
	height: number
}

/**
 * Clamp `offset` so the panel stays inside the viewport with `margin` to spare
 * on every side.
 *
 * Degenerate case: when the panel is larger than the viewport minus both
 * margins there is no offset that satisfies both bounds. The lower bound wins,
 * which pins the panel's top-left corner at `margin` and lets the overflow run
 * off the bottom-right — the header (drag handle and buttons) stays reachable.
 */
export function clampDragOffset(
	offset: DragOffset,
	base: BaseRect,
	viewport: ViewportSize,
	margin: number = DRAG_MARGIN
): DragOffset {
	return {
		x: clampAxis(offset.x, base.left, base.width, viewport.width, margin),
		y: clampAxis(offset.y, base.top, base.height, viewport.height, margin),
	}
}

function clampAxis(
	value: number,
	baseStart: number,
	size: number,
	viewportSize: number,
	margin: number
): number {
	const min = margin - baseStart
	const max = viewportSize - margin - size - baseStart
	// `min` last so it wins when min > max (panel bigger than the viewport).
	return Math.max(Math.min(value, max), min)
}
