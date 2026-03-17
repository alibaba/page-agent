import type { HistoricalEvent } from '@page-agent/core'
import { type DBSchema, type IDBPDatabase, openDB } from 'idb'

import type { Recording } from './recording-types'

const DB_NAME = 'page-agent-ext'
const DB_VERSION = 2

export interface SessionRecord {
	id: string
	task: string
	history: HistoricalEvent[]
	status: 'completed' | 'error'
	createdAt: number
}

interface PageAgentDB extends DBSchema {
	sessions: {
		key: string
		value: SessionRecord
		indexes: { 'by-created': number }
	}
	recordings: {
		key: string
		value: Recording
		indexes: { 'by-ts': number }
	}
}

let dbPromise: Promise<IDBPDatabase<PageAgentDB>> | null = null

function getDB() {
	if (!dbPromise) {
		dbPromise = openDB<PageAgentDB>(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				// v1: sessions store
				if (oldVersion < 1) {
					const store = db.createObjectStore('sessions', { keyPath: 'id' })
					store.createIndex('by-created', 'createdAt')
				}
				// v2: recordings store
				if (oldVersion < 2) {
					const store = db.createObjectStore('recordings', { keyPath: 'id' })
					store.createIndex('by-ts', 'ts')
				}
			},
		})
	}
	return dbPromise
}

// ─── Session CRUD ──────────────────────────────────────────────────

export async function saveSession(
	session: Omit<SessionRecord, 'id' | 'createdAt'>
): Promise<SessionRecord> {
	const db = await getDB()
	const record: SessionRecord = {
		...session,
		id: crypto.randomUUID(),
		createdAt: Date.now(),
	}
	await db.put('sessions', record)
	return record
}

/** List sessions, newest first */
export async function listSessions(): Promise<SessionRecord[]> {
	const db = await getDB()
	const all = await db.getAllFromIndex('sessions', 'by-created')
	return all.reverse()
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
	const db = await getDB()
	return db.get('sessions', id)
}

export async function deleteSession(id: string): Promise<void> {
	const db = await getDB()
	await db.delete('sessions', id)
}

export async function clearSessions(): Promise<void> {
	const db = await getDB()
	await db.clear('sessions')
}

// ─── Recording CRUD ────────────────────────────────────────────────

export async function saveRecording(
	recording: Omit<Recording, 'id'>
): Promise<Recording> {
	const db = await getDB()
	const record: Recording = {
		...recording,
		id: crypto.randomUUID(),
	}
	await db.put('recordings', record)
	return record
}

/** List recordings, newest first */
export async function listRecordings(): Promise<Recording[]> {
	const db = await getDB()
	const all = await db.getAllFromIndex('recordings', 'by-ts')
	return all.reverse()
}

export async function getRecording(id: string): Promise<Recording | undefined> {
	const db = await getDB()
	return db.get('recordings', id)
}

export async function updateRecording(recording: Recording): Promise<void> {
	const db = await getDB()
	await db.put('recordings', recording)
}

export async function deleteRecording(id: string): Promise<void> {
	const db = await getDB()
	await db.delete('recordings', id)
}

export async function clearRecordings(): Promise<void> {
	const db = await getDB()
	await db.clear('recordings')
}
