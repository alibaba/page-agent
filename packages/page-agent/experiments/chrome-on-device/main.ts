import { type AgentStatus, type ExecutionResult, PageAgent } from '../../src/PageAgent'

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available'
interface TextMessage {
	role: 'system' | 'user' | 'assistant'
	content: string
}

interface PromptOptions {
	responseConstraint: Record<string, unknown>
}

interface LanguageModelSession {
	readonly contextUsage?: number
	readonly contextWindow?: number
	readonly inputUsage?: number
	readonly inputQuota?: number
	clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>
	destroy(): void
	measureContextUsage?(input: TextMessage[], options: PromptOptions): Promise<number>
	measureInputUsage?(input: TextMessage[], options: PromptOptions): Promise<number>
	prompt(input: TextMessage[], options: PromptOptions & { signal?: AbortSignal }): Promise<string>
}

interface LanguageModelCreateOptions {
	expectedInputs: { type: 'text'; languages: string[] }[]
	expectedOutputs: { type: 'text'; languages: string[] }[]
	initialPrompts?: TextMessage[]
	monitor?: (monitor: EventTarget) => void
	signal?: AbortSignal
}

interface LanguageModelFactory {
	availability(options: LanguageModelCreateOptions): Promise<Availability>
	create(options: LanguageModelCreateOptions): Promise<LanguageModelSession>
}

interface ToolDefinition {
	type: 'function'
	function: {
		name: string
		parameters: Record<string, unknown>
	}
}

interface RequestMeasurement {
	id: number
	actionVariants?: number
	cloneMs?: number
	contextUsageAfter?: number
	contextUsageBefore?: number
	contextWindow?: number
	error?: string
	jsonOutput?: unknown
	measureContextUsageMs?: number
	measuredContextUsage?: number
	measurementError?: string
	messageBytes?: number
	promptMs?: number
	promptBytes?: number
	schemaBytes?: number
	systemBaseCreateMs?: number
	systemBytes?: number
	totalMs?: number
}

interface LabState {
	agentStatus: AgentStatus | 'not-created'
	askUserRequests: { question: string; answer: string }[]
	availability: Availability | 'unknown'
	downloadProgress: number
	downloadCompletedAt?: number
	errors: { at: string; scope: string; message: string }[]
	latestSchema?: Record<string, unknown>
	postDownloadLoadMs?: number
	prepareMs?: number
	preparing: boolean
	promptApiSupported: boolean
	requests: RequestMeasurement[]
	result?: ExecutionResult
	running: boolean
	userAgent: string
	warmSession: boolean
	warmSessionContextUsage?: number
	warmSessionContextWindow?: number
}

interface ChromeOnDeviceLabApi {
	checkAvailability(): Promise<Availability | 'unknown'>
	getState(): LabState
	prepare(): Promise<void>
	resetFixture(): void
	run(task?: string): Promise<ExecutionResult>
	stop(): Promise<void>
}

declare global {
	interface Window {
		chromeOnDeviceLab: ChromeOnDeviceLabApi
	}
}

const textEncoder = new TextEncoder()
const modelOptions: LanguageModelCreateOptions = {
	expectedInputs: [{ type: 'text', languages: ['en'] }],
	expectedOutputs: [{ type: 'text', languages: ['en'] }],
}

const labElement = getElement<HTMLElement>('lab')
const apiStatusOutput = getElement<HTMLOutputElement>('api-status')
const availabilityOutput = getElement<HTMLOutputElement>('availability-status')
const sessionOutput = getElement<HTMLOutputElement>('session-status')
const progressElement = getElement<HTMLProgressElement>('download-progress')
const progressLabel = getElement<HTMLElement>('progress-label')
const checkButton = getElement<HTMLButtonElement>('check-button')
const prepareButton = getElement<HTMLButtonElement>('prepare-button')
const runButton = getElement<HTMLButtonElement>('run-button')
const resetButton = getElement<HTMLButtonElement>('reset-button')
const taskInput = getElement<HTMLTextAreaElement>('task-input')
const metricsOutput = getElement<HTMLElement>('metrics-output')
const resultOutput = getElement<HTMLElement>('result-output')
const schemaOutput = getElement<HTMLElement>('schema-output')
const errorsOutput = getElement<HTMLElement>('errors-output')
const profileForm = getElement<HTMLFormElement>('profile-form')
const profileNameInput = getElement<HTMLInputElement>('profile-name')
const profileRoleSelect = getElement<HTMLSelectElement>('profile-role')
const fixtureResult = getElement<HTMLOutputElement>('fixture-result')

const state: LabState = {
	agentStatus: 'not-created',
	askUserRequests: [],
	availability: 'unknown',
	downloadProgress: 0,
	errors: [],
	preparing: false,
	promptApiSupported: getPromptApi() !== undefined,
	requests: [],
	running: false,
	userAgent: navigator.userAgent,
	warmSession: false,
}

let baseSession: LanguageModelSession | undefined
let baseSystemPrompt: string | undefined
let agent: PageAgent | undefined

function getElement<T extends HTMLElement>(id: string): T {
	const element = document.getElementById(id)
	if (!element) throw new Error(`Missing #${id}`)
	return element as T
}

function getPromptApi(): LanguageModelFactory | undefined {
	return (globalThis as typeof globalThis & { LanguageModel?: LanguageModelFactory }).LanguageModel
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatError(error: unknown): string {
	if (error instanceof DOMException || error instanceof Error) {
		return `${error.name}: ${error.message}`
	}
	return String(error)
}

function isAbortError(error: unknown): boolean {
	return isRecord(error) && error.name === 'AbortError'
}

function round(value: number): number {
	return Math.round(value * 10) / 10
}

function byteLength(value: unknown): number {
	return textEncoder.encode(typeof value === 'string' ? value : JSON.stringify(value)).byteLength
}

function readContextUsage(session: LanguageModelSession): number | undefined {
	return session.contextUsage ?? session.inputUsage
}

function readContextWindow(session: LanguageModelSession): number | undefined {
	return session.contextWindow ?? session.inputQuota
}

function snapshot(): LabState {
	return JSON.parse(JSON.stringify(state)) as LabState
}

function recordError(scope: string, error: unknown): void {
	state.errors.push({ at: new Date().toISOString(), scope, message: formatError(error) })
	render()
}

function render(): void {
	apiStatusOutput.value = state.promptApiSupported ? 'Present' : 'Missing'
	availabilityOutput.value = state.availability
	sessionOutput.value = state.preparing ? 'Preparing…' : state.warmSession ? 'Warm' : 'Cold'
	progressElement.value = state.downloadProgress

	if (state.preparing && state.downloadProgress >= 1) {
		progressLabel.textContent = 'Download complete. Chrome is loading the model.'
	} else if (state.preparing && state.downloadProgress > 0) {
		progressLabel.textContent = `Downloading model: ${Math.round(state.downloadProgress * 100)}%`
	} else if (state.warmSession) {
		progressLabel.textContent = `Ready in ${state.prepareMs ?? 0} ms. Context window: ${state.warmSessionContextWindow ?? 'unknown'}.`
	} else if (!state.promptApiSupported) {
		progressLabel.textContent = 'LanguageModel is not exposed in this page.'
	} else {
		progressLabel.textContent = 'No download started.'
	}

	const busy = state.preparing || state.running
	checkButton.disabled = busy || !state.promptApiSupported
	prepareButton.disabled =
		busy || !state.promptApiSupported || state.availability === 'unavailable' || state.warmSession
	runButton.disabled = busy || !state.warmSession
	resetButton.disabled = busy
	taskInput.disabled = busy

	metricsOutput.textContent = JSON.stringify(
		{
			environment: { userAgent: state.userAgent },
			warmup: {
				availability: state.availability,
				prepareMs: state.prepareMs,
				postDownloadLoadMs: state.postDownloadLoadMs,
				contextUsage: state.warmSessionContextUsage,
				contextWindow: state.warmSessionContextWindow,
			},
			requests: state.requests,
			askUserRequests: state.askUserRequests,
		},
		null,
		2
	)
	resultOutput.textContent = state.result ? JSON.stringify(state.result, null, 2) : 'No run yet.'
	schemaOutput.textContent = state.latestSchema
		? JSON.stringify(state.latestSchema, null, 2)
		: 'Captured on first request.'
	errorsOutput.textContent = state.errors.length
		? state.errors.map((entry) => `[${entry.at}] ${entry.scope}\n${entry.message}`).join('\n\n')
		: 'No errors.'
}

async function checkAvailability(): Promise<Availability | 'unknown'> {
	const promptApi = getPromptApi()
	state.promptApiSupported = promptApi !== undefined
	if (!promptApi) {
		state.availability = 'unknown'
		render()
		return state.availability
	}

	try {
		state.availability = await promptApi.availability(modelOptions)
		return state.availability
	} catch (error) {
		recordError('availability', error)
		state.availability = 'unknown'
		return state.availability
	} finally {
		render()
	}
}

async function prepareModel(): Promise<void> {
	if (baseSession) return
	const promptApi = getPromptApi()
	if (!promptApi) throw new Error('LanguageModel is not available in this page.')

	state.preparing = true
	state.downloadProgress = 0
	state.downloadCompletedAt = undefined
	state.postDownloadLoadMs = undefined
	render()

	const startedAt = performance.now()
	const sessionPromise = promptApi.create({
		...modelOptions,
		monitor(monitor) {
			monitor.addEventListener('downloadprogress', (event) => {
				const loaded = (event as Event & { loaded?: number }).loaded ?? 0
				state.downloadProgress = Math.min(1, Math.max(0, loaded))
				if (state.downloadProgress >= 1 && state.downloadCompletedAt === undefined) {
					state.downloadCompletedAt = performance.now()
				}
				render()
			})
		},
	})

	try {
		baseSession = await sessionPromise
		const preparedAt = performance.now()
		state.prepareMs = round(preparedAt - startedAt)
		state.postDownloadLoadMs = state.downloadCompletedAt
			? round(preparedAt - state.downloadCompletedAt)
			: undefined
		state.warmSession = true
		state.warmSessionContextUsage = readContextUsage(baseSession)
		state.warmSessionContextWindow = readContextWindow(baseSession)
		state.downloadProgress = 1
		void checkAvailability()
	} catch (error) {
		recordError('prepare', error)
		throw error
	} finally {
		state.preparing = false
		render()
	}
}

function parseOpenAIRequest(init?: RequestInit): {
	messages: TextMessage[]
	promptMessages: TextMessage[]
	schema: Record<string, unknown>
	systemPrompt: string
	tool: ToolDefinition
} {
	if (typeof init?.body !== 'string') throw new TypeError('Expected a JSON string request body.')
	const body = JSON.parse(init.body) as unknown
	if (!isRecord(body)) throw new TypeError('Expected an OpenAI request object.')

	if (!Array.isArray(body.tools) || body.tools.length !== 1) {
		throw new TypeError('Expected exactly one OpenAI function tool.')
	}
	const toolValue = body.tools[0]
	if (!isRecord(toolValue) || toolValue.type !== 'function' || !isRecord(toolValue.function)) {
		throw new TypeError('Expected an OpenAI function tool definition.')
	}
	if (toolValue.function.name !== 'AgentOutput' || !isRecord(toolValue.function.parameters)) {
		throw new TypeError('Expected the AgentOutput tool and its JSON Schema.')
	}
	const tool = toolValue as unknown as ToolDefinition

	if (!Array.isArray(body.messages) || body.messages.length === 0) {
		throw new TypeError('Expected at least one prompt message.')
	}
	const messages = body.messages.map((value): TextMessage => {
		if (!isRecord(value) || typeof value.content !== 'string') {
			throw new TypeError('Only text prompt messages are supported in this experiment.')
		}
		if (value.role !== 'system' && value.role !== 'user' && value.role !== 'assistant') {
			throw new TypeError(`Unsupported prompt role: ${String(value.role)}`)
		}
		return { role: value.role, content: value.content }
	})
	const [systemMessage, ...promptMessages] = messages
	if (
		systemMessage.role !== 'system' ||
		promptMessages.some((message) => message.role === 'system')
	) {
		throw new TypeError('Expected one leading system message.')
	}
	if (promptMessages.length === 0) throw new TypeError('Expected at least one user message.')

	return {
		messages,
		promptMessages,
		schema: tool.function.parameters,
		systemPrompt: systemMessage.content,
		tool,
	}
}

async function ensureSystemBase(
	systemPrompt: string,
	signal: AbortSignal | undefined,
	measurement: RequestMeasurement
): Promise<LanguageModelSession> {
	if (baseSession && baseSystemPrompt === systemPrompt) return baseSession
	const promptApi = getPromptApi()
	if (!promptApi) throw new Error('LanguageModel is not available in this page.')

	const startedAt = performance.now()
	const replacement = await promptApi.create({
		...modelOptions,
		initialPrompts: [{ role: 'system', content: systemPrompt }],
		signal,
	})
	measurement.systemBaseCreateMs = round(performance.now() - startedAt)

	const previous = baseSession
	baseSession = replacement
	baseSystemPrompt = systemPrompt
	state.warmSessionContextUsage = readContextUsage(replacement)
	state.warmSessionContextWindow = readContextWindow(replacement)
	previous?.destroy()
	return replacement
}

function countActionVariants(schema: Record<string, unknown>): number | undefined {
	const properties = schema.properties
	if (!isRecord(properties) || !isRecord(properties.action)) return undefined
	const variants = properties.action.anyOf
	return Array.isArray(variants) ? variants.length : undefined
}

function errorResponse(error: unknown): Response {
	const errorName = error instanceof DOMException || error instanceof Error ? error.name : 'Error'
	return Response.json(
		{
			error: {
				code: errorName,
				message: formatError(error),
				type: 'chrome_on_device_error',
			},
		},
		{ status: 422, statusText: 'Chrome on-device inference failed' }
	)
}

const chromeOnDeviceFetch: typeof globalThis.fetch = async (_input, init) => {
	const startedAt = performance.now()
	const measurement: RequestMeasurement = { id: state.requests.length + 1 }
	state.requests.push(measurement)
	let requestSession: LanguageModelSession | undefined

	try {
		init?.signal?.throwIfAborted()
		if (!baseSession) throw new Error('Prepare the Chrome model before running Page Agent.')

		const { messages, promptMessages, schema, systemPrompt, tool } = parseOpenAIRequest(init)
		state.latestSchema = schema
		measurement.schemaBytes = byteLength(schema)
		measurement.messageBytes = byteLength(messages)
		measurement.promptBytes = byteLength(promptMessages)
		measurement.systemBytes = byteLength(systemPrompt)
		measurement.actionVariants = countActionVariants(schema)

		const systemBase = await ensureSystemBase(systemPrompt, init?.signal ?? undefined, measurement)
		const cloneStartedAt = performance.now()
		requestSession = await systemBase.clone({ signal: init?.signal ?? undefined })
		measurement.cloneMs = round(performance.now() - cloneStartedAt)
		measurement.contextUsageBefore = readContextUsage(requestSession)
		measurement.contextWindow = readContextWindow(requestSession)

		const measure =
			requestSession.measureContextUsage?.bind(requestSession) ??
			requestSession.measureInputUsage?.bind(requestSession)
		if (measure) {
			const measureStartedAt = performance.now()
			try {
				measurement.measuredContextUsage = await measure(promptMessages, {
					responseConstraint: schema,
				})
			} catch (error) {
				measurement.measurementError = formatError(error)
				recordError(`request ${measurement.id} measureContextUsage`, error)
			} finally {
				measurement.measureContextUsageMs = round(performance.now() - measureStartedAt)
			}
		}

		const promptStartedAt = performance.now()
		const rawOutput = await requestSession.prompt(promptMessages, {
			responseConstraint: schema,
			signal: init?.signal ?? undefined,
		})
		measurement.promptMs = round(performance.now() - promptStartedAt)
		measurement.contextUsageAfter = readContextUsage(requestSession)
		measurement.jsonOutput = JSON.parse(rawOutput) as unknown
		measurement.totalMs = round(performance.now() - startedAt)
		render()

		return Response.json({
			choices: [
				{
					finish_reason: 'tool_calls',
					index: 0,
					message: {
						content: null,
						role: 'assistant',
						tool_calls: [
							{
								function: { arguments: rawOutput, name: tool.function.name },
								id: `chrome-on-device-${measurement.id}`,
								type: 'function',
							},
						],
					},
				},
			],
			chrome_on_device: measurement,
			usage: { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0 },
		})
	} catch (error) {
		measurement.error = formatError(error)
		measurement.totalMs = round(performance.now() - startedAt)
		recordError(`request ${measurement.id}`, error)
		if (isAbortError(error)) throw error
		return errorResponse(error)
	} finally {
		requestSession?.destroy()
		render()
	}
}

function createAgent(): PageAgent {
	const pageAgent = new PageAgent({
		baseURL: 'https://chrome-on-device.invalid/v1',
		customFetch: chromeOnDeviceFetch,
		enableMask: false,
		language: 'en-US',
		maxRetries: 0,
		maxSteps: 8,
		model: 'chrome-on-device',
		promptForNextTask: false,
		stepDelay: 0,
	})

	pageAgent.onAskUser = async (question, options) => {
		options?.signal.throwIfAborted()
		const answer = 'The task is fully specified. Continue using the visible page.'
		state.askUserRequests.push({ question, answer })
		render()
		return answer
	}
	pageAgent.addEventListener('statuschange', () => {
		state.agentStatus = pageAgent.status
		render()
	})
	state.agentStatus = pageAgent.status
	return pageAgent
}

function resetFixture(): void {
	profileForm.reset()
	fixtureResult.value = 'No profile saved.'
	fixtureResult.dataset.saved = 'false'
}

async function runAgent(task = taskInput.value.trim()): Promise<ExecutionResult> {
	if (!baseSession) throw new Error('Prepare the Chrome model before running Page Agent.')
	if (!task) throw new Error('Enter a task before running Page Agent.')
	if (state.running) throw new Error('Page Agent is already running.')

	resetFixture()
	state.result = undefined
	state.running = true
	labElement.hidden = true
	document.body.dataset.agentRunning = 'true'
	render()

	try {
		if (!agent || agent.disposed) agent = createAgent()
		state.result = await agent.execute(task)
		return state.result
	} catch (error) {
		recordError('agent', error)
		throw error
	} finally {
		state.running = false
		labElement.hidden = false
		delete document.body.dataset.agentRunning
		render()
	}
}

async function stopAgent(): Promise<void> {
	await agent?.stop()
}

profileForm.addEventListener('submit', (event) => {
	event.preventDefault()
	const name = profileNameInput.value.trim()
	const role = profileRoleSelect.value
	if (!name || !role) {
		fixtureResult.value = 'Complete both profile fields before saving.'
		fixtureResult.dataset.saved = 'false'
		return
	}
	fixtureResult.value = `Profile saved: ${name} — ${role}.`
	fixtureResult.dataset.saved = 'true'
})

checkButton.addEventListener('click', () => {
	void checkAvailability()
})

prepareButton.addEventListener('click', () => {
	void prepareModel().catch(() => undefined)
})

runButton.addEventListener('click', () => {
	void runAgent().catch(() => undefined)
})

resetButton.addEventListener('click', resetFixture)

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && state.running) void stopAgent()
})

window.addEventListener('pagehide', () => {
	agent?.dispose()
	baseSession?.destroy()
})

window.chromeOnDeviceLab = {
	checkAvailability,
	getState: snapshot,
	prepare: prepareModel,
	resetFixture,
	run: runAgent,
	stop: stopAgent,
}

render()
void checkAvailability()
