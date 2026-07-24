/// <reference types="vite/client" />
import type { PageOS } from './PageOS'

declare global {
	interface Window {
		pageOS?: PageOS
		PageOS: typeof PageOS
	}
}
