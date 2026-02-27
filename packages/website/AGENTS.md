# Website Package - Instructions for Coding Assistants

## Tech Stack

- **React** with TypeScript
- **Vite** for dev server and build
- **Tailwind CSS** for styling
- **shadcn/ui** (new-york style) for UI components — **do NOT hand-edit `src/components/ui/` files**
- **Magic UI** for animations and effects
- **wouter** with browser routing (`base: "/page-agent"`)
- **lucide-react** for icons

## Component Guidelines

### Use shadcn/ui Components First

**ALWAYS prefer shadcn/ui components over custom implementations.**

Before creating any UI component, check if shadcn already provides it:

```bash
# IMPORTANT: Run from packages/website/, NOT from repo root
cd packages/website

# Add a new shadcn component
npx shadcn@latest add <component-name>

# Add a Magic UI component
npx shadcn@latest add "@magicui/<component-name>"
```

Available shadcn components: https://ui.shadcn.com/docs/components
Available Magic UI components: https://magicui.design/docs/components

### Current UI Components

Located in `src/components/ui/`:

**From shadcn/ui:**

- `alert`, `badge`, `button`, `separator`, `sonner`, `switch`, `tooltip`

**From Magic UI:**

- `animated-gradient-text`, `animated-shiny-text`, `aurora-text`
- `hyper-text`, `magic-card`, `neon-gradient-card`, `particles`
- `sparkles-text`, `text-animate`, `typing-animation`

**Custom:**

- `highlighter`, `kbd`, `spinner`

### Styling Rules

1. **Prefer Tailwind classes** over custom CSS
2. Support dark mode via `dark:` classes
3. Use CSS variables from `src/index.css` for theme colors

## Project Structure

```
src/
├── pages/
│   ├── home/
│   │   ├── HomeContent.tsx  # Homepage sections
│   │   └── ...Section.tsx
│   └── docs/
│       ├── index.tsx    # Docs route switch
│       ├── Layout.tsx   # Sidebar navigation
│       └── [section]/[topic]/page.tsx
├── components/
│   ├── ui/              # shadcn/ui + Magic UI (DO NOT hand-edit)
│   ├── Heading.tsx      # Anchor heading for doc pages
│   ├── Header.tsx       # Site header
│   └── Footer.tsx       # Site footer
├── i18n/                # Internationalization
├── router.tsx           # Root layout + routing
└── main.tsx             # App entry
```

## Routing

Uses wouter browser routing with base path for GitHub Pages deployment at `https://alibaba.github.io/page-agent/`.

```tsx
// main.tsx
<Router base="/page-agent">
  <PagesRouter />
</Router>
```

**Key rules:**

- Header and Footer live in `router.tsx` **outside** `<Switch>`, so they always see the root router context (`base="/page-agent"`)
- Docs pages are nested via `<Route path="/docs" nest>`, which creates a child context (`base="/page-agent/docs"`)
- Inside the docs nest, Link hrefs are relative to `/docs` (e.g. `href="/features/models"`, NOT `href="/docs/features/models"`)
- **Never use `~` prefix** in Link hrefs — it bypasses the base path entirely
- Doc page headings use `<Heading id="slug" level={2}>` for anchor links

### SPA on GitHub Pages

Instead of `404.html` redirects, the build copies `index.html` into every route directory. Add new routes to the `SPA_ROUTES` array in `vite.config.js`.

## Adding New Pages

### Documentation Page

1. Create `src/pages/docs/<section>/<slug>/page.tsx`
2. Add route in `src/pages/docs/index.tsx`
3. Add navigation item in `src/pages/docs/Layout.tsx`
4. Add path to `SPA_ROUTES` in `vite.config.js`

## Configuration Files

| File              | Purpose                 |
| ----------------- | ----------------------- |
| `components.json` | shadcn/ui configuration |
| `vite.config.js`  | Vite build + SPA routes |
| `tsconfig.json`   | TypeScript config       |

## Commands

```bash
npm start            # Dev server (from root)
npm run build:website    # Build website (from root)
```
