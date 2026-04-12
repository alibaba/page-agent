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

	// Some sites use data attributes
	const darkThemeAttribute = htmlElement.getAttribute('data-theme')
	if (darkThemeAttribute?.toLowerCase().includes('dark')) {
		return true
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
 * Checks the prefers-color-scheme media query for dark mode.
 * @returns {boolean} - True if the system prefers a dark color scheme.
 */
function prefersDarkColorScheme() {
	return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/**
 * A comprehensive function to determine if the page is currently in a dark theme.
 * It combines class checking, system preference, and background color analysis.
 * @returns {boolean} - True if the page is likely dark.
 */
export function isPageDark() {
	try {
		// Strategy 1: Check for common dark mode classes
		if (hasDarkModeClass()) {
			return true
		}

		// Strategy 2: Check system-level prefers-color-scheme
		if (prefersDarkColorScheme()) {
			return true
		}

		// Strategy 3: Analyze the computed background color
		if (isBackgroundDark()) {
			return true
		}

		return false
	} catch (error) {
		console.warn('Error determining if page is dark:', error)
		return false
	}
}
