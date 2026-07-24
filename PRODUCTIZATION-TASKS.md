# Productization Task Sheet — Page Agent → EqualByte (internal)

> Goal (from manager briefing): fork the open-source `alibaba/page-agent` (MIT), white-label it as
> our own product, self-host the injectable JavaScript, and support **per-customer API keys/models**
> (BYOK *or* our managed key with billing). Keep it in **JS/script form for now**; convert to a
> **dynamic MCP later**. This sheet is grounded in the actual repo files.

**Legend:** ⬜ todo · 🔴 blocker/decision needed · P0 must-ship · P1 next · P2 later

---

## Phase 0 — Setup, legal & decisions (do first)

- ⬜ **P0** Confirm fork is clean and repo has its own git remote under our org (currently still
  `github.com/alibaba/page-agent` in every `package.json` `repository`/`homepage`).
- 🔴 **DECISION: Product name & npm scope.** Pick the customer-facing name (e.g. "PageOS")
  and npm scope (e.g. `@equalbyte/*`). Everything in Phase 1 depends on this.
- 🔴 **DECISION: Key model at launch.** Confirm we ship **both** BYOK *and* managed key (briefing
  said "customer's key OR my key, charge accordingly"). This drives Phase 3 scope.
- 🔴 **DECISION: Hosting/CDN provider** for the JS bundle + the managed backend (Vercel, Cloudflare,
  or S3+CloudFront). Vercel tooling is already available in this environment.
- ⬜ **P0** **MIT license compliance (important, not optional):** MIT lets us rebrand and sell, **but
  we must retain the original copyright + license text.** Keep the original `Copyright (C) 2025
  Alibaba Group Holding Limited` notice in `LICENSE` (and the header of
  `packages/core/src/PageOSCore.ts`); add our own copyright alongside — do **not** delete theirs.
  We can freely rebrand product name, UI, and marketing.

---

## Phase 1 — White-labeling / rebranding (P0)

Remove all upstream (Alibaba / Qwen / demo) references from anything customer-visible.

- ⬜ **Package metadata** — update `repository.url` + `homepage` in: root `package.json`,
  `packages/core/package.json`, `packages/ui/package.json`, `packages/page-os/package.json`,
  `packages/mcp/package.json`. Also `author` fields (`Simon<gaomeng1900>`).
- ⬜ **npm package names** — decide rename `@page-os/*` → `@<scope>/*` (or keep libs private /
  `"private": true` if we don't publish them). Note published entry is `page-os`.
- ⬜ **Copyright header** — `packages/core/src/PageOSCore.ts` (see Phase 0 MIT note — keep theirs, add ours).
- ⬜ **README & docs banner** — `README.md` (banner from `page-agent.github.io`, badges, HN/X links),
  `docs/README-zh.md`, `docs/CHANGELOG.md`, `docs/terms-and-privacy.md`, `CONTRIBUTING.md`,
  `docs/CODE_OF_CONDUCT.md`, `docs/SECURITY.md`.
- ⬜ **Legal pages** — rewrite `docs/terms-and-privacy.md` for our entity (the demo/testing
  disclaimer is linked all over the website Hero/quick-start).
- ⬜ **Extension branding** — `packages/extension/wxt.config.js` (`homepage_url`),
  `src/components/ConfigPanel.tsx`, `src/components/misc.tsx`, `src/entrypoints/hub/App.tsx`,
  `PRIVACY.md`, `docs/extension_api.md`. (Store listing name/icons too if we ship the extension.)
- ⬜ **Website branding** — `packages/website/index.html` (OG/meta `og:url`),
  `src/constants.ts`, `src/components/Header.tsx`, `src/components/Footer.tsx`,
  `src/pages/home/HeroSection.tsx`, `src/pages/home/FeaturesSection.tsx`,
  `src/pages/docs/**` (introduction/overview, quick-start, troubleshooting, features/*, models).
  Follow `packages/website/AGENTS.md`.
- ⬜ **Replace GitHub star/issue links** — many docs pages point to `alibaba/page-agent/issues` and
  the star shield `img.shields.io/github/stars/alibaba/page-agent`.
- ⬜ **Swap logos/banner/favicon assets** with our own.
- ⬜ **Verify:** `grep -rniE "alibaba|aliyun|fcapp.run|cn-shanghai|dashscope|gaomeng" packages/ docs/ *.md`
  returns nothing customer-facing (except the retained LICENSE notice).

---

## Phase 2 — Self-host the injectable JS (P0)

Today the bundle is Alibaba-hosted and the demo default backend is
`https://page-ag-testing-ohftxirgbn.cn-shanghai.fcapp.run` (baked into `demo.ts`,
extension `constants.ts`, website `constants.ts`).

- ⬜ **Build the CDN bundle** — `npm run build -w page-os` → produces `page-os.demo.js` (IIFE)
  via `packages/page-os/vite.iife.config.js` into `dist/iife/`.
- ⬜ **Remove baked demo defaults** — in `packages/page-os/src/demo.ts` replace `DEMO_BASE_URL`,
  `DEMO_API_KEY='NA'`, `DEMO_MODEL='qwen3.5-plus'` with our gateway URL + tenant-token model
  (see Phase 3). Same for extension + website `constants.ts`.
- ⬜ **Host on our CDN** — upload bundle to chosen CDN. Provide **versioned, immutable URLs**
  (e.g. `/v1.11/agent.js`) + a `latest` channel, correct `Cache-Control`, and CORS.
- ⬜ **Generate an SRI integrity hash** so customers can pin `integrity=...` on the `<script>` tag.
- ⬜ **Customer snippet** — produce the copy-paste `<script>` tag (with tenant id / token) that
  customers inject. Replace bookmarklet/demo instructions in docs.
- ⬜ **CI/release pipeline** — automate build → publish bundle to CDN + (optionally) npm on version
  bump. Note existing `scripts/sync-version.js`, `scripts/pre-publish.js`, `scripts/post-publish.js`.

---

## Phase 3 — Per-customer API key & multi-tenancy (P0, the core work)

**Problem:** current code supports only (a) a key **baked at build** (`vite.iife.config.js` `define`
of `LLM_API_KEY/BASE_URL/MODEL_NAME`) or (b) a key **in the script URL** (`?apiKey=` in `demo.ts`) —
which **leaks the secret to anyone viewing the page.** Neither gives per-customer segregation. The
`PageOSConfig` / LLM layer (`packages/llms`) is OpenAI-compatible and takes `{ model, baseURL,
apiKey }`, so both modes below plug into the same client.

### 3A — BYOK (customer brings their own key)
- ⬜ **Per-tenant config delivery** — don't bake keys into the shared bundle. Serve each tenant's
  `{ model, baseURL, apiKey? }` config by **tenant id** at runtime (config endpoint or the panel's
  settings stored in the customer's own environment). For BYOK the key stays on the customer side.
- ⬜ **Config UI** — let a BYOK customer enter provider/base URL/model/key in the Panel
  (`packages/ui`) / extension `ConfigPanel.tsx`, persisted locally. No secret ever passes through us.
- ⬜ **Validation** — test-call the customer's key/model on save; surface clear errors (the codebase
  standard: "make errors visible and actionable").

### 3B — Managed key (we provide the AI, we bill) — multi-tenant gateway
This replaces the Alibaba `fcapp.run` proxy with **our own**.
- ⬜ **Gateway service** (server-side): OpenAI-compatible `/chat/completions` endpoint that:
  - authenticates the tenant via a **publishable tenant token** that is **domain-locked**
    (allowlist of the customer's origins) + CORS — the token in the page is *not* a real provider key;
  - looks up that tenant's **provider + secret key** from encrypted server-side storage;
  - injects the real key and forwards to the actual LLM provider;
  - **meters tokens per tenant** (usage is already returned in `InvokeResult.usage` — persist it);
  - enforces **per-tenant quotas / rate limits** (this is the real fix for the "demo only runs 30s"
    throttle — make it a real plan limit, not a hack).
- ⬜ **Bundle points at the gateway** — `baseURL = https://gateway.<us>/v1`, `apiKey =` publishable
  tenant token. **Stop passing real keys via URL query.**
- ⬜ **Secret storage** — encrypt provider keys at rest; never return them to the client.
- ⬜ **Build-vs-buy note:** evaluate **Vercel AI Gateway** for multi-provider routing + usage
  metering + failover instead of hand-rolling the proxy (skill available). Decide before building 3B.

### 3C — Tenant dashboard & billing (shared)
- ⬜ **Sign-up / tenant model** — 5 customers = 5 isolated tenants, each with own key(s)/model.
  Auth for the dashboard (Clerk/Auth0 marketplace options available).
- ⬜ **Dashboard** — add/rotate keys, pick model, set allowed domains, copy install snippet, view
  usage + costs.
- ⬜ **Billing** — meter managed-mode usage per tenant → invoices/limits. (BYOK tenants: flat/seat fee.)
- ⬜ **Isolation guarantee** — verify tenant A can never spend tenant B's key/quota (the manager's
  explicit requirement).

---

## Phase 4 — Testing on multiple sites (P0/P1)

- ⬜ **Test matrix** — e-commerce (the manager's example use case), forms/ERP/CRM admin, SPAs across
  frameworks (React/Vue/Angular/plain), long/infinite-scroll pages.
- ⬜ **Regression** — confirm DOM extraction → dehydration → LLM action pipeline still works after
  rebrand + gateway swap (`packages/page-controller` DOM pipeline).
- ⬜ **Both key modes** — run the matrix in BYOK and managed mode.
- ⬜ **Cross-browser** — Chrome/Edge/Firefox/Safari; extension where applicable.
- ⬜ **Automated E2E** — stand up planned `packages/e2e` with Playwright (per AGENTS.md).
- ⬜ **`npm run typecheck && npm run lint && npm test`** stay green throughout.

---

## Phase 5 — Packaging & delivery (P1)

- ⬜ **Onboarding docs** — "add one script tag to make your site agentic," per-mode setup, snippet,
  SRI, domain allowlist.
- ⬜ **Versioning & changelog** for our releases.
- ⬜ **Support/observability** — logging + error reporting on the gateway (per-tenant).
- ⬜ **Security review** — run `/security-review` on the gateway + token/domain-lock logic before
  any customer goes live.

---

## Phase 6 — Dynamic MCP (P2, LATER — per manager, after JS ships)

- ⬜ Build on existing **`packages/mcp/`** (already an MCP server controlling the browser via the
  extension). Design the "dynamic MCP on top" once the JS product is stable. **Do not start now.**

---

## Cross-cutting / don't-miss

- ⬜ Never ship a real provider key to the browser (bundle, URL, or config). Tenant tokens only.
- ⬜ CORS + origin allowlist on the gateway so tokens can't be reused on other sites.
- ⬜ Keep upstream MIT LICENSE + copyright (Phase 0).
- ⬜ Replace every `fcapp.run` / `dashscope` / `qwen` default so no traffic hits Alibaba infra.
- ⬜ Codebase standard: surface errors, don't hide them; prioritize traceability.

---

### Suggested order
Phase 0 (decisions) → Phase 1 (rebrand) + Phase 2 (self-host) in parallel → Phase 3 (multi-tenant,
the heavy lift) → Phase 4 (test) → Phase 5 (ship) → Phase 6 (MCP, later).
