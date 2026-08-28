/// <reference types="vite/client" />
import type { EBAgent } from './EBAgent'

declare global {
	interface Window {
		ebAgent?: EBAgent
		EBAgent: typeof EBAgent
	}
}
