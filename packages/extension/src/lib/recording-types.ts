/**
 * Recording types for Page Agent behavior recording & replay
 */

// ─── Element Descriptor ────────────────────────────────────────────
// Multi-signal semantic element identification for LLM matching
export interface ElementDescriptor {
	text: string // visible text
	tag: string // tag name
	role?: string // ARIA role
	ariaLabel?: string // aria-label
	placeholder?: string // placeholder text
	name?: string // name attribute
	selector?: string // CSS selector (best effort)
	context?: string // nearest landmark/heading context
	idx?: number // index at recording time (fallback)
}

// ─── Recorded Actions ──────────────────────────────────────────────
// Action types aligned with agent tool naming
export type RecordedAction =
	| { type: 'click' }
	| { type: 'input'; value: string; param?: string }
	| { type: 'select'; value: string; param?: string }
	| { type: 'scroll'; direction: 'up' | 'down'; pixels: number }
	| { type: 'navigate'; url: string; param?: string }
	| { type: 'newTab'; url: string }
	| { type: 'switchTab'; tabIdx: number }
	| { type: 'closeTab'; tabIdx: number }
	| { type: 'keypress'; key: string; modifiers?: string[] }
	| { type: 'wait'; seconds: number }

// ─── Page Context ──────────────────────────────────────────────────
export interface PageContext {
	url: string
	title: string
	tabIdx: number
}

// ─── Recorded Step ─────────────────────────────────────────────────
export interface RecordedStep {
	act: RecordedAction // action
	page: PageContext // page context
	el?: ElementDescriptor // target element descriptor (semantic, not index)
	dt: number // relative time offset (ms)
	note?: string // user annotation
}

// ─── Recording ─────────────────────────────────────────────────────
export interface Recording {
	v: 1 // version
	id: string // unique identifier
	name: string // behavior name (e.g. "B站搜索视频")
	desc: string // natural language description
	ts: number // recording timestamp
	startUrl: string // starting URL
	steps: RecordedStep[] // step list
}

// ─── Raw Event from Content Script ─────────────────────────────────
// Intermediate event before being assembled into RecordedStep
export interface RawRecordingEvent {
	type: RecordedAction['type']
	timestamp: number
	url: string
	title: string
	tabId: number
	el?: ElementDescriptor
	data?: Record<string, unknown> // action-specific data
}

// ─── Recording Control Messages ────────────────────────────────────
export type RecordingControlMessage =
	| { type: 'RECORDING_CONTROL'; action: 'start' }
	| { type: 'RECORDING_CONTROL'; action: 'stop' }
	| { type: 'RECORDING_CONTROL'; action: 'status'; payload: { isRecording: boolean } }
	| { type: 'RECORDING_CONTROL'; action: 'recording_event'; payload: RawRecordingEvent }
	| { type: 'RECORDING_CONTROL'; action: 'tab_event'; payload: RawRecordingEvent }
