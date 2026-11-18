import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const backendScript = fileURLToPath(new URL('./pdf_backend.py', import.meta.url))

export class PyMuPdfBackend {
	constructor({
		python = process.env.PDF_PYTHON ||
			path.join(os.homedir(), '.hermes', 'tools-venvs', 'pageagent-pdf', 'bin', 'python'),
		maxOutputBytes = 64 * 1024 * 1024,
		maxStderrBytes = 1024 * 1024,
		timeoutMs = 120_000,
	} = {}) {
		this.python = python
		this.maxOutputBytes = maxOutputBytes
		this.maxStderrBytes = maxStderrBytes
		this.timeoutMs = timeoutMs
	}

	async inspect(pdfPath) {
		return this.#run(['inspect', path.resolve(pdfPath)])
	}

	async apply(inputPath, outputPath, operations) {
		return this.#run(
			['apply', path.resolve(inputPath), path.resolve(outputPath)],
			JSON.stringify({ operations })
		)
	}

	async #run(args, input) {
		return new Promise((resolve, reject) => {
			const environment = Object.fromEntries(
				['HOME', 'PATH', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'SYSTEMROOT'].flatMap((key) =>
					process.env[key] === undefined ? [] : [[key, process.env[key]]]
				)
			)
			environment.PYTHONPATH = ''
			const child = spawn(this.python, [backendScript, ...args], {
				stdio: ['pipe', 'pipe', 'pipe'],
				env: environment,
				detached: process.platform !== 'win32',
			})
			const stdout = []
			const stderr = []
			let outputBytes = 0
			let stderrBytes = 0
			let settled = false
			const fail = (error) => {
				if (settled) return
				settled = true
				clearTimeout(timer)
				reject(error)
			}
			const stop = () => {
				try {
					if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL')
					else child.kill('SIGKILL')
				} catch {
					child.kill('SIGKILL')
				}
			}
			const timer = setTimeout(() => {
				stop()
				fail(new Error(`PDF backend timed out after ${this.timeoutMs}ms`))
			}, this.timeoutMs)
			timer.unref()
			child.stdout.on('data', (chunk) => {
				outputBytes += chunk.length
				if (outputBytes > this.maxOutputBytes) {
					stop()
					fail(new Error(`PDF backend output exceeded ${this.maxOutputBytes} bytes`))
					return
				}
				stdout.push(chunk)
			})
			child.stderr.on('data', (chunk) => {
				stderrBytes += chunk.length
				if (stderrBytes > this.maxStderrBytes) {
					stop()
					fail(new Error(`PDF backend stderr exceeded ${this.maxStderrBytes} bytes`))
					return
				}
				stderr.push(chunk)
			})
			child.on('error', (error) => {
				fail(
					new Error(
						`Could not start PDF Python backend (${this.python}). Set PDF_PYTHON to a Python with PyMuPDF: ${error.message}`
					)
				)
			})
			child.on('close', (code) => {
				if (settled) return
				clearTimeout(timer)
				const errorText = Buffer.concat(stderr).toString('utf8').trim()
				if (code !== 0) {
					fail(new Error(`PDF backend failed (${code}): ${errorText || 'no details'}`))
					return
				}
				try {
					const value = JSON.parse(Buffer.concat(stdout).toString('utf8'))
					settled = true
					resolve(value)
				} catch (error) {
					fail(new Error(`PDF backend returned invalid JSON: ${error.message}`))
				}
			})
			if (input) child.stdin.end(input)
			else child.stdin.end()
		})
	}
}
