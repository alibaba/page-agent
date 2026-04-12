/**
 * IIFE CDN entry - exposes PageAgent without auto-initializing a demo instance.
 */
import { PageAgent } from './PageAgent'

window.PageAgent = PageAgent

console.log(
	'🚀 page-agent.js loaded! Create an agent with `new window.PageAgent(config)` to get started.'
)

export { PageAgent }
