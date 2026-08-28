/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * A {@link WebMCPPort} for the extension.
 *
 * @remarks
 * The extension's agent runs in a side panel or an isolated content-script world,
 * neither of which can see a page's `document.modelContext`. This port proxies to
 * the main-world bridge in the *current tab* instead, so page-declared tools reach
 * the capability layer exactly as they do for the in-page library.
 *
 * Publishing is deliberately not supported here: registering tools into a page we
 * do not own would make the extension declare capabilities on someone else's
 * origin. The extension consumes what a page declares; it does not add to it.
 */
import type {
	Capability,
	CapabilityResult,
	WebMCPPort,
	WebMCPToolDescriptor,
} from '@eb-agent/capabilities'

import type { RemotePageController } from './RemotePageController'

export class RemoteWebMCPAdapter implements WebMCPPort {
	readonly #pageController: RemotePageController
	#supported = false
	#canDiscover = false

	constructor(pageController: RemotePageController) {
		this.#pageController = pageController
	}

	/**
	 * Probe the current tab before the capability layer consults the sync getters.
	 * Support is per-tab and per-navigation, so this re-probes on every refresh.
	 */
	async ready(): Promise<void> {
		const status = await this.#pageController.webmcpStatus()
		this.#supported = status.supported
		this.#canDiscover = status.canDiscover
	}

	isSupported(): boolean {
		return this.#supported
	}

	canDiscover(): boolean {
		return this.#canDiscover
	}

	async getTools(): Promise<WebMCPToolDescriptor[]> {
		return this.#pageController.webmcpGetTools()
	}

	async executeTool(
		tool: WebMCPToolDescriptor | string,
		args: unknown,
		signal?: AbortSignal
	): Promise<CapabilityResult> {
		signal?.throwIfAborted()
		const name = typeof tool === 'string' ? tool : tool.name
		return this.#pageController.webmcpExecuteTool(name, args)
	}

	/** Not supported: see the class remarks. */
	async registerCapability(_capability: Capability): Promise<boolean> {
		return false
	}

	async unregisterTool(_name: string): Promise<boolean> {
		return false
	}

	registeredNames(): string[] {
		return []
	}

	/**
	 * `toolchange` cannot be pushed across the service worker cheaply, so changes
	 * are picked up by re-probing in {@link ready} each step instead.
	 */
	onToolChange(_listener: () => void): () => void {
		return () => undefined
	}

	async dispose(): Promise<void> {
		this.#supported = false
		this.#canDiscover = false
	}
}
