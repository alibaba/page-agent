import chalk from 'chalk'
import { spawn } from 'child_process'

/**
 * Run multiple shell commands in parallel with progress reporting.
 *
 * @param {{ label: string, command: string, cwd?: string }[]} tasks
 * @param {{ timeoutMs?: number }} options - Default timeout 30s per task
 * @returns {Promise<void>} Rejects (process.exit) if any task fails
 */
export async function parallelTask(tasks, options = {}) {
	const { timeoutMs = 30_000 } = options
	const total = tasks.length

	const bgColors = [
		chalk.bgCyan,
		chalk.bgMagenta,
		chalk.bgBlue,
		chalk.bgYellow,
		chalk.bgGreenBright,
	]
	const fgOnBg = [chalk.black, chalk.white, chalk.white, chalk.black, chalk.black]

	let done = 0
	let failed = 0

	const spinner = ['◐', '◓', '◑', '◒']
	let tick = 0

	const printProgress = () => {
		const running = total - done - failed
		const s = spinner[tick++ % spinner.length]
		const status = failed
			? `${running} running, ${done} done, ${chalk.bgRed.white.bold(` ${failed} failed `)}`
			: `${running} running, ${done} done`
		process.stderr.write(`\r${chalk.bgCyan.black.bold(` ${s} ${done}/${total} `)} ${status}  `)
	}

	const timer = setInterval(printProgress, 1000)
	printProgress()

	/** @type {{ label: string, output: string, exitCode: number | null, timedOut: boolean }[]} */
	const results = await Promise.all(
		tasks.map(
			(task) =>
				new Promise((resolve) => {
					const chunks = /** @type {Buffer[]} */ ([])

					const child = spawn('sh', ['-c', task.command], {
						cwd: task.cwd,
						env: { ...process.env, FORCE_COLOR: '1', NO_COLOR: '' },
						stdio: ['ignore', 'pipe', 'pipe'],
					})

					child.stdout.on('data', (d) => chunks.push(d))
					child.stderr.on('data', (d) => chunks.push(d))

					const timeout = setTimeout(() => {
						child.kill('SIGTERM')
					}, timeoutMs)

					child.on('close', (code, signal) => {
						clearTimeout(timeout)
						const timedOut = signal === 'SIGTERM'
						const exitCode = timedOut ? 1 : code

						if (exitCode === 0) done++
						else failed++

						resolve({
							label: task.label,
							output: Buffer.concat(chunks).toString(),
							exitCode,
							timedOut,
						})
					})
				})
		)
	)

	clearInterval(timer)
	process.stderr.write('\r\x1b[K')

	const failedTasks = /** @type {typeof results} */ ([])

	for (let i = 0; i < results.length; i++) {
		const r = results[i]
		if (r.exitCode !== 0) {
			failedTasks.push(r)
			continue
		}
		const bg = bgColors[i % bgColors.length]
		const fg = fgOnBg[i % fgOnBg.length]
		const banner = bg(fg.bold(` ✔ ${r.label} `))
		console.log(`\n${banner}`)
		if (r.output.trim()) process.stdout.write(r.output)
	}

	if (failedTasks.length) {
		for (const r of failedTasks) {
			const banner = chalk.bgRed(
				chalk.white.bold(` ✘ ${r.label} ${r.timedOut ? '· timed out' : '· failed'} `)
			)
			console.log(`\n${banner}`)
			if (r.output.trim()) process.stdout.write(r.output)
		}
		const summary = failedTasks.map((t) => t.label).join(', ')
		console.error(
			`\n${chalk.bgRed.white.bold(` ✘ ${failedTasks.length}/${total} failed: ${summary} `)}`
		)
		process.exit(1)
	}

	console.log(`\n${chalk.bgGreen.black.bold(` ✔ All ${total} tasks completed `)}`)
}
