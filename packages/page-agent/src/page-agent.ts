/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */
import { PageAgent } from './PageAgent'
import type { PageAgentConfig } from './PageAgent'

export { PageAgent, type PageAgentConfig }

;(window as Window & typeof globalThis).PageAgent = PageAgent
