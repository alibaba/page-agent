/**
 * Checks for common dark mode CSS classes on the html or body elements.
 * @returns {boolean} - True if a common dark mode class is found.
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

	// Some sites use data attributes (data-theme, data-color-mode, data-bs-theme, etc.)
	const dataAttrs = ['data-theme', 'data-color-mode', 'data-bs-theme', 'data-color-scheme']
	for (const attr of dataAttrs) {
		const bodyValue = bodyElement?.getAttribute(attr)
		const htmlValue = htmlElement.getAttribute(attr)

		if (bodyValue?.toLowerCase().includes('dark') || htmlValue?.toLowerCase().includes('dark')) {
			return true
		}
	}

	return false
}

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
 * Determines if a color is "dark" based on its calculated luminance.
 * @param {string} colorString - The CSS color string (e.g., "rgb(50, 50, 50)").
 * @param {number} threshold - A value between 0 and 255. Colors with luminance below this will be considered dark. Default is 128.
 * @returns {boolean} - True if the color is considered dark.
 */
function isColorDark(colorString: string, threshold = 128) {
	if (!colorString || colorString === 'transparent' || colorString.startsWith('rgba(0, 0, 0, 0)')) {
		return false // Transparent is not dark
	}

	const rgb = parseRgbColor(colorString)
	if (!rgb) {
		return false // Could not parse color
	}

	// Calculate perceived luminance using the standard formula
	const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b

	return luminance < threshold
}

/**
 * Checks the background color of the body element to determine if the page is dark.
 * @returns {boolean}
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
 * Checks the CSS `color-scheme` property and `<meta name="color-scheme">` tag.
 * @returns {boolean | null} - True/false if deterministic, null if inconclusive.
 */
function getColorSchemePreference(): boolean | null {
	// Check <meta name="color-scheme" content="dark">
	const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
	if (meta) {
		const content = meta.content.toLowerCase()
		// "dark" or "only dark" → dark; "light dark" is ambiguous so skip
		if (content === 'dark' || content === 'only dark') return true
		if (content === 'light' || content === 'only light') return false
	}

	// Check the computed color-scheme CSS property on :root
	const rootStyle = window.getComputedStyle(document.documentElement)
	const colorScheme = rootStyle.getPropertyValue('color-scheme').trim().toLowerCase()
	if (colorScheme === 'dark' || colorScheme === 'only dark') return true
	if (colorScheme === 'light' || colorScheme === 'only light') return false

	return null
}

/**
 * Checks if the text color on the body is light, which implies a dark background.
 * @returns {boolean}
 */
function isTextColorLight() {
	const bodyStyle = window.getComputedStyle(document.body || document.documentElement)
	const textColor = bodyStyle.color

	const rgb = parseRgbColor(textColor)
	if (!rgb) return false

	// Light text has high luminance (e.g. white text on dark bg)
	const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
	return luminance > 180
}

/**
 * Checks the background color of major layout elements (<main>, #app, #root, etc.).
 * Many SPAs render into a container that may have its own dark background while
 * <body> remains transparent.
 * @returns {boolean}
 */
function isMainContentDark() {
	const selectors = ['main', '#app', '#root', '#__next', '[role="main"]']
	for (const selector of selectors) {
		const el = document.querySelector(selector)
		if (!el) continue

		const style = window.getComputedStyle(el)
		if (isColorDark(style.backgroundColor)) {
			return true
		}
	}
	return false
}

/**
 * A comprehensive function to determine if the page is currently in a dark theme.
 * It combines class checking and background color analysis.
 * @returns {boolean} - True if the page is likely dark.
 */
export function isPageDark() {
	try {
		// Strategy 1: Check for common dark mode classes and data attributes
		if (hasDarkModeClass()) {
			return true
		}

		// Strategy 2: Check CSS color-scheme property and meta tag
		const colorScheme = getColorSchemePreference()
		if (colorScheme !== null) {
			return colorScheme
		}

		// Strategy 3: Analyze the computed background color of <html>/<body>
		if (isBackgroundDark()) {
			return true
		}

		// Strategy 4: Check background of major layout containers (<main>, #app, etc.)
		if (isMainContentDark()) {
			return true
		}

		// Strategy 5: Check if text color is light (implies dark background)
		if (isTextColorLight()) {
			return true
		}

		return false
	} catch (error) {
		console.warn('Error determining if page is dark:', error)
		return false
	}
}
