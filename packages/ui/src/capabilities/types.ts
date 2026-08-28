/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * Structural types for the capability dashboard.
 *
 * @remarks
 * Declared locally rather than imported from `@eb-agent/capabilities`, for the
 * same reason `PanelAgentAdapter` exists: the UI package stays decoupled and
 * dependency-free, and anything shaped like this can drive the dashboard.
 */

export type DashboardReviewState = 'approved' | 'pending' | 'rejected'

export type DashboardRiskLevel = 'read' | 'reversible' | 'consequential'

export interface DashboardCapability {
	id: string
	name: string
	description: string
	source: string
	executionType: string
	risk: DashboardRiskLevel
	confidence: number
	inputSchema?: { properties?: Record<string, unknown> }
}

export interface DashboardStats {
	total: number
	exposed: number
	bySource: Record<string, number>
	webmcpSupported: boolean
	published: number
	approved: number
	pending: number
	rejected: number
	remoteServers: number
}

/** What the dashboard needs from a capability manager. */
export interface CapabilityDashboardAdapter {
	inventory(page?: string): { capability: DashboardCapability; state: DashboardReviewState }[]
	stats(page?: string): DashboardStats
	setReview(
		capabilityId: string,
		state: DashboardReviewState,
		edits?: { name?: string; description?: string; risk?: DashboardRiskLevel }
	): Promise<void>
}
