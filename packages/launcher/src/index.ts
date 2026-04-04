/**
 * page-agent Native Messaging Host
 * Enables remote AI agents to control browser via HTTP or WebSocket
 */

import express, { Request, Response } from 'express'

const MAX_MESSAGE_SIZE = 1024 * 1024

interface QueuedRequest {
    requestId: string
    resolve: (result: any) => void
    reject: (error: Error) => void
    message: any
}

class NativeHost {
    private pendingRequests = new Map<string, QueuedRequest>()
    private requestQueue: QueuedRequest[] = []
    private isProcessing = false
    private stdinBuffer = Buffer.alloc(0)
    private waitingForResponse = false
    private isConnected = false

    constructor() {
        this.setupStdinListener()
        process.stdin.resume()
    }

    private setupStdinListener() {
        this.isConnected = true

        process.stdin.on('data', (chunk: Buffer) => {
            this.stdinBuffer = Buffer.concat([this.stdinBuffer, chunk])
            this.processStdinBuffer()
        })

        process.stdin.on('end', () => {
            this.isConnected = false
            for (const [requestId, request] of this.pendingRequests) {
                request.reject(new Error('Chrome disconnected'))
                this.pendingRequests.delete(requestId)
            }
            this.stdinBuffer = Buffer.alloc(0)
            process.stdin.resume()
        })

        process.stdin.on('error', () => {
            this.isConnected = false
        })
    }

    private processStdinBuffer() {
        while (this.stdinBuffer.length >= 4) {
            const messageLength = this.stdinBuffer.readUInt32LE(0)

            if (this.stdinBuffer.length < 4 + messageLength) {
                break
            }

            const jsonBuffer = this.stdinBuffer.slice(4, 4 + messageLength)
            const messageStr = jsonBuffer.toString('utf8')

            try {
                const message = JSON.parse(messageStr)

                // Handshake response from extension
                if (message.type === 'handshake-ack') {
                    this.isConnected = true
                    this.stdinBuffer = this.stdinBuffer.slice(4 + messageLength)
                    return
                }

                // Response to our request
                if (message.requestId && this.pendingRequests.has(message.requestId)) {
                    const request = this.pendingRequests.get(message.requestId)!
                    if (message.success) {
                        request.resolve(message.result)
                    } else {
                        request.reject(new Error(message.error || message.message || 'Unknown error'))
                    }
                    this.pendingRequests.delete(message.requestId)
                }

                this.stdinBuffer = this.stdinBuffer.slice(4 + messageLength)
            } catch (e) {
                this.stdinBuffer = this.stdinBuffer.slice(4 + messageLength)
            }
        }
    }

    private writeToStdout(message: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const jsonStr = JSON.stringify(message)
            const jsonBuffer = Buffer.from(jsonStr, 'utf8')

            if (jsonBuffer.length > MAX_MESSAGE_SIZE) {
                reject(new Error(`Message size exceeds ${MAX_MESSAGE_SIZE} bytes limit`))
                return
            }

            const lengthBuffer = Buffer.alloc(4)
            lengthBuffer.writeUInt32LE(jsonBuffer.length, 0)
            const fullMessage = Buffer.concat([lengthBuffer, jsonBuffer])

            try {
                const written = process.stdout.write(fullMessage)
                if (written) {
                    resolve()
                } else {
                    process.stdout.once('drain', () => resolve())
                }
            } catch (e) {
                reject(e)
            }
        })
    }

    private sendToChrome(message: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const request: QueuedRequest = {
                requestId: message.requestId,
                resolve,
                reject,
                message,
            }
            this.requestQueue.push(request)
            this.processQueue()
        })
    }

    private async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return
        }

        this.isProcessing = true

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift()!

            try {
                this.pendingRequests.set(request.requestId, request)
                await this.writeToStdout(request.message)
                this.waitingForResponse = true

                const timeout = setTimeout(() => {
                    if (this.pendingRequests.has(request.requestId)) {
                        request.reject(new Error('Request timeout (30s)'))
                        this.pendingRequests.delete(request.requestId)
                        this.waitingForResponse = false
                    }
                }, 30000)

                const originalResolve = request.resolve
                request.resolve = (result: any) => {
                    clearTimeout(timeout)
                    this.waitingForResponse = false
                    originalResolve(result)
                }

                const originalReject = request.reject
                request.reject = (error: Error) => {
                    clearTimeout(timeout)
                    this.waitingForResponse = false
                    originalReject(error)
                }
            } catch (e) {
                request.reject(e as Error)
            }
        }

        this.isProcessing = false
    }

    public startHttpServer() {
        const app = express()
        app.use(express.json({ limit: '10mb' }))

        app.use((req: Request, res: Response, next) => {
            res.header('Access-Control-Allow-Origin', '*')
            res.header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.header('Access-Control-Allow-Headers', 'Content-Type')
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200)
            }
            next()
        })

        app.post('/command', async (req: Request, res: Response) => {
            const { requestId, tabId, action, payload } = req.body

            if (!requestId || !action) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: requestId, action',
                })
            }

            try {
                const result = await this.sendToChrome({ requestId, tabId, action, payload })
                res.json({ success: true, result })
            } catch (e: any) {
                res.status(500).json({ success: false, error: e.message })
            }
        })

        app.get('/health', (req: Request, res: Response) => {
            res.json({
                status: 'ok',
                queueLength: this.requestQueue.length,
                pendingRequests: this.pendingRequests.size,
                connected: this.isConnected,
            })
        })

        const PORT = process.env.PORT || 1133
        app.listen(PORT, () => {
            console.error(`[page-agent-launcher] HTTP server listening on port ${PORT}`)
        })
    }

    public async sendHandshake(): Promise<void> {
        await this.writeToStdout({ type: 'handshake', timestamp: Date.now() })
    }
}

// Initialize
const nativeHost = new NativeHost()

// Send handshake to extension
nativeHost.sendHandshake().then(() => {
    console.error('[page-agent-launcher] Handshake sent')
}).catch((err) => {
    console.error('[page-agent-launcher] Failed to send handshake:', err)
})

// Start HTTP server if not disabled
if (!process.env.DISABLE_HTTP) {
    nativeHost.startHttpServer()
}
