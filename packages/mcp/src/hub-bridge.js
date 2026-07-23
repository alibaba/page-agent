#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { createReadStream, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import { basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'

const EXT_ID = 'akldabonmimlicnjlflnapfeklbfemhj'
const STORE_URL = `https://chromewebstore.google.com/detail/page-agent-ext/${EXT_ID}`
const LOOPBACK_HOST = 'localhost'

const launcherTemplate = readFileSync(
	fileURLToPath(new URL('./launcher.html', import.meta.url)),
	'utf-8'
)

/** Minimal ext → MIME map for common upload types */
const MIME_TYPES = {
	'.pdf': 'application/pdf',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.txt': 'text/plain',
	'.csv': 'text/csv',
	'.json': 'application/json',
	'.zip': 'application/zip',
	'.mp4': 'video/mp4',
	'.mp3': 'audio/mpeg',
	'.doc': 'application/msword',
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.xls': 'application/vnd.ms-excel',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

/**
 * HTTP + WebSocket bridge to the hub.html extension tab.
 * - HTTP serves the launcher page (triggers extension to open hub)
 * - WS carries execute/stop commands and result/error responses
 */
export class HubBridge {
	/** @type {number} */
	port

	/** @type {http.Server} */
	#httpServer

	/** @type {WebSocketServer} */
	#wss

	/** @type {import('ws').WebSocket | null} */
	#hub = null

	/** @type {{ resolve: (r: {success: boolean, data: string}) => void, reject: (e: Error) => void } | null} */
	#pendingTask = null

	/**
	 * Files offered to the current task, keyed by unguessable random id.
	 * Only registered paths are ever served — the HTTP bridge cannot be used
	 * to read arbitrary local files.
	 * @type {Map<string, { path: string, name: string, mime: string, size: number }>}
	 */
	#taskFiles = new Map()

	/** @param {number} port */
	constructor(port) {
		this.port = port
		this.#httpServer = http.createServer((req, res) => {
			if (req.url?.startsWith('/files/')) {
				this.#serveFile(req.url.slice('/files/'.length), res)
				return
			}
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
	 * Validate file paths and register them for the next task.
	 * @param {string[]} paths absolute paths on this machine
	 * @returns {Promise<{ id: string, name: string, mime: string, size: number }[]>}
	 */
	async registerFiles(paths) {
		this.#taskFiles.clear()
		const metas = []
		for (const path of paths) {
			const info = await stat(path).catch(() => null)
			if (!info || !info.isFile()) {
				this.#taskFiles.clear()
				throw new Error(`File not found or not a regular file: ${path}`)
			}
			const id = randomUUID()
			const meta = {
				path,
				name: basename(path),
				mime: MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
				size: info.size,
			}
			this.#taskFiles.set(id, meta)
			metas.push({ id, name: meta.name, mime: meta.mime, size: meta.size })
		}
		return metas
	}

	/**
	 * @param {string} id
	 * @param {http.ServerResponse} res
	 */
	#serveFile(id, res) {
		const meta = this.#taskFiles.get(id)
		if (!meta) {
			res.writeHead(404)
			res.end('Not found')
			return
		}
		res.writeHead(200, {
			'Content-Type': meta.mime,
			'Content-Length': meta.size,
			'Access-Control-Allow-Origin': '*',
		})
		createReadStream(meta.path)
			.on('error', () => res.destroy())
			.pipe(res)
	}

	/**
	 * @param {string} task
	 * @param {Record<string, unknown>} [config]
	 * @param {string[]} [filePaths] absolute paths of files to offer for upload
	 * @returns {Promise<{success: boolean, data: string}>}
	 */
	async executeTask(task, config, filePaths) {
		if (!this.connected) throw new Error('Hub is not connected. Is the extension running?')
		if (this.#pendingTask) throw new Error('Agent is already running a task.')

		const files = filePaths?.length ? await this.registerFiles(filePaths) : undefined

		return new Promise((resolve, reject) => {
			this.#pendingTask = { resolve, reject }
			this.#hub.send(JSON.stringify({ type: 'execute', task, config, files }))
		})
	}

	stopTask() {
		if (this.connected) {
			this.#hub.send(JSON.stringify({ type: 'stop' }))
		}
	}

	// TODO: Add version checking

	/** @param {import('ws').WebSocket} ws */
	#onConnection(ws) {
		if (this.#hub && this.#hub.readyState === 1) {
			ws.close(4000, 'Another hub is already connected')
			return
		}

		this.#hub = ws
		console.error('[page-agent-mcp] Hub connected')

		ws.on('message', (/** @type {Buffer} */ rawData) => {
			/** @type {{ type: string, success?: boolean, data?: string, message?: string }} */
			let msg
			try {
				msg = JSON.parse(rawData.toString('utf-8'))
			} catch {
				return
			}

			if (msg.type === 'result') {
				this.#pendingTask?.resolve({ success: msg.success ?? false, data: msg.data ?? '' })
				this.#pendingTask = null
				this.#taskFiles.clear()
			} else if (msg.type === 'error') {
				this.#pendingTask?.reject(new Error(msg.message ?? 'Unknown error from hub'))
				this.#pendingTask = null
				this.#taskFiles.clear()
			}
		})

		ws.on('close', () => {
			console.error('[page-agent-mcp] Hub disconnected')
			if (this.#hub === ws) this.#hub = null
			if (this.#pendingTask) {
				this.#pendingTask.reject(new Error('Hub disconnected while task was running'))
				this.#pendingTask = null
			}
		})
	}
}
