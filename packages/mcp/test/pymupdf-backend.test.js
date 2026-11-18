import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chmod, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { PyMuPdfBackend } from '../src/pymupdf-backend.js'

const python =
	process.env.PDF_PYTHON ||
	path.join(process.env.HOME || '', '.hermes', 'tools-venvs', 'pageagent-pdf', 'bin', 'python')

function runPython(args) {
	return new Promise((resolve, reject) => {
		const child = spawn(python, args, { stdio: ['ignore', 'pipe', 'pipe'] })
		let stderr = ''
		child.stderr.on('data', (chunk) => (stderr += chunk))
		child.on('error', reject)
		child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr))))
	})
}

test('PyMuPDF backend inspects and edits a 25-page PDF', async (t) => {
	try {
		await runPython(['-c', 'import fitz'])
	} catch {
		t.skip(`PyMuPDF unavailable in ${python}`)
		return
	}

	const dir = await mkdtemp(path.join(tmpdir(), 'page-agent-pymupdf-'))
	const inputPath = path.join(dir, 'input.pdf')
	const outputPath = path.join(dir, 'output.pdf')
	const generator = [
		'import fitz,sys',
		'd=fitz.open()',
		"[(lambda p,n: p.insert_text((72,100), f'Page {n} old value'))(d.new_page(),i) for i in range(1,26)]",
		'd.save(sys.argv[1])',
	].join(';')
	await runPython(['-c', generator, inputPath])

	const backend = new PyMuPdfBackend({ python })
	const before = await backend.inspect(inputPath)
	assert.equal(before.pageCount, 25)
	assert.match(before.pages[19].text, /Page 20 old value/)

	const result = await backend.apply(inputPath, outputPath, [
		{
			id: 'replace-20',
			type: 'replace_text',
			page: 20,
			search: 'old value',
			replacement: 'new verified value',
			occurrence: 1,
		},
		{
			id: 'add-25',
			type: 'add_text',
			page: 25,
			text: 'Durable checkpoint complete',
			x: 72,
			y: 140,
			width: 300,
			height: 40,
		},
		{ id: 'redact-19', type: 'redact_text', page: 19, search: 'old value', occurrence: 1 },
		{ id: 'highlight-18', type: 'highlight_text', page: 18, search: 'old value', occurrence: 1 },
		{ id: 'note-17', type: 'add_note', page: 17, text: 'Review confirmed' },
		{ id: 'rotate-16', type: 'rotate_page', page: 16, angle: 90 },
	])

	assert.equal(result.checks.length, 7)
	assert.ok(result.checks.every((check) => check.passed))
	const after = await backend.inspect(outputPath)
	assert.equal(after.pageCount, 25)
	assert.match(after.pages[19].text, /new verified value/)
	assert.doesNotMatch(after.pages[19].text, /old value/)
	assert.match(after.pages[24].text, /Durable checkpoint complete/)
})

test('PyMuPDF reports owner-password PDFs with an empty user password as encrypted', async (t) => {
	try {
		await runPython(['-c', 'import fitz'])
	} catch {
		t.skip(`PyMuPDF unavailable in ${python}`)
		return
	}
	const directory = await mkdtemp(path.join(tmpdir(), 'page-agent-encrypted-'))
	const plain = path.join(directory, 'plain.pdf')
	const encrypted = path.join(directory, 'owner-password.pdf')
	const generator = [
		'import fitz,sys',
		'd=fitz.open()',
		'd.new_page().insert_text((72,72),"encrypted probe")',
		'd.save(sys.argv[1])',
		'd.close()',
		'd=fitz.open(sys.argv[1])',
		'd.save(sys.argv[2],encryption=fitz.PDF_ENCRYPT_AES_256,owner_pw="owner-secret",user_pw="")',
		'd.close()',
	].join(';')
	await runPython(['-c', generator, plain, encrypted])

	const inspection = await new PyMuPdfBackend({ python }).inspect(encrypted)
	assert.equal(inspection.encrypted, true)
})

test('PDF subprocess receives an allowlisted environment without LLM secrets', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'page-agent-env-'))
	const executable = path.join(directory, 'backend-probe.sh')
	await writeFile(
		executable,
		'#!/bin/sh\nif [ -n "${LLM_API_KEY:-}" ]; then printf \'{"leaked":true}\'; else printf \'{"leaked":false}\'; fi\n'
	)
	await chmod(executable, 0o700)
	const previous = process.env.LLM_API_KEY
	process.env.LLM_API_KEY = 'must-not-reach-child'
	try {
		const result = await new PyMuPdfBackend({ python: executable }).inspect('/tmp/unused.pdf')
		assert.equal(result.leaked, false)
	} finally {
		if (previous === undefined) delete process.env.LLM_API_KEY
		else process.env.LLM_API_KEY = previous
	}
})

test('PDF subprocess is terminated when it exceeds its deadline', async () => {
	const directory = await mkdtemp(path.join(tmpdir(), 'page-agent-timeout-'))
	const executable = path.join(directory, 'slow-backend.sh')
	await writeFile(executable, "#!/bin/sh\nsleep 2\nprintf '{}'\n")
	await chmod(executable, 0o700)
	const backend = new PyMuPdfBackend({ python: executable, timeoutMs: 50 })
	await assert.rejects(() => backend.inspect('/tmp/unused.pdf'), /timed out/i)
})
