import type { PageAgent } from '../PageAgent'

// Find common React root elements and add data-page-agent-not-interactive attribute
export function patchReact(pageAgent: PageAgent) {
	const reactRootElements = document.querySelectorAll(
		'[data-reactroot], [data-reactid], [data-react-checksum], #root, #app, [id^="root-"], [id^="app-"], #adex-wrapper, #adex-root'
	)

	for (const element of reactRootElements) {
		element.setAttribute('data-page-agent-not-interactive', 'true')
	}
}

/**
 * @todo (Heavy, might have false negatives) Interaction detection, if element width/height equals body offsetWidth/Height, consider it root element and non-interactive (React often attaches many events to root elements, causing false positives)
 */
