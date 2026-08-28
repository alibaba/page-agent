/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * Capability review dashboard (§24).
 *
 * @remarks
 * The customer-facing half of "add the snippet, get agent tools": it reports what
 * eb-agent discovered, separates what it is confident about from what needs a
 * human, and lets the customer approve, rename or reject each inferred capability
 * before external agents can call it.
 *
 * Declared capabilities (the site's own WebMCP tools, developer-registered tools,
 * remote MCP tools) are shown but need no approval — someone wrote them on purpose.
 */
import type { CapabilityDashboardAdapter, DashboardCapability, DashboardReviewState } from './types'

import styles from './CapabilityDashboard.module.css'

const SOURCE_LABELS: Record<string, string> = {
	native_webmcp: 'declared by page',
	developer_defined: 'declared by developer',
	remote_mcp: 'remote MCP',
	api: 'from API',
	dom: 'from UI',
	generated: 'generated',
}

const SOURCE_BADGE: Record<string, string> = {
	native_webmcp: styles.badgeNative,
	developer_defined: styles.badgeNative,
	remote_mcp: styles.badgeRemote,
	api: styles.badgeApi,
}

export interface CapabilityDashboardConfig {
	/** Restrict the inventory to one page. Omit to show everything registered. */
	page?: string
	/** Mount point. Defaults to `document.body`. */
	container?: HTMLElement
}

export class CapabilityDashboard {
	readonly #adapter: CapabilityDashboardAdapter
	readonly #config: CapabilityDashboardConfig
	readonly #overlay: HTMLElement
	readonly #countsRow: HTMLElement
	readonly #summary: HTMLElement
	readonly #list: HTMLElement
	#open = false

	constructor(adapter: CapabilityDashboardAdapter, config: CapabilityDashboardConfig = {}) {
		this.#adapter = adapter
		this.#config = config

		this.#overlay = document.createElement('div')
		this.#overlay.className = `${styles.overlay} ${styles.hidden}`
		// The host page's own styles must not leak into the dashboard.
		this.#overlay.setAttribute('data-eb-agent-not-interactive', '')

		const panel = document.createElement('div')
		panel.className = styles.panel

		const header = document.createElement('div')
		header.className = styles.header

		const headerText = document.createElement('div')
		const title = document.createElement('h2')
		title.className = styles.title
		title.textContent = 'Agent capabilities'
		this.#summary = document.createElement('p')
		this.#summary.className = styles.summary
		headerText.append(title, this.#summary)

		const close = document.createElement('button')
		close.className = styles.close
		close.type = 'button'
		close.textContent = '×'
		close.setAttribute('aria-label', 'Close')
		close.addEventListener('click', () => this.close())

		header.append(headerText, close)

		this.#countsRow = document.createElement('div')
		this.#countsRow.className = styles.counts

		this.#list = document.createElement('ul')
		this.#list.className = styles.list

		panel.append(header, this.#countsRow, this.#list)
		this.#overlay.append(panel)

		// Clicking the backdrop (but not the panel) closes.
		this.#overlay.addEventListener('click', (event) => {
			if (event.target === this.#overlay) this.close()
		})

		;(config.container ?? document.body).append(this.#overlay)
	}

	get isOpen(): boolean {
		return this.#open
	}

	open(): void {
		this.#open = true
		this.#overlay.classList.remove(styles.hidden)
		this.render()
	}

	close(): void {
		this.#open = false
		this.#overlay.classList.add(styles.hidden)
	}

	toggle(): void {
		if (this.#open) this.close()
		else this.open()
	}

	/** Re-read the inventory and repaint. Safe to call while closed. */
	render(): void {
		const page = this.#config.page
		const stats = this.#adapter.stats(page)
		const inventory = this.#adapter.inventory(page)

		this.#summary.textContent = stats.webmcpSupported
			? `WebMCP available · ${stats.published} tool(s) published to external agents`
			: 'WebMCP unavailable in this browser — capabilities still drive eb-agent itself'

		this.#countsRow.replaceChildren(
			this.#count(`${stats.total} discovered`, true),
			this.#count(`${stats.approved} approved`),
			this.#count(`${stats.pending} need review`),
			this.#count(`${stats.rejected} rejected`),
			this.#count(`${stats.remoteServers} MCP server(s)`)
		)

		if (inventory.length === 0) {
			const empty = document.createElement('li')
			empty.className = styles.empty
			empty.textContent = 'No capabilities discovered on this page yet.'
			this.#list.replaceChildren(empty)
			return
		}

		// Things needing a human first — that is what the customer came here for.
		const ordered = [...inventory].sort((a, b) => rank(a.state) - rank(b.state))

		this.#list.replaceChildren(...ordered.map((entry) => this.#row(entry.capability, entry.state)))
	}

	#badge(text: string, variant?: string): HTMLElement {
		const badge = document.createElement('span')
		badge.className = variant ? `${styles.badge} ${variant}` : styles.badge
		badge.textContent = text
		return badge
	}

	#count(text: string, strong = false): HTMLElement {
		const element = document.createElement('span')
		element.className = strong ? `${styles.count} ${styles.countStrong}` : styles.count
		element.textContent = text
		return element
	}

	#row(capability: DashboardCapability, state: DashboardReviewState): HTMLElement {
		const row = document.createElement('li')
		row.className = state === 'rejected' ? `${styles.row} ${styles.rowRejected}` : styles.row

		const head = document.createElement('div')
		head.className = styles.rowHead

		const name = document.createElement('span')
		name.className = styles.name
		const parameters = Object.keys(capability.inputSchema?.properties ?? {})
		name.textContent = `${capability.name}(${parameters.join(', ')})`

		head.append(
			name,
			this.#badge(
				SOURCE_LABELS[capability.source] ?? capability.source,
				SOURCE_BADGE[capability.source]
			),
			this.#badge(
				capability.risk,
				capability.risk === 'consequential' ? styles.badgeConsequential : undefined
			)
		)

		// Confidence is only meaningful for things we inferred.
		if (capability.confidence < 1) {
			head.append(this.#badge(`confidence ${capability.confidence}`))
		}

		if (state === 'pending') head.append(this.#badge('needs review', styles.badgePending))

		const description = document.createElement('p')
		description.className = styles.description
		description.textContent = capability.description

		row.append(head, description)

		// Declared capabilities are contracts someone wrote; there is nothing to approve.
		const inferred =
			capability.source === 'dom' ||
			capability.source === 'generated' ||
			capability.source === 'api'

		if (inferred) row.append(this.#actions(capability, state))

		return row
	}

	#actions(capability: DashboardCapability, state: DashboardReviewState): HTMLElement {
		const actions = document.createElement('div')
		actions.className = styles.actions

		actions.append(
			this.#action('Approve', state === 'approved', () => this.#setState(capability, 'approved')),
			this.#action('Reject', state === 'rejected', () => this.#setState(capability, 'rejected')),
			this.#action('Rename…', false, () => this.#rename(capability))
		)

		return actions
	}

	#action(label: string, active: boolean, onClick: () => void): HTMLElement {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = active ? `${styles.button} ${styles.buttonActive}` : styles.button
		button.textContent = label
		button.addEventListener('click', onClick)
		return button
	}

	#setState(capability: DashboardCapability, state: DashboardReviewState): void {
		void this.#adapter.setReview(capability.id, state).then(() => this.render())
	}

	#rename(capability: DashboardCapability): void {
		const name = window.prompt('Capability name', capability.name)
		if (name === null) return

		const description = window.prompt('Description', capability.description)
		if (description === null) return

		// Editing is an implicit approval: the customer has looked at it and fixed it.
		void this.#adapter
			.setReview(capability.id, 'approved', {
				name: name.trim() || capability.name,
				description: description.trim() || capability.description,
			})
			.then(() => this.render())
	}

	dispose(): void {
		this.#overlay.remove()
	}
}

function rank(state: DashboardReviewState): number {
	if (state === 'pending') return 0
	if (state === 'approved') return 1
	return 2
}
