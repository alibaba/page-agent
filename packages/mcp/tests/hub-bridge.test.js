import assert from 'node:assert'
import { after, before, describe, test } from 'node:test'
import { WebSocket } from 'ws'

import { HubBridge } from '../src/hub-bridge.js'

describe('HubBridge Auth Handshake', () => {
	let bridge
	const port = 34567

	before(async () => {
		bridge = new HubBridge(port)
		await bridge.start()
	})

	after(async () => {
		await bridge.close()
	})

	test('rejects connection with invalid token', (_t, done) => {
		const ws = new WebSocket(`ws://localhost:${port}`)

		ws.on('open', () => {
			ws.send(JSON.stringify({ type: 'auth', token: 'wrong-token' }))
		})

		ws.on('close', (code) => {
			assert.strictEqual(code, 4003)
			done()
		})
	})

	test('accepts connection with valid token and processes task', (_t, done) => {
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

		setTimeout(() => {
			bridge.executeTask('test task').then((res) => {
				assert.strictEqual(res.success, true)
				assert.strictEqual(res.data, 'mocked')
				ws.close()
				done()
			})
		}, 50)
	})
})
