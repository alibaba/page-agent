import { beforeEach, describe, expect, it } from 'vitest'

import { scanDomCapabilities } from './domScanner'

/**
 * happy-dom reports zero-size rects for everything, so the scanner's visibility
 * check would reject every element. Stub a real box for elements that are not
 * explicitly hidden — the check itself is exercised via `display: none` below.
 */
beforeEach(() => {
	document.body.innerHTML = ''
	Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
		configurable: true,
		value(this: HTMLElement) {
			const style = this.getAttribute('style') ?? ''
			const hidden = style.includes('display: none') || style.includes('display:none')
			return hidden
				? { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }
				: { width: 200, height: 30, top: 0, left: 0, right: 200, bottom: 30 }
		},
	})
})

describe('scanDomCapabilities', () => {
	it('turns a labelled form into one business action, not one tool per field', () => {
		document.body.innerHTML = `
			<form>
				<legend>Customer Search</legend>
				<label for="name">Name</label>
				<input id="name" name="name" />
				<label for="status">Status</label>
				<select id="status" name="status">
					<option>Active</option>
					<option>Inactive</option>
				</select>
				<button type="submit">Search</button>
			</form>
		`

		const capabilities = scanDomCapabilities()

		expect(capabilities).toHaveLength(1)

		const [capability] = capabilities
		expect(capability.name).toBe('search_customer')
		expect(capability.risk).toBe('read')
		expect(capability.fields.map((field) => field.name)).toEqual(['name', 'status'])
		expect(capability.fields[1].options).toEqual(['Active', 'Inactive'])
		expect(capability.submit?.label).toBe('Search')
	})

	it('classifies a destructive action as consequential', () => {
		document.body.innerHTML = `
			<form>
				<h3>Delete Account</h3>
				<label for="confirm">Confirmation</label>
				<input id="confirm" name="confirm" required />
				<button type="submit">Delete</button>
			</form>
		`

		const [capability] = scanDomCapabilities()

		expect(capability.risk).toBe('consequential')
		expect(capability.name.startsWith('delete')).toBe(true)
		expect(capability.fields[0].required).toBe(true)
	})

	it('treats a save form as reversible', () => {
		document.body.innerHTML = `
			<form>
				<legend>New Customer</legend>
				<label for="e">Email</label>
				<input id="e" name="email" />
				<button type="submit">Save</button>
			</form>
		`

		const [capability] = scanDomCapabilities()

		expect(capability.risk).toBe('reversible')
	})

	it('never emits a capability it cannot commit', () => {
		document.body.innerHTML = `
			<form>
				<label for="q">Query</label>
				<input id="q" name="q" />
			</form>
		`

		expect(scanDomCapabilities()).toHaveLength(0)
	})

	it('skips hidden and disabled inputs', () => {
		document.body.innerHTML = `
			<form>
				<legend>Customer Search</legend>
				<input type="hidden" name="csrf" value="x" />
				<label for="q">Query</label>
				<input id="q" name="q" />
				<input name="locked" disabled />
				<button type="submit">Search</button>
			</form>
		`

		const [capability] = scanDomCapabilities()

		// Parameter names come from the visible label, which reads better than the
		// terse `name` attribute the markup happens to use.
		expect(capability.fields.map((field) => field.name)).toEqual(['query'])
	})

	it('ignores a form that is not displayed', () => {
		document.body.innerHTML = `
			<form style="display: none">
				<label for="q">Query</label>
				<input id="q" name="q" />
				<button type="submit">Search</button>
			</form>
		`

		expect(scanDomCapabilities()).toHaveLength(0)
	})

	it('scores a semantic form higher than a bare div, and never fully certain', () => {
		document.body.innerHTML = `
			<form>
				<legend>Customer Search</legend>
				<label for="q">Query</label>
				<input id="q" name="q" />
				<button type="submit">Search</button>
			</form>
			<div id="loose">
				<input name="other" />
				<button>Go</button>
			</div>
		`

		const capabilities = scanDomCapabilities()
		const form = capabilities.find((capability) => capability.name === 'search_customer')!
		const loose = capabilities.find((capability) => capability.name !== 'search_customer')!

		expect(form.confidence).toBeGreaterThan(loose.confidence)
		expect(form.confidence).toBeLessThan(1)
	})

	it('disambiguates two forms that generate the same name', () => {
		document.body.innerHTML = `
			<form>
				<legend>Customer Search</legend>
				<label for="a">Name</label><input id="a" name="a" />
				<button type="submit">Search</button>
			</form>
			<form>
				<legend>Customer Search</legend>
				<label for="b">Name</label><input id="b" name="b" />
				<button type="submit">Search</button>
			</form>
		`

		const names = scanDomCapabilities().map((capability) => capability.name)

		expect(new Set(names).size).toBe(names.length)
	})

	it('prefers a stable test hook over a generated id when building locators', () => {
		document.body.innerHTML = `
			<form>
				<legend>Customer Search</legend>
				<label for=":r1:">Name</label>
				<input id=":r1:" data-testid="customer-name" />
				<button type="submit">Search</button>
			</form>
		`

		const [capability] = scanDomCapabilities()

		expect(capability.fields[0].locator.selector).toBe('[data-testid="customer-name"]')
	})
})
