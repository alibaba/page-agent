import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8')
const start = source.indexOf('function isInteractiveCandidate(element) {')
const end = source.indexOf('\n\t// --- Define constants for distinct interaction check ---', start)
const fnSource = source.slice(start, end)
const isInteractiveCandidate = new Function('Node', `${fnSource}; return isInteractiveCandidate;`)({
	ELEMENT_NODE: 1,
})

function makeElement(tagName, attrs = {}) {
	return {
		nodeType: 1,
		tagName,
		hasAttribute(name) {
			return Object.prototype.hasOwnProperty.call(attrs, name)
		},
		getAttribute(name) {
			return attrs[name] ?? null
		},
		getAttributeNames() {
			return Object.keys(attrs)
		},
	}
}

assert.equal(isInteractiveCandidate(makeElement('div', { 'aria-label': 'Search' })), true)
assert.equal(isInteractiveCandidate(makeElement('div', { 'aria-controls': 'popup-list' })), true)
assert.equal(isInteractiveCandidate(makeElement('div', { role: 'button' })), true)
assert.equal(isInteractiveCandidate(makeElement('div', {})), false)

console.log('isInteractiveCandidate tests passed')
