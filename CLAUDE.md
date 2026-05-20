# CLAUDE.md

Guidance for AI assistants working in this repository.

## Project

BIGSTEP.RU — a Russian-language storefront prototype for clothing and accessories. Mobile-first, light-themed. Public pages render from TypeScript fixtures; Payload CMS is wired in as the foundation for the future admin and server layer.

Stack:
- Next.js 16 (App Router, Turbopack) + React 19
- Payload CMS 3.84 (SQLite by default; PostgreSQL optional)
- TypeScript 6 strict mode, ESM (`"type": "module"`)
- Vitest 4 for domain tests
- ESLint flat config

## Commands

```bash
npm install --legacy-peer-deps   # initial install
npm run dev                       # next dev (Turbopack)
npm run build                     # next build
npm run start                     # next start
npm run typecheck                 # next typegen && tsc --noEmit
npm test                          # vitest run
npm run test:watch                # vitest watch
npm run lint                      # eslint .
```

Codex/sandbox environments may require the explicit npm path `/usr/local/bin/npm` (see README).

## Layout

```
src/
  app/
    (site)/        # public storefront (route group, shares layout/header/footer)
      page.tsx, shop/, cart/, checkout/, blog/, events/, founder/, bootstrap-admin/
    (payload)/     # Payload admin and REST/GraphQL handlers
      admin/[[...segments]]/, api/[...slug]/, api/graphql/, api/graphql-playground/
    api/
      admin-bootstrap/route.ts   # token-gated POST that sets the bootstrap cookie
    globals.css
  components/      # client/server React components (SiteHeader, CartClient, CheckoutClient, ...)
  domain/          # pure TS: products, cart, checkout, formatting (no React, no Payload)
  data/            # TypeScript fixtures (products.ts, content.ts, retail.ts)
  lib/             # browser-side helpers (cartStorage.ts uses localStorage)
  payload/
    access.ts                    # role-based Access helpers (admin, editor)
    collections/                 # Users, Media, Products, Orders, BlogPosts, Events
    globals/SiteSettings.ts
  middleware.ts    # gates Payload create-first-user routes in production
  types/payload-css.d.ts
tests/domain/      # vitest specs mirroring src/domain
docs/
  research/        # market/competitor notes
  superpowers/     # plans & specs (long-form planning docs)
payload.config.ts  # buildConfig: adapters, collections, globals, RU i18n
next.config.ts     # withPayload + image remote patterns
```

Path aliases (`tsconfig.json`):
- `@/*` → `./src/*`
- `@payload-config` → `./payload.config.ts`

## Architecture

**Three-layer separation, keep it strict:**
1. `src/domain/*` — pure TypeScript. No React, no Next, no Payload. Cart math, checkout validation, product types. This is what `tests/domain/*` exercises.
2. `src/data/*` — typed fixtures that satisfy the domain types. Public pages currently read from here, not Payload.
3. `src/payload/*` — Payload collection/global configs and Access functions. Schema invariants are enforced in `beforeValidate` hooks (e.g. `Products.ts`, `Orders.ts`) using integer-range checks; mirror this pattern for new collections.

**Cart flow:** `CartClient` (browser) + `lib/cartStorage.ts` (localStorage, versioned payload, custom `bigstep-cart-updated` event) + `domain/cart.ts` (`sanitizeCart`, `addCartItem`, `updateCartItemQuantity`, `calculateCartTotals`). Always sanitize stored carts against canonical products before trusting them — the domain functions already do this; don't bypass them.

**Checkout flow:** `CheckoutClient` collects `CustomerDetails` + a CDEK pickup placeholder; `domain/checkout.ts#validateCheckoutDraft` returns structured errors. ЮKassa and CDEK are currently stubs — see "Prototype limits" below.

**Admin bootstrap (production):** The Payload `create-first-user` page is hidden until the operator POSTs `PAYLOAD_BOOTSTRAP_TOKEN` to `/api/admin-bootstrap`, which sets an httpOnly `payload-bootstrap` cookie. `src/middleware.ts` 404s `/admin/create-first-user` and `/api/users/first-register` without that cookie. In development the route auto-issues a `local-development` cookie. Don't weaken these checks; the production guard is `NODE_ENV === 'production' && NEXT_PHASE !== 'phase-production-build'`.

**Payload DB selection:** `payload.config.ts` picks `postgresAdapter` if `DATABASE_URI` is set, otherwise `sqliteAdapter` with `SQLITE_DATABASE_URL` (defaults to `file:payload-local.db`). The Payload secret falls back to a local-only constant — production must set `PAYLOAD_SECRET`.

## Conventions

- **Russian UI strings.** All user-facing copy, labels, validation messages, and Payload field labels are in Russian. Match the existing tone when adding strings.
- **Russian commit messages** following types like `feat:`, `fix:`, `улучшение:`, `дизайн:`, `контент:`, `безопасность:`, `сборка:`, `доки:`. Look at `git log` for the active style before composing one.
- **No comments unless they explain a non-obvious WHY** (matches the existing code — files are nearly comment-free).
- **Integers for money and stock.** Rubles are stored as integers (no kopecks); Payload hooks reject non-`Number.isSafeInteger` values via `isSafeIntegerInRange`. Cap: `MAX_RUB_AMOUNT = 10_000_000`, `MAX_STOCK = 100_000`, `MAX_QUANTITY = 100` (orders).
- **Validate at boundaries.** Cart sanitization, checkout validation, Payload `beforeValidate` — these are the trust boundaries. Internal domain helpers assume already-validated input.
- **Server-only by default.** Mark Client Components explicitly (`'use client'`); the components that touch localStorage / form state already do.
- **Fixtures stay typed.** `src/data/products.ts` must satisfy `Product` from `src/domain/products.ts`. Don't loosen the discriminated union (`type: 'sized' | 'one_size'`).
- **Generated files are git-ignored:** `payload-types.ts`, `next-env.d.ts`, `.next/`, `*.sqlite`, `*.db`. Don't commit them; don't lint them (ESLint already ignores `payload-types.ts`).

## Testing

- Vitest runs `tests/**/*.test.ts` in a Node environment (`vitest.config.ts`). `passWithNoTests: true`.
- Current coverage is the domain layer (`tests/domain/cart.test.ts`, `tests/domain/checkout.test.ts`). Add tests there when changing cart/checkout/product logic.
- No React/component tests are configured. If you add one, set up the test environment first rather than shimming jsdom inline.

## Environment variables

Copy `.env.example` to `.env`. Notable keys:
- `DATABASE_URI` — set to switch Payload to Postgres
- `SQLITE_DATABASE_URL` — Payload SQLite file (default `file:payload-local.db`)
- `PAYLOAD_SECRET` — required in production
- `PAYLOAD_BOOTSTRAP_TOKEN` — required in production to ever reach `create-first-user`
- `POSTGRES_PASSWORD` — consumed by `docker-compose.yml`
- `YOOKASSA_*`, `CDEK_*` — placeholders for future integrations

## Prototype limits (do not assume these work)

- Public pages do not read from Payload yet — they use `src/data/*` fixtures.
- ЮKassa is a checkout stub; no real payment is created.
- CDEK is a single hard-coded pickup point; no widget/API integration.
- Order placement validates the flow but doesn't create a real order via Payload.

If a task touches one of these areas, confirm scope before wiring real integrations.

## Working branch

This repository instructs development on `claude/add-claude-documentation-Xoc91` for the current session (see the session brief). Always confirm the active branch before pushing.

## Useful references

- `docs/superpowers/plans/2026-05-19-bigstep-working-prototype.md` — current prototype plan
- `docs/superpowers/specs/2026-05-19-bigstep-mvp-shop-design.md` — MVP design spec
- `docs/research/` — market/retail research notes
- `README.md` — user-facing setup and run instructions (Russian)
