#!/usr/bin/env node
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const EXT_ID = 'akldabonmimlicnjlflnapfeklbfemhj'
const STORE_URL = `https://chromewebstore.google.com/detail/page-agent-ext/${EXT_ID}`
const LOOPBACK_HOST = 'localhost'

const launcherTemplate = readFileSync(
	fileURLToPath(new URL('./launcher.html', import.meta.url)),
	'utf-8'
)

/**
 * HTTP + WebSocket bridge to the hub.html extension tab.
 * - HTTP serves the launcher page (triggers extension to open hub)
 * - WS carries execute/stop commands and result/error responses
 */
export class HubBridge {
	/** @type {number} */
	port

	/** @type {string} */
	wsToken

	/** @type {http.Server} */
	#httpServer

	/** @type {WebSocketServer} */
	#wss

	/** @type {import('ws').WebSocket | null} */
	#hub = null

	/** @type {{ resolve: (r: {success: boolean, data: string}) => void, reject: (e: Error) => void } | null} */
	#pendingTask = null

	/** @param {number} port */
	constructor(port) {
		this.port = port
		this.wsToken = crypto.randomUUID()
		this.#httpServer = http.createServer((req, res) => {
			// secure endpoint for launcher to fetch token
			if (req.url === '/auth-token' && req.headers['x-requested-with'] === 'XMLHttpRequest') {
				res.writeHead(200, { 'Content-Type': 'application/json' })
				res.end(JSON.stringify({ token: this.wsToken }))
				return
			}

			// serve launcher without the token
			const html = launcherTemplate
				.replaceAll('__EXT_ID__', EXT_ID)
				.replaceAll('__STORE_URL__', STORE_URL)
				.replaceAll('__WS_PORT__', String(port))
			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
			res.end(html)
		})
		this.#wss = new WebSocketServer({ server: this.#httpServer })
		this.#wss.on('connection', (ws) => this.#onConnection(ws))
	}

	/** @returns {Promise<void>} */
	async start() {
		return new Promise((resolve, reject) => {
			this.#httpServer.on('error', (/** @type {NodeJS.ErrnoException} */ err) => {
				if (err.code === 'EADDRINUSE') {
					reject(
						new Error(`Port ${this.port} is in use. Another Page Agent MCP server may be running.`)
					)
				} else {
					reject(err)
				}
			})
			this.#httpServer.listen(this.port, LOOPBACK_HOST, () => {
				console.error(`[page-agent-mcp] HTTP + WS on http://${LOOPBACK_HOST}:${this.port}`)
				// token is not printed to stderr to prevent credential leaks
				resolve()
			})
		})
	}

	get connected() {
		return this.#hub?.readyState === 1
	}

	get busy() {
		return this.#pendingTask !== null
	}

	/**
	 * @param {string} task
	 * @param {Record<string, unknown>} [config]
	 * @returns {Promise<{success: boolean, data: string}>}
	 */
	async executeTask(task, config) {
		if (!this.connected) throw new Error('Hub is not connected. Is the extension running?')
		if (this.#pendingTask) throw new Error('Agent is already running a task.')

		return new Promise((resolve, reject) => {
			this.#pendingTask = { resolve, reject }
			if (this.#hub) {
				this.#hub.send(JSON.stringify({ type: 'execute', task, config }))
			}
		})
	}

	stopTask() {
		if (this.connected && this.#hub) {
			this.#hub.send(JSON.stringify({ type: 'stop' }))
		}
	}

	// TODO: Add version checking

	/** @param {import('ws').WebSocket} ws */
	#onConnection(ws) {
		let candidate = ws
		let authenticated = false

		console.error('[page-agent-mcp] Hub connected, awaiting auth handshake...')

		// auth handshake: expect { type: 'auth', token } within 3s
		const authTimeout = setTimeout(() => {
			if (!authenticated) {
				ws.close(4003, 'Unauthorized: Handshake timeout')
			}
		}, 3000)

		ws.on('message', (/** @type {Buffer} */ rawData) => {
			/** @type {{ type: string, success?: boolean, data?: string, message?: string, token?: string }} */
			let msg
			try {
				msg = JSON.parse(rawData.toString('utf-8'))
			} catch {
				return
			}

			if (!authenticated) {
				if (msg.type === 'auth' && msg.token === this.wsToken) {
					authenticated = true
					clearTimeout(authTimeout)
					this.#promoteCandidate(candidate)
					console.error('[page-agent-mcp] Hub authenticated successfully')
				} else {
					ws.close(4003, 'Unauthorized: Invalid token')
				}
				return
			}

			// only the active hub can resolve tasks
			if (this.#hub !== ws) return

			if (msg.type === 'result') {
				this.#pendingTask?.resolve({ success: msg.success ?? false, data: msg.data ?? '' })
				this.#pendingTask = null
			} else if (msg.type === 'error') {
				this.#pendingTask?.reject(new Error(msg.message ?? 'Unknown error from hub'))
				this.#pendingTask = null
			}
		})

		ws.on('close', () => {
			if (authenticated && this.#hub === ws) {
				console.error('[page-agent-mcp] Hub disconnected')
				if (this.#pendingTask) {
					this.#pendingTask.reject(new Error('Hub disconnected while task was running'))
					this.#pendingTask = null
				}
				this.#hub = null
			}
		})
	}

	/** @param {import('ws').WebSocket} candidate */
	#promoteCandidate(candidate) {
		// if an active hub exists, check if it is still fully open
		if (this.#hub) {
			if (this.#hub.readyState === 1) {
				// active hub is fully open, reject the candidate
				candidate.close(4000, 'Another hub is already connected')
				return
			} else {
				// active hub is closing or closed, cleanup its pending task before replacing
				if (this.#pendingTask) {
					this.#pendingTask.reject(new Error('Hub was replaced while a task was pending'))
					this.#pendingTask = null
				}
			}
		}
		this.#hub = candidate
	}

	/**
	 * @returns {Promise<void>}
	 */
	async close() {
		return new Promise((resolve) => {
			if (this.#pendingTask) {
				this.#pendingTask.reject(new Error('Bridge is closing'))
				this.#pendingTask = null
			}
			if (this.#hub) {
				this.#hub.terminate()
				this.#hub = null
			}
			this.#wss.close()
			this.#httpServer.close(() => resolve())
			// fallback for windows handle leaks during tests
			setTimeout(resolve, 100)
		})
	}
}
