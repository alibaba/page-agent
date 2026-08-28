/**
 * Tab control tools for browser extension
 *
 * These tools allow the agent to manage multiple browser tabs:
 * - navigate: Navigate the current tab to a URL in place (preferred for ordinary navigation)
 * - open_new_tab: Open a new tab and set it as current (only when a genuinely separate tab is wanted)
 * - switch_to_tab: Switch to an existing tab
 * - close_tab: Close a tab (optionally switch to another)
 */
import * as z from 'zod/v4'

import type { TabsController } from './TabsController'

/** Tool definition compatible with EBAgentCore customTools */
interface TabTool {
	description: string
	inputSchema: z.ZodType
	execute: (input: unknown) => Promise<string>
}

/**
 * Create tab control tools bound to a TabsManager instance.
 * These tools are injected into EBAgentCore via customTools config.
 */
export function createTabTools(tabsController: TabsController): Record<string, TabTool> {
	return {
		navigate: {
			description:
				'Navigate the CURRENT tab to a URL in place (no new tab is created). ' +
				'Use this for all ordinary navigation: going to a different page/module within the same ' +
				'site or task, retrying/reloading a stuck or blank page, or following a deep link. ' +
				'Prefer this over `open_new_tab` whenever you are staying within the same overall flow.',
			inputSchema: z.object({
				url: z.string().describe('The URL to navigate the current tab to'),
			}),
			execute: async (input: unknown) => {
				const { url } = input as { url: string }
				try {
					return await tabsController.navigateTab(url)
				} catch (error) {
					return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`
				}
			},
		},

		open_new_tab: {
			description:
				'Open a NEW browser tab with the specified URL, in addition to any tabs already open; the new tab ' +
				'becomes the current tab for all subsequent page operations. Only use this when you deliberately ' +
				'need an additional tab to exist alongside the current one (e.g. comparing two pages side by side, ' +
				'looking something up without losing your place, or the task explicitly asks for multiple tabs). ' +
				'For ordinary navigation within the same task/flow, use `navigate` instead — it reuses the current ' +
				'tab so tabs do not pile up on every page change or retry.',
			inputSchema: z.object({
				url: z.string().describe('The URL to open in the new tab'),
			}),
			execute: async (input: unknown) => {
				const { url } = input as { url: string }
				try {
					return await tabsController.openNewTab(url)
				} catch (error) {
					return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`
				}
			},
		},

		switch_to_tab: {
			description:
				'Switch to an existing tab by its ID. After switching, all page operations will target the new current tab. You can only switch to tabs in the tab list shown in browser state.',
			inputSchema: z.object({
				tab_id: z.number().int().describe('The tab ID to switch to'),
			}),
			execute: async (input: unknown) => {
				const { tab_id } = input as { tab_id: number }
				try {
					return await tabsController.switchToTab(tab_id)
				} catch (error) {
					return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`
				}
			},
		},

		close_tab: {
			description:
				'Close a tab by its ID. Cannot close the initial tab. Optionally specify which tab to switch to after closing.',
			inputSchema: z.object({
				tab_id: z.number().int().describe('The tab ID to close'),
			}),
			execute: async (input: unknown) => {
				const { tab_id } = input as { tab_id: number }
				try {
					return await tabsController.closeTab(tab_id)
				} catch (error) {
					return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`
				}
			},
		},
	}
}
