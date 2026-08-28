import { initPageController } from '@/agent/RemotePageController.content'

// import { DEMO_CONFIG } from '@/agent/constants'

const DEBUG_PREFIX = '[Content]'

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_end',

	main() {
		console.debug(`${DEBUG_PREFIX} Loaded on ${window.location.href}`)
		initPageController()

		// if auth token matches, expose agent to page
		chrome.storage.local.get('EBAgentExtUserAuthToken').then((result) => {
			// extension side token.
			// @note this is isolated world. it is safe to assume user script cannot access it
			const extToken = result.EBAgentExtUserAuthToken
			if (!extToken) return

			// page side token
			const pageToken = localStorage.getItem('EBAgentExtUserAuthToken')
			if (!pageToken) return

			if (pageToken !== extToken) return

			console.log('[EBAgentExt]: Auth tokens match. Exposing agent to page.')

			// add isolated world script
			exposeAgentToPage().then(
				// add main-world script
				() => injectScript('/main-world.js')
			)
		})
	},
})

async function exposeAgentToPage() {
	const { MultiPageAgent } = await import('@/agent/MultiPageAgent')
	console.log('[EBAgentExt]: MultiPageAgent loaded')

	/**
	 * singleton MultiPageAgent to handle requests from the page
	 */
	let multiEBAgent: InstanceType<typeof MultiPageAgent> | null = null

	window.addEventListener('message', async (e) => {
		if (e.source !== window) return

		const data = e.data
		if (typeof data !== 'object' || data === null) return
		if (data.channel !== 'EB_AGENT_EXT_REQUEST') return

		const { action, payload, id } = data

		switch (action) {
			case 'execute': {
				// singleton check
				if (multiEBAgent && multiEBAgent.status === 'running') {
					window.postMessage(
						{
							channel: 'EB_AGENT_EXT_RESPONSE',
							id,
							action: 'execute_result',
							error: 'Agent is already running a task. Please wait until it finishes.',
						},
						'*'
					)
					return
				}

				try {
					const { task, config } = payload
					const { systemInstruction, ...agentConfig } = config

					// Dispose old instance before creating new one
					multiEBAgent?.dispose()

					multiEBAgent = new MultiPageAgent({
						...agentConfig,
						instructions: systemInstruction ? { system: systemInstruction } : undefined,
					})

					// events

					multiEBAgent.addEventListener('statuschange', (event) => {
						if (!multiEBAgent) return
						window.postMessage(
							{
								channel: 'EB_AGENT_EXT_RESPONSE',
								id,
								action: 'status_change_event',
								payload: multiEBAgent.status,
							},
							'*'
						)
					})

					multiEBAgent.addEventListener('activity', (event) => {
						if (!multiEBAgent) return
						window.postMessage(
							{
								channel: 'EB_AGENT_EXT_RESPONSE',
								id,
								action: 'activity_event',
								payload: (event as CustomEvent).detail,
							},
							'*'
						)
					})

					multiEBAgent.addEventListener('historychange', (event) => {
						if (!multiEBAgent) return
						window.postMessage(
							{
								channel: 'EB_AGENT_EXT_RESPONSE',
								id,
								action: 'history_change_event',
								payload: multiEBAgent.history,
							},
							'*'
						)
					})

					// result

					const result = await multiEBAgent.execute(task)

					window.postMessage(
						{
							channel: 'EB_AGENT_EXT_RESPONSE',
							id,
							action: 'execute_result',
							payload: result,
						},
						'*'
					)
				} catch (error) {
					window.postMessage(
						{
							channel: 'EB_AGENT_EXT_RESPONSE',
							id,
							action: 'execute_result',
							error: (error as Error).message,
						},
						'*'
					)
				}

				break
			}

			case 'stop': {
				multiEBAgent?.stop()
				break
			}

			default:
				console.warn(`${DEBUG_PREFIX} Unknown action from page:`, action)
				break
		}
	})
}
