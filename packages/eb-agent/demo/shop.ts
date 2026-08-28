/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * §22 demo — a small shop that proves the whole architecture in one workflow:
 *
 *   WebMCP + structured tools + DOM fallback + human approval
 *
 * `search_products`, `get_product`, `add_to_cart` and `checkout` are declared as
 * real WebMCP tools. `apply_coupon` is deliberately left WITHOUT one — it exists
 * only as a form — so the capability layer has to generate it from the UI and
 * execute it through the DOM. That contrast is the point of the demo.
 */
import type { AuditEvent, Capability } from '@eb-agent/capabilities'
import { CapabilityManager } from '@eb-agent/core'
import { PageController } from '@eb-agent/page-controller'
import { CapabilityDashboard, type CapabilityDashboardAdapter } from '@eb-agent/ui'

interface Product {
	id: string
	name: string
	price: number
	rating: number
	sizes: number[]
}

const PRODUCTS: Product[] = [
	{ id: 'p1', name: 'Trail Runner Pro', price: 4299, rating: 4.6, sizes: [8, 9, 10] },
	{ id: 'p2', name: 'City Jogger Lite', price: 3150, rating: 4.2, sizes: [7, 8, 9] },
	{ id: 'p3', name: 'Marathon Elite', price: 8999, rating: 4.9, sizes: [9, 10, 11] },
	{ id: 'p4', name: 'Daily Trainer', price: 2499, rating: 3.9, sizes: [8, 9] },
	{ id: 'p5', name: 'Studio Flex', price: 4850, rating: 4.7, sizes: [9, 10] },
]

const cart: { product: Product; size: number }[] = []
let coupon: string | null = null
let lastResults: Product[] = PRODUCTS

const rupees = (paise: number) => `₹${paise.toLocaleString('en-IN')}`

// ─────────────────────────────────────────────────────────────────────────────
// The application's own logic. The tools below call exactly these functions —
// nothing is reimplemented for the agent's benefit.
// ─────────────────────────────────────────────────────────────────────────────

function searchProducts(query: string, maxPrice?: number): Product[] {
	const q = (query ?? '').toLowerCase()
	lastResults = PRODUCTS.filter(
		(product) =>
			(!q || product.name.toLowerCase().includes(q)) &&
			(maxPrice === undefined || product.price <= maxPrice)
	)
	renderResults()
	return lastResults
}

function addToCart(productId: string, size: number): string {
	const product = PRODUCTS.find((candidate) => candidate.id === productId)
	if (!product) throw new Error(`No product with id "${productId}"`)
	if (!product.sizes.includes(size)) {
		throw new Error(
			`Size ${size} unavailable for ${product.name}. Available: ${product.sizes.join(', ')}`
		)
	}
	cart.push({ product, size })
	renderCart()
	return `Added ${product.name} (size ${size}) to the cart.`
}

function applyCoupon(code: string): string {
	coupon = code.trim().toUpperCase()
	renderCart()
	return `Coupon ${coupon} applied.`
}

function checkout(): string {
	if (cart.length === 0) throw new Error('The cart is empty.')
	const total = cart.reduce((sum, item) => sum + item.product.price, 0)
	const discount = coupon === 'RUN10' ? Math.round(total * 0.1) : 0
	const order = `ORD-${Math.floor(Math.random() * 9000 + 1000)}`
	cart.length = 0
	coupon = null
	renderCart()
	log(`Order ${order} placed for ${rupees(total - discount)}`)
	return `Order ${order} placed. Total ${rupees(total - discount)} (discount ${rupees(discount)}).`
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderResults(): void {
	const list = document.getElementById('results')!
	list.innerHTML = lastResults
		.map(
			(product) => `
			<li>
				<strong>${product.name}</strong>
				<span>${rupees(product.price)} · ★ ${product.rating} · sizes ${product.sizes.join('/')}</span>
			</li>`
		)
		.join('')
}

function renderCart(): void {
	const list = document.getElementById('cart')!
	const total = cart.reduce((sum, item) => sum + item.product.price, 0)
	list.innerHTML = cart.length
		? cart
				.map(
					(item) =>
						`<li>${item.product.name} — size ${item.size} — ${rupees(item.product.price)}</li>`
				)
				.join('') +
			`<li class="total">Total ${rupees(total)}${coupon ? ` · coupon ${coupon}` : ''}</li>`
		: '<li class="empty">Cart is empty</li>'
}

function log(message: string): void {
	const el = document.getElementById('log')!
	const line = document.createElement('div')
	line.textContent = `${new Date().toLocaleTimeString()}  ${message}`
	el.prepend(line)
}

// ─────────────────────────────────────────────────────────────────────────────
// WebMCP: four real tools, declared by the application itself.
// `apply_coupon` is intentionally absent.
// ─────────────────────────────────────────────────────────────────────────────

interface ModelContextLike {
	registerTool?: (tool: unknown, options?: unknown) => Promise<unknown>
}

async function declareWebMCPTools(): Promise<number> {
	const modelContext = (document as unknown as { modelContext?: ModelContextLike }).modelContext
	if (typeof modelContext?.registerTool !== 'function') return 0

	const tools = [
		{
			name: 'search_products',
			description: 'Search the catalogue by name, optionally capped at a maximum price in paise.',
			inputSchema: {
				type: 'object',
				properties: {
					query: { type: 'string', description: 'Text to match against product names' },
					maxPrice: { type: 'number', description: 'Maximum price in paise' },
				},
				required: ['query'],
			},
			annotations: { readOnlyHint: true },
			execute: ({ query, maxPrice }: { query: string; maxPrice?: number }) => ({
				content: [
					{
						type: 'text',
						text: JSON.stringify(searchProducts(query, maxPrice)),
					},
				],
			}),
		},
		{
			name: 'get_product',
			description: 'Get full details for one product by id.',
			inputSchema: {
				type: 'object',
				properties: { productId: { type: 'string' } },
				required: ['productId'],
			},
			annotations: { readOnlyHint: true },
			execute: ({ productId }: { productId: string }) => ({
				content: [
					{
						type: 'text',
						text: JSON.stringify(PRODUCTS.find((product) => product.id === productId) ?? null),
					},
				],
			}),
		},
		{
			name: 'add_to_cart',
			description: 'Add a product to the cart in a given size.',
			inputSchema: {
				type: 'object',
				properties: { productId: { type: 'string' }, size: { type: 'number' } },
				required: ['productId', 'size'],
			},
			execute: ({ productId, size }: { productId: string; size: number }) => ({
				content: [{ type: 'text', text: addToCart(productId, size) }],
			}),
		},
		{
			name: 'checkout',
			description: 'Place the order for everything currently in the cart.',
			inputSchema: { type: 'object', properties: {} },
			execute: () => ({ content: [{ type: 'text', text: checkout() }] }),
		},
	]

	let declared = 0
	for (const tool of tools) {
		try {
			await modelContext.registerTool(tool)
			declared++
		} catch (error) {
			console.warn('Failed to declare', tool.name, error)
		}
	}
	return declared
}

// ─────────────────────────────────────────────────────────────────────────────
// The capability layer, driven directly so the demo needs no LLM or API key.
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	renderResults()
	renderCart()

	// The coupon form is plain DOM — no tool declared for it anywhere.
	document.getElementById('coupon-form')!.addEventListener('submit', (event) => {
		event.preventDefault()
		const input = document.getElementById('coupon-code') as HTMLInputElement
		if (input.value.trim()) log(applyCoupon(input.value))
	})

	document.getElementById('search-form')!.addEventListener('submit', (event) => {
		event.preventDefault()
		const input = document.getElementById('search-query') as HTMLInputElement
		searchProducts(input.value)
		log(`Searched for "${input.value}" — ${lastResults.length} result(s)`)
	})

	const declared = await declareWebMCPTools()

	const audits: AuditEvent[] = []
	const pageController = new PageController({ enableMask: false })

	// A CapabilityManager needs an agent for its page controller and ask_user
	// fallback. The demo drives the layer directly, so a minimal stand-in is enough.
	const agentStub = {
		id: 'demo-session',
		pageController,
		onAskUser: undefined,
	}

	const capabilities = new CapabilityManager(agentStub as never, {
		generateFromDom: true,
		// §18: watch the application's own API calls and offer them as capabilities.
		discoverApis: true,
		minConfidence: 0.5,
		onAudit: (event) => {
			audits.unshift(event)
			renderAudit(audits)
		},
		// §16: the human gate. Only `consequential` capabilities reach this.
		onApproval: async ({ summary }) => confirm(`eb-agent wants to:\n\n${summary}\n\nProceed?`),
	})

	await capabilities.refresh(window.location.href)

	renderCapabilities(capabilities)

	const stats = capabilities.stats(window.location.href)
	document.getElementById('status')!.textContent = stats.webmcpSupported
		? `WebMCP live · ${declared} tool(s) declared by this page · ${stats.total} capabilities in the registry`
		: `WebMCP unavailable in this browser · ${stats.total} capabilities generated from the UI · ` +
			`enable chrome://flags/#enable-webmcp-testing to see native discovery`

	// §24: the customer-facing review screen.
	const dashboard = new CapabilityDashboard(capabilities as unknown as CapabilityDashboardAdapter)
	document.getElementById('review')!.addEventListener('click', () => {
		dashboard.open()
	})

	// Expose for console poking.
	Object.assign(window, { capabilities, dashboard, PRODUCTS, cart })
}

function renderCapabilities(capabilities: CapabilityManager): void {
	const list = document.getElementById('capabilities')!
	const exposed = capabilities.exposed(window.location.href)

	list.innerHTML = exposed
		.map((capability: Capability) => {
			const parameters = Object.keys(capability.inputSchema.properties ?? {}).join(', ')
			return `
				<li class="cap cap--${capability.source}">
					<code>${capability.name}(${parameters})</code>
					<span class="badges">
						<span class="badge badge--${capability.source}">${capability.source.replace('_', ' ')}</span>
						<span class="badge badge--${capability.risk}">${capability.risk}</span>
						<span class="badge">confidence ${capability.confidence}</span>
					</span>
					<p>${capability.description}</p>
					<button data-capability="${capability.name}">Run</button>
				</li>`
		})
		.join('')

	list.querySelectorAll('button[data-capability]').forEach((button) => {
		button.addEventListener('click', () => {
			void runCapability(capabilities, (button as HTMLElement).dataset.capability!)
		})
	})
}

/** Execute a capability through the full policy → approval → audit pipeline. */
async function runCapability(capabilities: CapabilityManager, name: string): Promise<void> {
	const capability = capabilities.registry.getByName(name)
	if (!capability) return

	const input: Record<string, unknown> = {}
	for (const [key, schema] of Object.entries(capability.inputSchema.properties ?? {})) {
		const answer = prompt(`${name} — ${key}${schema.description ? ` (${schema.description})` : ''}`)
		if (answer === null) return
		if (answer !== '') input[key] = schema.type === 'number' ? Number(answer) : answer
	}

	try {
		const result = await capabilities.engine.execute(capability, input, {
			signal: new AbortController().signal,
			page: window.location.href,
		})
		log(`${name} → ${result.content.slice(0, 200)}`)
	} catch (error) {
		log(`${name} ✗ ${error instanceof Error ? error.message : String(error)}`)
	}
}

function renderAudit(audits: AuditEvent[]): void {
	const el = document.getElementById('audit')!
	el.innerHTML = audits
		.slice(0, 12)
		.map(
			(event) => `<tr>
				<td>${event.tool}</td>
				<td>${event.executionType}</td>
				<td>${event.risk}</td>
				<td>${event.approved === undefined ? '—' : event.approved ? 'yes' : 'no'}</td>
				<td class="status--${event.status}">${event.status}</td>
				<td>${event.durationMs}ms</td>
			</tr>`
		)
		.join('')
}

void main()
