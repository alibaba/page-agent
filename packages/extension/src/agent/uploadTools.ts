/**
 * File upload tool for the browser extension.
 *
 * Files are provided by an external caller (the MCP server) per task:
 * the hub registers their metadata here, the caller serves the bytes over
 * its local HTTP bridge, and the tool fetches + injects them into a file
 * input on the page via the content script.
 */
import * as z from 'zod/v4'

import type { RemotePageController } from './RemotePageController'

/** Metadata of a file the external caller offers for upload. */
export interface RemoteUploadFile {
	/** Opaque id assigned by the caller; also the download route key */
	id: string
	name: string
	/** MIME type; empty string treated as application/octet-stream */
	mime: string
	size: number
}

/**
 * Base64 of the raw bytes must survive a chrome.runtime message.
 * Chrome caps messages at ~64 MB; leave generous headroom.
 */
const MAX_FILE_SIZE = 32 * 1024 * 1024

let availableFiles: RemoteUploadFile[] = []
let bridgePort: number | null = null

/** Register the files offered for the current task. Call with [] to clear. */
export function setAvailableUploadFiles(files: RemoteUploadFile[], port: number | null): void {
	availableFiles = files
	bridgePort = port
}

/**
 * Task-prompt block describing the offered files, so the model knows the
 * valid file_id values. Empty string when no files are registered.
 */
export function describeAvailableUploadFiles(): string {
	if (availableFiles.length === 0) return ''
	const lines = availableFiles.map(
		(f) => `- ${f.name} (file_id: ${f.id}, ${(f.size / 1024).toFixed(1)} KB)`
	)
	return `\n\nFiles provided by the caller, available to the upload_file tool:\n${lines.join('\n')}`
}

function toBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	const chunk = 0x8000
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
	}
	return btoa(binary)
}

/** Tool definition compatible with PageAgentCore customTools */
interface UploadTool {
	description: string
	inputSchema: z.ZodType
	execute: (input: unknown) => Promise<string>
}

/**
 * Create the upload_file tool bound to a RemotePageController.
 * Injected into PageAgentCore via customTools config.
 */
export function createUploadTools(
	pageController: RemotePageController
): Record<string, UploadTool> {
	return {
		upload_file: {
			description:
				'Upload a file provided by the caller into a file input on the page. ' +
				'Use the index of the file input itself, or of the visible upload button/label/dropzone ' +
				'(the hidden input is resolved automatically). Only file_id values listed in the task are valid. ' +
				'If the page opens a file-picker dialog when clicking upload, use this tool INSTEAD of clicking.',
			inputSchema: z.object({
				index: z.int().min(0).describe('Index of the file input or upload button/dropzone'),
				file_id: z.string().describe('file_id of a provided file, as listed in the task'),
			}),
			execute: async (input: unknown) => {
				const { index, file_id } = input as { index: number; file_id: string }
				try {
					const file = availableFiles.find((f) => f.id === file_id)
					if (!file) {
						const ids = availableFiles.map((f) => f.id).join(', ') || '(none)'
						return `❌ Unknown file_id "${file_id}". Available: ${ids}`
					}
					if (bridgePort === null) {
						return '❌ No file bridge available. Files can only be uploaded when provided by the caller.'
					}
					if (file.size > MAX_FILE_SIZE) {
						return `❌ File too large (${file.size} bytes). Max supported size is ${MAX_FILE_SIZE} bytes.`
					}

					const res = await fetch(`http://localhost:${bridgePort}/files/${file.id}`)
					if (!res.ok) {
						return `❌ Failed to fetch file from caller: HTTP ${res.status}`
					}
					const dataBase64 = toBase64(await res.arrayBuffer())

					const result = await pageController.uploadFile(index, [
						{ name: file.name, type: file.mime || 'application/octet-stream', dataBase64 },
					])
					return result.message
				} catch (error) {
					return `❌ Failed: ${error instanceof Error ? error.message : String(error)}`
				}
			},
		},
	}
}
