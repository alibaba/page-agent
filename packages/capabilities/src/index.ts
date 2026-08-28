/**
 * Copyright (c) 2026 EqualByte
 * All rights reserved.
 *
 * @packageDocumentation
 * The Capability layer: a registry of what the current application can do, a
 * resolver that picks the best implementation, a policy engine that decides what
 * needs a human, and an execution engine that runs it and records an audit trail.
 *
 * WebMCP is one adapter behind this layer, not the layer itself — so eb-agent keeps
 * working unchanged in browsers that have never heard of `modelContext`, and can
 * grow API-backed and remote-MCP adapters later without the planner changing.
 */
export { CapabilityRegistry } from './CapabilityRegistry'
export { CapabilityResolver, type Resolution, type ResolveOptions } from './CapabilityResolver'
export { PolicyEngine } from './PolicyEngine'
export {
	CapabilityDeniedError,
	ExecutionEngine,
	type ExecutionEngineConfig,
} from './ExecutionEngine'
export {
	WebMCPAdapter,
	type RegisterOptions,
	type WebMCPPort,
	type WebMCPToolDescriptor,
} from './adapters/WebMCPAdapter'
export {
	RemoteMCPAdapter,
	type RemoteMCPServerConfig,
	type RemoteMCPTool,
} from './adapters/RemoteMCPAdapter'
export { CapabilityReviewManager, LocalReviewStore, MemoryReviewStore } from './CapabilityReview'
export {
	BUDGETS,
	businessActionKey,
	normalizeName,
	normalizeResult,
	resolveAnnotations,
	samePage,
	sanitizeDescription,
	sanitizeSchema,
	summarizeForApproval,
	truncate,
} from './utils'
export {
	SOURCE_PRIORITY,
	type ApprovalHandler,
	type AuditEvent,
	type Capability,
	type CapabilityAnnotations,
	type CapabilityContext,
	type CapabilityInput,
	type CapabilityResult,
	type CapabilityReview,
	type CapabilitySource,
	type ReviewState,
	type ReviewStore,
	type ExecutionType,
	type JSONSchema,
	type PolicyConfig,
	type PolicyDecision,
	type RiskLevel,
} from './types'
