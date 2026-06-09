/**
 * A comprehensive function to determine if the page is currently in a dark theme.
 * Heuristic check. Only work for common patterns. Return false by default.
 */
export function isPageDark() {
	try {
		if (hasDarkModeClass()) return true
		if (hasDarkModeDataAttribute()) return true
		if (isColorSchemeDark()) return true
		if (isBackgroundDark()) return true
		if (isMainContentBackgroundDark()) return true
		if (isTextColorLight()) return true

		return false
	} catch (error) {
		console.warn('Error determining if page is dark:', error)
		return false
	}
}

/**
 * Checks for common dark mode CSS classes on the html or body elements.
 */
function hasDarkModeClass() {
	const DEFAULT_DARK_MODE_CLASSES = ['dark', 'dark-mode', 'theme-dark', 'night', 'night-mode']

	const htmlElement = document.documentElement
	const bodyElement = document.body || document.documentElement // can be null in some cases

	// Check class names on <html> and <body>
	for (const className of DEFAULT_DARK_MODE_CLASSES) {
		if (htmlElement.classList.contains(className) || bodyElement?.classList.contains(className)) {
			return true
		}
	}

	return false
}

/**
 * Some UI frameworks use data attributes to indicate theme
 */
function hasDarkModeDataAttribute() {
	const htmlElement = document.documentElement
	const bodyElement = document.body || document.documentElement // can be null in some cases

	const dataAttrs = ['data-theme', 'data-color-mode', 'data-bs-theme', 'data-mui-color-scheme']
	for (const attr of dataAttrs) {
		const bodyValue = bodyElement?.getAttribute(attr)
		const htmlValue = htmlElement.getAttribute(attr)

		if (bodyValue?.toLowerCase() === 'dark' || htmlValue?.toLowerCase() === 'dark') {
			return true
		}
	}

	return false
}

/**
 * Checks the CSS `color-scheme` property and `<meta name="color-scheme">` tag.
 * Only "dark"/"only dark" counts as dark; "light dark" is ambiguous and ignored.
 */
function isColorSchemeDark() {
	// Check <meta name="color-scheme" content="dark">
	const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
	const metaContent = meta?.content.toLowerCase()
	if (metaContent === 'dark' || metaContent === 'only dark') return true

	// Check the computed color-scheme CSS property on :root
	const rootStyle = window.getComputedStyle(document.documentElement)
	const colorScheme = rootStyle.getPropertyValue('color-scheme').trim().toLowerCase()
	return colorScheme === 'dark' || colorScheme === 'only dark'
}

/**
 * Checks the background color of the body element to determine if the page is dark.
 */
function isBackgroundDark() {
	// We check both <html> and <body> because some pages set the color on <html>
	const htmlStyle = window.getComputedStyle(document.documentElement)
	const bodyStyle = window.getComputedStyle(document.body || document.documentElement)

	// Get background colors
	const htmlBgColor = htmlStyle.backgroundColor
	const bodyBgColor = bodyStyle.backgroundColor

	// The body's background might be transparent, in which case we should
	// fall back to the html element's background.
	if (isColorDark(bodyBgColor)) {
		return true
	} else if (bodyBgColor === 'transparent' || bodyBgColor.startsWith('rgba(0, 0, 0, 0)')) {
		return isColorDark(htmlBgColor)
	}

	return false
}

/**
 * Checks if the text color on the body is light, which implies a dark background.
 */
function isTextColorLight() {
	/** Luminance (0-255) above which body text is considered light */
	const LIGHT_TEXT_LUMINANCE = 200

	const bodyStyle = window.getComputedStyle(document.body || document.documentElement)
	const luminance = getLuminance(bodyStyle.color)

	// Light text has high luminance (e.g. white text on dark bg)
	return luminance !== null && luminance > LIGHT_TEXT_LUMINANCE
}

/**
 * Checks the background color of major layout elements (#app, #root, etc.).
 * Many SPAs render into a container that may have its own dark background while
 * <body> remains transparent.
 */
function isMainContentBackgroundDark() {
	const { innerWidth: vw, innerHeight: vh } = window
	const minArea = vw * vh * 0.5

	const selectors = ['#app', '#root', '#__next']
	for (const selector of selectors) {
		const el = document.querySelector(selector)
		if (!el) continue

		const rect = el.getBoundingClientRect()
		if (rect.width * rect.height < minArea) continue

		if (isColorDark(window.getComputedStyle(el).backgroundColor)) return true
	}
	return false
}

// --- utils ---

/**
 * Parses an RGB or RGBA color string and returns an object with r, g, b properties.
 * @param {string} colorString - e.g., "rgb(34, 34, 34)" or "rgba(0, 0, 0, 0.5)"
 * @returns {{r: number, g: number, b: number}|null}
 */
function parseRgbColor(colorString: string) {
	const rgbMatch = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(colorString)
	if (!rgbMatch) {
		return null // Not a valid rgb/rgba string
	}
	return {
		r: parseInt(rgbMatch[1]),
		g: parseInt(rgbMatch[2]),
		b: parseInt(rgbMatch[3]),
	}
}

/**
 * Calculates the perceived luminance (0-255) of a CSS color string.
 * @param {string} colorString - e.g., "rgb(50, 50, 50)" or "rgba(0, 0, 0, 0.5)"
 * @returns {number|null} - The luminance, or null if the color is transparent or unparseable.
 */
function getLuminance(colorString: string): number | null {
	if (!colorString || colorString === 'transparent' || colorString.startsWith('rgba(0, 0, 0, 0)')) {
		return null // Transparent has no meaningful luminance
	}

	const rgb = parseRgbColor(colorString)
	if (!rgb) {
		return null // Could not parse color
	}

	// Standard perceived luminance formula
	return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
}

/**
 * Determines if a color is "dark" based on its calculated luminance.
 * @param {string} colorString - The CSS color string (e.g., "rgb(50, 50, 50)").
 * @param {number} threshold - A value between 0 and 255. Colors with luminance below this will be considered dark. Default is 128.
 */
function isColorDark(colorString: string, threshold = 128) {
	const luminance = getLuminance(colorString)
	return luminance !== null && luminance < threshold
}
