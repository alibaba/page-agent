/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * Library entry point - exports PageAgent class for programmatic use.
 * Unlike demo.ts, this does NOT auto-initialize with demo credentials.
 *
 * Usage:
 *   <script src="page-agent.js"></script>
 *   <script>
 *     const agent = new window.PageAgent({ model: '...', apiKey: '...' });
 *   </script>
 */
import { PageAgent } from './PageAgent'
import type { PageAgentConfig } from './PageAgent'

export { PageAgent, type PageAgentConfig }

/**
 * Attach PageAgent to window for IIFE/UMD browser usage.
 * This side-effect is REQUIRED for <script> tag usage - libraries like
 * jQuery, React, Vue operate identically. This is not an anti-pattern;
 * it's the standard approach for browser UMD/IIFE libraries.
 */
;(window as Window & typeof globalThis).PageAgent = PageAgent
