# Instructions for coding assistants

## Project Overview

This is a **monorepo** with npm workspaces containing **two main packages**:

1. **Core Library** (`packages/page-agent/`) - Pure JavaScript/TypeScript AI agent library for browser DOM automation, published as `page-agent` on npm
2. **Website** (`packages/website/`) - React documentation and landing page. Also as demo and test page for the core lib. private package `@page-agent/website`

## Development Commands

### Core Commands

```bash
npm start                    # Start website dev server
npm run dev                  # Same as start
npm run build                # Build all packages
npm run build:lib            # Build page-agent library only
npm run lint                 # ESLint with TypeScript strict rules
```

### Package-specific Commands

```bash
# Core library
npm run build --workspace=page-agent
npm run build:watch --workspace=page-agent

# Website
npm run dev --workspace=@page-agent/website
npm run build --workspace=@page-agent/website
```

## Architecture & Critical Patterns

### Monorepo Structure

```
packages/
├── page-agent/              # npm: "page-agent"
│   ├── src/                 # Core library source
│   ├── vite.config.js       # Library build (ES + UMD)
│   └── package.json
└── website/                 # npm: "@page-agent/website" (private)
    ├── src/                 # Website source (formerly pages/)
    ├── index.html
    ├── vite.config.js       # Website build
    └── package.json
```

### Module Boundaries (Critical)

- **Core library** (`packages/page-agent/`): NEVER import from website - must remain pure JavaScript
- **Website** (`packages/website/`): CAN import from `page-agent` for demos. Alias `@/` → `website/src/`

### DOM Pipeline

1. **DOM Extraction**: Convert live DOM to `FlatDomTree` via `src/dom/dom_tree/`
2. **Dehydration**: DOM tree → simplified text for LLM processing
3. **LLM Processing**: AI model returns action plans
4. **Indexed Operations**: Map LLM responses back to specific DOM elements

### Event Bus Communication

Use `src/utils/bus.ts` for decoupled PageAgent ↔ UI communication:

```typescript
// Emit from PageAgent
getEventBus().emit('panel:show')
getEventBus().emit('panel:update', { status: 'thinking' })

// Listen in UI components
getEventBus().on('panel:show', () => panel.show())
```

### Hash Routing Requirement

Uses wouter with `useHashLocation` for static hosting:

```tsx
<Router hook={useHashLocation}>  // Always hash-based routes
```

### CDN Auto-Injection Pattern

Library auto-initializes when injected via script tag:

```html
<script src="page-agent.js?model=gpt-4"></script>
```

Query params configure `PageAgentConfig` automatically in `src/entry.ts`.

## File Organization

### Core Library (`packages/page-agent/src/`)

- `entry.ts` - CDN/UMD entry point with auto-initialization
- `PageAgent.ts` - **Main AI agent class** orchestrating DOM operations
- `tools/` - Agent tool implementations for web actions
- `ui/` - UI components (Panel, SimulatorMask) with CSS modules
- `utils/bus.ts` - **Type-safe event bus** for decoupled communication
- `patches/` - Framework-specific optimizations (React, Antd compatibility)
- `llms/` - LLM integration and communication layer
- `dom/` - HTML serialization and page analysis utilities
- `config/` - Configuration constants and settings

### Website (`packages/website/src/`)

- `main.tsx` - Site entry with hash routing setup
- `router.tsx` - **Manual route definitions** (requires explicit registration)
- `components/DocsLayout.tsx` - Navigation structure (hardcoded nav items)
- `docs/[section]/[topic]/page.tsx` - Documentation pages
- `test-pages/` - Library integration test pages

## Adding New Features

### New Documentation Page

1. Create `packages/website/src/docs/<section>/<slug>/page.tsx`
2. Add route to `packages/website/src/router.tsx` with `<Header /> + <DocsLayout>` wrapper
3. Add navigation item to `DocsLayout.tsx`

### New Agent Tool

1. Implement under `packages/page-agent/src/tools/`
2. Export via `packages/page-agent/src/tools/index.ts`
3. Wire into `PageAgent.ts` if needed

### New UI Component

1. Create in `packages/page-agent/src/ui/` with colocated CSS modules
2. Use event bus for PageAgent communication

## Code Standards

### TypeScript

- Explicit typing for exported/public APIs
- ESLint relaxes some unsafe rules for rapid iteration

### CSS & Styling

- **Prefer Tailwind CSS over custom CSS**
- Custom CSS variables for theme gradients in `src/index.css`
- Dark mode support via `dark:` classes
- CSS modules for component-specific styles

### Import Organization

- External libraries first
- Internal modules (`@/`, `@pages/`)
- Relative imports last
- Blank lines between groups

## Critical Files to Understand

- `packages/page-agent/src/PageAgent.ts` - Core AI agent class with DOM manipulation
- `packages/page-agent/src/dom/dom_tree/index.js` - DOM extraction engine
- `packages/page-agent/src/utils/bus.ts` - Type-safe event bus system
- `packages/page-agent/src/entry.ts` - Library entry point for CDN usage
- `packages/page-agent/vite.config.js` - Library build configuration

- `packages/website/src/router.tsx` - Central routing definition (manual registration required)
- `packages/website/src/components/DocsLayout.tsx` - Navigation structure
- `packages/website/vite.config.js` - Website build configuration

## Debugging Common Issues

### Blank Documentation Pages

1. Verify route exists in `packages/website/src/router.tsx`
2. Check component import path
3. Verify CSS isn't hiding content (check dark mode classes)
4. Test with minimal component first

### Library Integration Issues

1. Check `packages/page-agent/dist/lib/page-agent.umd.js` builds correctly
2. Test CDN injection with query params
3. Verify event bus communications are properly typed
4. Use `packages/website/src/test-pages/` for isolated testing
