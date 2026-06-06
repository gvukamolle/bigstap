# CLAUDE.md

Guidance for AI assistants working in this repository.

**Canonical docs (updated):** [docs/README.md](./docs/README.md) (Russian architecture/dev guides) · [AGENTS.md](./AGENTS.md) (short entry point).

## Project

BIGSTEP.RU — Russian-language storefront prototype for clothing and accessories. Mobile-first, light-themed. Shop catalog reads **Payload CMS first**, falls back to TypeScript fixtures. Blog, events, and founder pages still use fixtures.

Stack:
- Next.js 16 (App Router, Turbopack) + React 19
- Payload CMS 3.84 (SQLite by default; PostgreSQL optional)
- TypeScript 6 strict mode, ESM (`"type": "module"`)
- Vitest 4 — domain, app utilities, payload helpers
- ESLint flat config

## Commands

```bash
npm install --legacy-peer-deps
npm run dev
npm run build
npm run start
npm run typecheck
npm test
npm run test:watch
npm run lint
npm run admin:seed    # requires PAYLOAD_SEED_ADMIN_USERNAME/PASSWORD in .env
```

Codex/sandbox may need `/usr/local/bin/npm` (see README).

## Layout

```
src/
  app/
    (site)/        # public storefront
    (payload)/     # Payload admin + REST/GraphQL
    api/admin-bootstrap/route.ts
    robots.ts, sitemap.ts
  components/      # SiteHeader, ProductCatalog, CartClient, CheckoutClient, ...
  domain/          # pure TS: products, cart, checkout, catalog, formatting
  data/            # fixtures: products.ts, content.ts, retail.ts
  lib/
    catalog.ts     # getCatalogProducts — Payload → Product, fixture fallback
    cartStorage.ts, siteUrl.ts, requestOrigin.ts
  payload/         # collections, access, admin UI components, seedAdminCredentials
  proxy.ts         # Next.js 16 proxy (gates create-first-user in production)
tests/
  domain/, app/, payload/
docs/              # architecture, development, catalog-and-cms, security-bootstrap
payload.config.ts
next.config.ts
scripts/seed-admin.ts
```

Aliases: `@/*` → `src/*`, `@payload-config` → `payload.config.ts`

## Architecture

**Layers (strict):**
1. `src/domain/*` — no React, Next, or Payload.
2. `src/data/*` — typed fixtures.
3. `src/lib/catalog.ts` — server bridge CMS ↔ domain `Product`.
4. `src/payload/*` — schema, access, `beforeValidate` invariants.

**Catalog:** `getCatalogProducts()` / `getCatalogProductBySlug()`. Client filtering via `domain/catalog.ts` + `ProductCatalog`. See [docs/catalog-and-cms.md](./docs/catalog-and-cms.md).

**Cart:** `CartClient` + `cartStorage` + `domain/cart.ts` — always sanitize against current catalog products.

**Checkout:** `validateCheckoutDraft`; YooKassa and CDEK are stubs; no real Payload order.

**Admin bootstrap:** [docs/security-bootstrap.md](./docs/security-bootstrap.md) — `proxy.ts`, `/api/admin-bootstrap`, cookie `payload-bootstrap`.

**DB:** Postgres if `DATABASE_URI`; else SQLite. `push` only outside production runtime.

## Conventions

- Russian UI and Payload labels.
- Russian commit messages (`feat:`, `fix:`, `улучшение:`, …) — check `git log`.
- Single branch — `main` (repo default); work and commit directly on it, no feature branches unless explicitly asked.
- Integer rubles/stock; `MAX_RUB_AMOUNT`, `MAX_STOCK`, `MAX_QUANTITY` in hooks.
- Validate at boundaries (cart sanitize, checkout, Payload hooks).
- `'use client'` only where needed (localStorage, forms).
- Gitignored: `payload-types.ts`, `.next/`, `*.sqlite`, `*.db`.

## CI

`.github/workflows/ci.yml` — typecheck, lint, test, build on `main`.

## Environment

Copy `.env.example`. Notable: `PAYLOAD_SECRET`, `PAYLOAD_BOOTSTRAP_TOKEN`, `PAYLOAD_SEED_ADMIN_*`, `NEXT_PUBLIC_SITE_URL`, `DATABASE_URI` / `SQLITE_DATABASE_URL`.

## Prototype limits

- Blog, events, founder — fixtures only.
- Payment, CDEK widget, order creation on checkout — not wired.
- Confirm scope before production integrations.

## Planning references

- `docs/superpowers/plans/2026-05-19-bigstep-working-prototype.md`
- `docs/superpowers/specs/2026-05-19-bigstep-mvp-shop-design.md`
- `docs/research/`
