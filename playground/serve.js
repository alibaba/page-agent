import dotenv from 'dotenv'
import { readFile } from 'node:fs/promises'
import { createServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')
const PORT = Number(process.env.PORT) || 3000

// Load playground/.env
dotenv.config({ path: join(__dirname, '.env') })

const MIME = {
	'.html': 'text/html',
	'.js': 'application/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.map': 'application/json',
}

const server = createServer(async (req, res) => {
	const url = new URL(req.url, `http://localhost:${PORT}`)

	// Proxy: /api/* → LLM_BASE_URL/*  (avoids CORS)
	if (url.pathname.startsWith('/api/')) {
		const targetBase = process.env.LLM_BASE_URL
		if (!targetBase) {
			res.writeHead(500, { 'Content-Type': 'text/plain' })
			res.end('LLM_BASE_URL not configured')
			return
		}
		const targetPath = url.pathname.slice('/api'.length) // e.g. /chat/completions
		// Append to base path (e.g. /mlflow/v1 + /chat/completions)
		const base = new URL(targetBase)
		const targetUrl = new URL(base.pathname.replace(/\/$/, '') + targetPath, base.origin)

		// Buffer request body so we can set correct content-length
		const chunks = []
		for await (const chunk of req) chunks.push(chunk)
		const body = Buffer.concat(chunks)

		console.log(`  [proxy] ${req.method} ${targetUrl.href} (${body.length} bytes)`)

		const doRequest = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest
		const proxyReq = doRequest(
			targetUrl,
			{
				method: req.method,
				headers: {
					'content-type': req.headers['content-type'] || 'application/json',
					'content-length': body.length,
					accept: 'application/json',
					host: targetUrl.host,
					authorization: `Bearer ${process.env.LLM_API_KEY || ''}`,
				},
			},
			(proxyRes) => {
				res.writeHead(proxyRes.statusCode, proxyRes.headers)
				if (proxyRes.statusCode >= 400) {
					// Buffer error body for logging, then send to client
					const errChunks = []
					proxyRes.on('data', (c) => errChunks.push(c))
					proxyRes.on('end', () => {
						const errBody = Buffer.concat(errChunks)
						console.error(
							`  [proxy] upstream ${proxyRes.statusCode}:`,
							errBody.toString().slice(0, 500)
						)
						res.end(errBody)
					})
					return
				}
				proxyRes.pipe(res)
			}
		)
		proxyReq.on('error', (err) => {
			console.error('Proxy error:', err.message)
			if (!res.headersSent) {
				res.writeHead(502, { 'Content-Type': 'text/plain' })
			}
			res.end('Proxy error: ' + err.message)
		})
		proxyReq.end(body)
		return
	}

	// Virtual route: inject LLM config from .env (baseURL points to local proxy)
	if (url.pathname === '/config.js') {
		const config = {
			baseURL: `http://localhost:${PORT}/api`,
			apiKey: 'proxy', // not used — server injects the real key
			model: process.env.LLM_MODEL_NAME || '',
			lang: process.env.LLM_LANG || 'en-US',
		}
		res.writeHead(200, { 'Content-Type': 'application/javascript' })
		res.end(`window.__LLM_CONFIG__ = ${JSON.stringify(config)};`)
		return
	}

	let filePath
	if (url.pathname === '/' || url.pathname === '/index.html') {
		filePath = join(__dirname, 'index.html')
	} else {
		// Serve from repo root so the IIFE bundle path works
		filePath = join(ROOT, url.pathname)
	}

	try {
		const data = await readFile(filePath)
		const ext = extname(filePath)
		res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
		res.end(data)
	} catch {
		res.writeHead(404, { 'Content-Type': 'text/plain' })
		res.end('Not found')
	}
})

server.listen(PORT, () => {
	console.log(`\n  Playground running at http://localhost:${PORT}`)
	console.log(`  Configure LLM via playground/.env (see .env.example)`)
	console.log(`  API proxy: /api/* → ${process.env.LLM_BASE_URL || '(not configured)'}\n`)
})
