/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * Viewport expansion for DOM tree extraction.
 * -1 means full page (no viewport restriction)
 * 0 means viewport only
 * positive values expand the viewport by that many pixels
 *
 * @note Since isTopElement depends on elementFromPoint,
 * it returns null when out of viewport, this feature has no practical use, only differ between -1 and 0
 */
// export const VIEWPORT_EXPANSION = 100
export const VIEWPORT_EXPANSION = -1

export function resolveViewportExpansion(viewportExpansion?: number): number {
	return viewportExpansion ?? VIEWPORT_EXPANSION
}
