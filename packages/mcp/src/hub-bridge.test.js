
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'

import { HubBridge } from './hub-bridge.js'

describe('HubBridge Auth Handshake', () => {
	let bridge
	const port = 34567

	beforeAll(async () => {
		bridge = new HubBridge(port)
		await bridge.start()
	})

	afterAll(async () => {
		await bridge.close()
	})

	it('rejects connection with invalid token', () => {
		return new Promise((resolve) => {
			const ws = new WebSocket(`ws://localhost:${port}`)
			ws.on('open', () => {
				ws.send(JSON.stringify({ type: 'auth', token: 'wrong-token' }))
			})
			ws.on('close', (code) => {
				expect(code).toBe(4003)
				resolve()
			})
		})
	})

	it('accepts connection with valid token and processes task', () => {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(`ws://localhost:${port}`)

			ws.on('open', () => {
				ws.send(JSON.stringify({ type: 'auth', token: bridge.wsToken }))
			})

			ws.on('message', (data) => {
				const msg = JSON.parse(data.toString())
				if (msg.type === 'execute') {
					ws.send(JSON.stringify({ type: 'result', success: true, data: 'mocked' }))
				}
			})

			ws.on('error', reject)

			// poll until the bridge reports a connected hub, then run the task
			const interval = setInterval(async () => {
				if (!bridge.connected) return
				clearInterval(interval)
				try {
					const res = await bridge.executeTask('test task')
					expect(res.success).toBe(true)
					expect(res.data).toBe('mocked')
					ws.close()
					resolve()
				} catch (err) {
					reject(err)
				}
			}, 10)
		})
	})
})
