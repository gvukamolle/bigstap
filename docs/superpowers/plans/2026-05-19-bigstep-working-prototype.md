# BIGSTEP Working Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable BIGSTEP.RU prototype: a mobile-first minimalist fashion shop with product browsing, persisted cart, checkout shell, blog/events/founder pages, and a Payload/Postgres-ready admin foundation.

**Architecture:** Create a Next.js App Router project in the current repository. The first prototype uses local TypeScript fixtures for public pages and checkout behavior so it can run immediately, while adding Payload collection configs and Docker Compose wiring as the admin/backend foundation for the next iteration. Integration boundaries for YooKassa and CDEK are represented as typed adapters and checkout placeholders, not live external calls.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules/global CSS, Vitest for domain tests, Payload CMS, PostgreSQL via Docker Compose, npm from `/usr/local/bin/npm`.

---

## Scope

This plan implements the first working prototype, not the full MVP. It must produce a local site that can be opened in the browser and exercised end-to-end through shop browsing, cart, and checkout review.

Included:

- Next.js app scaffold.
- Light-only minimalist fashion UI.
- Russian public pages.
- Product fixtures for sized and one-size goods.
- `in_stock` and `preorder` states.
- Client-side cart persistence.
- Checkout shell with customer form, CDEK pickup selection placeholder, preorder warning, and payment placeholder.
- Blog, event announcements, founder/about page.
- Payload collection configs for the future admin workflow.
- Docker Compose for PostgreSQL.
- Tests for product/cart/checkout domain logic.

Not included:

- Live YooKassa payment creation.
- Live CDEK pickup widget/API.
- Real Payload data fetching in public pages.
- Production deployment.
- Customer accounts.

## File Structure

Create or modify these files:

- `package.json`: scripts and dependencies.
- `tsconfig.json`: strict TypeScript configuration.
- `next.config.ts`: Next.js config.
- `vitest.config.ts`: Vitest config.
- `postcss.config.mjs`: CSS tooling.
- `eslint.config.mjs`: linting.
- `.env.example`: local environment contract.
- `docker-compose.yml`: PostgreSQL service for Payload.
- `src/app/layout.tsx`: app shell and metadata.
- `src/app/page.tsx`: homepage.
- `src/app/shop/page.tsx`: product catalog.
- `src/app/shop/[slug]/page.tsx`: product detail.
- `src/app/cart/page.tsx`: cart page.
- `src/app/checkout/page.tsx`: checkout shell.
- `src/app/blog/page.tsx`: blog index.
- `src/app/blog/[slug]/page.tsx`: article page.
- `src/app/events/page.tsx`: events index.
- `src/app/events/[slug]/page.tsx`: event detail.
- `src/app/founder/page.tsx`: founder/about page.
- `src/app/globals.css`: visual system and responsive layout.
- `src/components/*`: focused UI components.
- `src/data/*`: local fixtures.
- `src/domain/*`: typed business rules.
- `src/payload/*`: Payload collections and access helpers.
- `payload.config.ts`: Payload config.
- `tests/domain/*.test.ts`: domain tests.
- `README.md`: local run instructions.

## Task 1: Scaffold The App

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Verify Node and npm**

Run:

```bash
/Applications/Codex.app/Contents/Resources/node --version
/usr/local/bin/npm --version
```

Expected: Node is `20.9.0` or newer and npm prints a version. Current observed local versions are Node `v24.14.0` and npm `10.9.2`.

- [ ] **Step 2: Create package manifest**

Create `package.json`:

```json
{
  "name": "bigstep-ru",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@payloadcms/db-postgres": "latest",
    "@payloadcms/next": "latest",
    "@payloadcms/richtext-lexical": "latest",
    "clsx": "latest",
    "graphql": "latest",
    "next": "latest",
    "payload": "latest",
    "react": "latest",
    "react-dom": "latest",
    "sharp": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "eslint": "latest",
    "eslint-config-next": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
/usr/local/bin/npm install --legacy-peer-deps
```

Expected: `package-lock.json` and `node_modules/` are created.

- [ ] **Step 4: Add TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Add framework configs**

Create `next.config.ts`:

```ts
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      }
    ]
  }
}

export default withPayload(nextConfig)
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
```

Create `postcss.config.mjs`:

```js
const config = {}

export default config
```

Create `eslint.config.mjs`:

```js
import next from 'eslint-config-next'

export default [...next]
```

- [ ] **Step 6: Add environment example**

Create `.env.example`:

```bash
DATABASE_URI=postgres://bigstep:bigstep@localhost:5432/bigstep
PAYLOAD_SECRET=replace-with-a-long-local-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
CDEK_CLIENT_ID=
CDEK_CLIENT_SECRET=
```

- [ ] **Step 7: Extend ignore rules**

Ensure `.gitignore` contains:

```gitignore
.DS_Store
.env
.env.*
!.env.example
node_modules/
.next/
dist/
build/
coverage/
.superpowers/
payload-types.ts
```

- [ ] **Step 8: Commit scaffold**

Run:

```bash
/usr/bin/git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts postcss.config.mjs eslint.config.mjs .env.example .gitignore
/usr/bin/git commit -m "chore: scaffold Next prototype"
```

Expected: commit succeeds.

## Task 2: Add Domain Types, Fixtures, And Tests

**Files:**

- Create: `src/domain/products.ts`
- Create: `src/domain/cart.ts`
- Create: `src/domain/checkout.ts`
- Create: `src/data/products.ts`
- Create: `src/data/content.ts`
- Create: `tests/domain/cart.test.ts`
- Create: `tests/domain/checkout.test.ts`

- [ ] **Step 1: Write cart tests first**

Create `tests/domain/cart.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { addCartItem, calculateCartTotals } from '@/domain/cart'
import { products } from '@/data/products'

describe('cart domain', () => {
  it('adds sized products with selected size', () => {
    const overshirt = products.find((product) => product.slug === 'overshirt-01')
    if (!overshirt) throw new Error('Fixture product missing')

    const cart = addCartItem([], overshirt, 'M')

    expect(cart).toEqual([
      {
        id: 'overshirt-01:M',
        productSlug: 'overshirt-01',
        title: 'Овершерт 01',
        price: 12900,
        quantity: 1,
        size: 'M',
        saleStatus: 'in_stock'
      }
    ])
  })

  it('increments an existing cart line instead of duplicating it', () => {
    const tee = products.find((product) => product.slug === 'tee-preorder')
    if (!tee) throw new Error('Fixture product missing')

    const first = addCartItem([], tee, 'S')
    const second = addCartItem(first, tee, 'S')

    expect(second).toHaveLength(1)
    expect(second[0]?.quantity).toBe(2)
  })

  it('calculates preorder presence and totals', () => {
    const overshirt = products.find((product) => product.slug === 'overshirt-01')
    const tee = products.find((product) => product.slug === 'tee-preorder')
    if (!overshirt || !tee) throw new Error('Fixture products missing')

    const cart = addCartItem(addCartItem([], overshirt, 'M'), tee, 'M')
    const totals = calculateCartTotals(cart, 650)

    expect(totals).toEqual({
      itemsTotal: 20800,
      deliveryTotal: 650,
      orderTotal: 21450,
      hasPreorder: true
    })
  })
})
```

- [ ] **Step 2: Write checkout tests first**

Create `tests/domain/checkout.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateCheckoutDraft } from '@/domain/checkout'

describe('checkout domain', () => {
  it('requires customer data and CDEK pickup point before payment', () => {
    const result = validateCheckoutDraft({
      customer: {
        fullName: '',
        phone: '+79990000000',
        email: 'client@example.com',
        city: 'Москва'
      },
      cdekPickup: null
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Укажите имя и фамилию')
    expect(result.errors).toContain('Выберите пункт выдачи СДЭК')
  })

  it('accepts a complete checkout draft', () => {
    const result = validateCheckoutDraft({
      customer: {
        fullName: 'Иван Иванов',
        phone: '+79990000000',
        email: 'client@example.com',
        city: 'Москва'
      },
      cdekPickup: {
        code: 'MSK123',
        name: 'СДЭК Тверская',
        address: 'Москва, Тверская 1',
        city: 'Москва',
        price: 650
      }
    })

    expect(result).toEqual({ valid: true, errors: [] })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
/usr/local/bin/npm test
```

Expected: FAIL because `src/domain/*` and `src/data/*` do not exist yet.

- [ ] **Step 4: Add product domain types**

Create `src/domain/products.ts`:

```ts
export type ProductSaleStatus = 'in_stock' | 'preorder' | 'sold_out' | 'hidden'

export type ProductBase = {
  slug: string
  title: string
  category: string
  price: number
  salePrice?: number
  saleStatus: ProductSaleStatus
  shortDescription: string
  description: string
  imageTone: 'black' | 'stone' | 'charcoal' | 'cream'
  preorderNote?: string
  published: boolean
}

export type SizedProduct = ProductBase & {
  type: 'sized'
  sizes: Array<{
    label: string
    stock: number
  }>
}

export type OneSizeProduct = ProductBase & {
  type: 'one_size'
  stock: number
}

export type Product = SizedProduct | OneSizeProduct

export function getDisplayPrice(product: Product): number {
  return product.salePrice ?? product.price
}

export function isSelectableSize(product: Product, size: string | null): boolean {
  if (product.type === 'one_size') return size === null

  return product.sizes.some((item) => item.label === size && item.stock > 0)
}
```

- [ ] **Step 5: Add cart domain**

Create `src/domain/cart.ts`:

```ts
import { getDisplayPrice, type Product, type ProductSaleStatus } from './products'

export type CartItem = {
  id: string
  productSlug: string
  title: string
  price: number
  quantity: number
  size: string | null
  saleStatus: ProductSaleStatus
}

export type CartTotals = {
  itemsTotal: number
  deliveryTotal: number
  orderTotal: number
  hasPreorder: boolean
}

export function createCartItemId(productSlug: string, size: string | null): string {
  return `${productSlug}:${size ?? 'one-size'}`
}

export function addCartItem(cart: CartItem[], product: Product, size: string | null): CartItem[] {
  const id = createCartItemId(product.slug, size)
  const existing = cart.find((item) => item.id === id)

  if (existing) {
    return cart.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
  }

  return [
    ...cart,
    {
      id,
      productSlug: product.slug,
      title: product.title,
      price: getDisplayPrice(product),
      quantity: 1,
      size,
      saleStatus: product.saleStatus
    }
  ]
}

export function removeCartItem(cart: CartItem[], id: string): CartItem[] {
  return cart.filter((item) => item.id !== id)
}

export function updateCartItemQuantity(cart: CartItem[], id: string, quantity: number): CartItem[] {
  if (quantity <= 0) return removeCartItem(cart, id)

  return cart.map((item) => (item.id === id ? { ...item, quantity } : item))
}

export function calculateCartTotals(cart: CartItem[], deliveryTotal = 0): CartTotals {
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return {
    itemsTotal,
    deliveryTotal,
    orderTotal: itemsTotal + deliveryTotal,
    hasPreorder: cart.some((item) => item.saleStatus === 'preorder')
  }
}

export function formatRubles(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(amount)
}
```

- [ ] **Step 6: Add checkout domain**

Create `src/domain/checkout.ts`:

```ts
export type CustomerDetails = {
  fullName: string
  phone: string
  email: string
  city: string
}

export type CdekPickupPoint = {
  code: string
  name: string
  address: string
  city: string
  price: number
}

export type CheckoutDraft = {
  customer: CustomerDetails
  cdekPickup: CdekPickupPoint | null
}

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export function validateCheckoutDraft(draft: CheckoutDraft): ValidationResult {
  const errors: string[] = []

  if (draft.customer.fullName.trim().length < 2) errors.push('Укажите имя и фамилию')
  if (draft.customer.phone.trim().length < 6) errors.push('Укажите телефон')
  if (!draft.customer.email.includes('@')) errors.push('Укажите email')
  if (draft.customer.city.trim().length < 2) errors.push('Укажите город')
  if (!draft.cdekPickup) errors.push('Выберите пункт выдачи СДЭК')

  return {
    valid: errors.length === 0,
    errors
  }
}
```

- [ ] **Step 7: Add fixtures**

Create `src/data/products.ts`:

```ts
import type { Product } from '@/domain/products'

export const products: Product[] = [
  {
    slug: 'overshirt-01',
    title: 'Овершерт 01',
    category: 'Одежда',
    price: 12900,
    saleStatus: 'in_stock',
    type: 'sized',
    sizes: [
      { label: 'S', stock: 3 },
      { label: 'M', stock: 5 },
      { label: 'L', stock: 2 }
    ],
    shortDescription: 'Плотный овершерт свободного кроя.',
    description: 'Базовый слой для города: чистая линия, плотная фактура, спокойная посадка.',
    imageTone: 'black',
    published: true
  },
  {
    slug: 'tee-preorder',
    title: 'Футболка Preorder',
    category: 'Одежда',
    price: 7900,
    saleStatus: 'preorder',
    type: 'sized',
    sizes: [
      { label: 'S', stock: 99 },
      { label: 'M', stock: 99 },
      { label: 'L', stock: 99 }
    ],
    shortDescription: 'Предзаказ на базовую футболку первого дропа.',
    description: 'Мягкий хлопок, прямой силуэт, минимальная маркировка. Отправка после производства партии.',
    imageTone: 'stone',
    preorderNote: 'Ориентировочная отправка: через 3-4 недели после оплаты.',
    published: true
  },
  {
    slug: 'bag-one-size',
    title: 'Сумка One Size',
    category: 'Аксессуары',
    price: 6900,
    saleStatus: 'in_stock',
    type: 'one_size',
    stock: 8,
    shortDescription: 'Лаконичная сумка без размерной сетки.',
    description: 'Аксессуар на каждый день с чистой формой и плотным материалом.',
    imageTone: 'charcoal',
    published: true
  },
  {
    slug: 'cap-one-size',
    title: 'Кепка One Size',
    category: 'Аксессуары',
    price: 4900,
    saleStatus: 'in_stock',
    type: 'one_size',
    stock: 12,
    shortDescription: 'Безразмерная кепка с регулируемой посадкой.',
    description: 'Светлая база, минимум деталей, регулируемая посадка.',
    imageTone: 'cream',
    published: true
  }
]

export function getPublishedProducts(): Product[] {
  return products.filter((product) => product.published && product.saleStatus !== 'hidden')
}

export function getProductBySlug(slug: string): Product | undefined {
  return getPublishedProducts().find((product) => product.slug === slug)
}
```

Create `src/data/content.ts`:

```ts
export const blogPosts = [
  {
    slug: 'drop-01-notes',
    title: 'Заметки к первому дропу',
    excerpt: 'Почему первая капсула начинается с простых вещей и спокойной формы.',
    category: 'Journal',
    date: '19 мая 2026'
  },
  {
    slug: 'materials-and-fit',
    title: 'Материалы и посадка',
    excerpt: 'Коротко о тканях, силуэте и том, как мы думаем о базовом гардеробе.',
    category: 'Process',
    date: '19 мая 2026'
  }
]

export const events = [
  {
    slug: 'studio-open-day',
    title: 'Studio Open Day',
    date: 'Июнь 2026',
    location: 'Москва',
    description: 'Анонс открытой встречи, где можно увидеть вещи и обсудить первый дроп.'
  }
]

export const founder = {
  title: 'Основатель BIGSTEP',
  text: 'BIGSTEP строится вокруг собственного шмота, спокойной визуальной культуры и аккуратного отношения к деталям.',
  socialLinks: [
    { label: 'Telegram', href: 'https://t.me/' },
    { label: 'Instagram', href: 'https://instagram.com/' }
  ]
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run:

```bash
/usr/local/bin/npm test
```

Expected: PASS for cart and checkout tests.

- [ ] **Step 9: Commit domain layer**

Run:

```bash
/usr/bin/git add src/domain src/data tests/domain
/usr/bin/git commit -m "feat: add prototype domain fixtures"
```

Expected: commit succeeds.

## Task 3: Build Shared UI And Public Layout

**Files:**

- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/components/SiteHeader.tsx`
- Create: `src/components/SiteFooter.tsx`
- Create: `src/components/ProductCard.tsx`
- Create: `src/components/StatusPill.tsx`

- [ ] **Step 1: Add global layout**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'

export const metadata: Metadata = {
  title: 'BIGSTEP.RU',
  description: 'Магазин одежды и аксессуаров BIGSTEP.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Add visual system**

Create `src/app/globals.css` with the project visual foundation:

```css
:root {
  --bg: #f7f5ef;
  --panel: #ffffff;
  --text: #080808;
  --muted: #6e6a62;
  --line: #d8d3c8;
  --accent: #111111;
  --danger: #9f2f22;
}

* {
  box-sizing: border-box;
}

html {
  background: var(--bg);
  color: var(--text);
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.4;
  letter-spacing: 0;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.page {
  padding: 28px;
}

.section {
  border-top: 1px solid var(--line);
  padding: 28px 0;
}

.eyebrow {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
}

.display {
  margin: 0;
  font-size: clamp(48px, 10vw, 132px);
  font-weight: 760;
  line-height: 0.86;
  letter-spacing: 0;
  text-transform: uppercase;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
}

.button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--text);
  background: var(--text);
  color: var(--bg);
  padding: 0 18px;
  text-transform: uppercase;
  font-size: 12px;
}

.buttonSecondary {
  background: transparent;
  color: var(--text);
}

@media (max-width: 900px) {
  .page {
    padding: 18px;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Add header and footer**

Create `src/components/SiteHeader.tsx`:

```tsx
import Link from 'next/link'

const navItems = [
  { href: '/shop', label: 'Магазин' },
  { href: '/blog', label: 'Блог' },
  { href: '/events', label: 'Ивенты' },
  { href: '/founder', label: 'Основатель' }
]

export function SiteHeader() {
  return (
    <header className="siteHeader">
      <Link href="/" className="brand">
        BIGSTEP
      </Link>
      <nav className="siteNav" aria-label="Основная навигация">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
        <Link href="/cart">Корзина</Link>
      </nav>
    </header>
  )
}
```

Create `src/components/SiteFooter.tsx`:

```tsx
import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div>BIGSTEP.RU</div>
      <div className="footerLinks">
        <Link href="/shop">Магазин</Link>
        <Link href="/blog">Блог</Link>
        <Link href="/events">Ивенты</Link>
        <Link href="/founder">Соцсети</Link>
      </div>
    </footer>
  )
}
```

Append to `src/app/globals.css`:

```css
.siteHeader,
.siteFooter {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid var(--line);
  padding: 0 28px;
  text-transform: uppercase;
  font-size: 12px;
}

.siteFooter {
  border-top: 1px solid var(--line);
  border-bottom: 0;
}

.brand {
  font-weight: 760;
}

.siteNav,
.footerLinks {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  color: var(--muted);
}

@media (max-width: 720px) {
  .siteHeader,
  .siteFooter {
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    padding: 16px 18px;
  }
}
```

- [ ] **Step 4: Add product UI components**

Create `src/components/StatusPill.tsx`:

```tsx
import type { ProductSaleStatus } from '@/domain/products'

const labels: Record<ProductSaleStatus, string> = {
  in_stock: 'В наличии',
  preorder: 'Предзаказ',
  sold_out: 'Нет в наличии',
  hidden: 'Скрыт'
}

export function StatusPill({ status }: { status: ProductSaleStatus }) {
  return <span className={`statusPill status-${status}`}>{labels[status]}</span>
}
```

Create `src/components/ProductCard.tsx`:

```tsx
import Link from 'next/link'
import { formatRubles } from '@/domain/cart'
import type { Product } from '@/domain/products'
import { StatusPill } from './StatusPill'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link className="productCard" href={`/shop/${product.slug}`}>
      <div className={`productImage tone-${product.imageTone}`} />
      <div className="productMeta">
        <div>
          <h3>{product.title}</h3>
          <p>{product.shortDescription}</p>
        </div>
        <div className="productBottom">
          <span>{formatRubles(product.salePrice ?? product.price)}</span>
          <StatusPill status={product.saleStatus} />
        </div>
      </div>
    </Link>
  )
}
```

Append product styles to `src/app/globals.css`:

```css
.productCard {
  display: grid;
  min-height: 360px;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}

.productImage {
  min-height: 220px;
}

.tone-black {
  background: #111111;
}

.tone-stone {
  background: #d8d3c8;
}

.tone-charcoal {
  background: #3f3c38;
}

.tone-cream {
  background: #f3efe5;
}

.productMeta {
  display: grid;
  gap: 20px;
  padding: 16px;
}

.productMeta h3,
.productMeta p {
  margin: 0;
}

.productMeta p {
  color: var(--muted);
}

.productBottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-transform: uppercase;
  font-size: 12px;
}

.statusPill {
  border: 1px solid var(--line);
  padding: 5px 8px;
}

.status-preorder {
  border-color: var(--text);
}
```

- [ ] **Step 5: Run verification**

Run:

```bash
/usr/local/bin/npm run typecheck
/usr/local/bin/npm test
```

Expected: both commands pass.

- [ ] **Step 6: Commit UI shell**

Run:

```bash
/usr/bin/git add src/app src/components
/usr/bin/git commit -m "feat: add public UI shell"
```

Expected: commit succeeds.

## Task 4: Build Storefront Pages

**Files:**

- Create: `src/app/page.tsx`
- Create: `src/app/shop/page.tsx`
- Create: `src/app/shop/[slug]/page.tsx`
- Create: `src/components/AddToCartForm.tsx`

- [ ] **Step 1: Add homepage**

Create `src/app/page.tsx`:

```tsx
import Link from 'next/link'
import { ProductCard } from '@/components/ProductCard'
import { getPublishedProducts } from '@/data/products'

export default function HomePage() {
  const featured = getPublishedProducts().slice(0, 4)

  return (
    <div className="page">
      <section className="homeHero">
        <div className="homeCopy">
          <span className="eyebrow">Drop 01 / одежда и аксессуары</span>
          <h1 className="display">Own clothes. Quiet impact.</h1>
          <p>
            Минималистичная витрина BIGSTEP: собственный шмот, спокойная форма,
            предзаказы и вещи в наличии в одной корзине.
          </p>
          <Link className="button" href="/shop">
            Смотреть магазин
          </Link>
        </div>
        <div className="homeImage" aria-label="Campaign image placeholder" />
      </section>
      <section className="section">
        <div className="sectionHeader">
          <span className="eyebrow">Shop first</span>
          <h2>Первый дроп</h2>
        </div>
        <div className="grid">
          {featured.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
      </section>
    </div>
  )
}
```

Append homepage styles to `src/app/globals.css`:

```css
.homeHero {
  display: grid;
  grid-template-columns: minmax(320px, 0.85fr) minmax(420px, 1.15fr);
  min-height: 620px;
  border-bottom: 1px solid var(--line);
}

.homeCopy {
  display: grid;
  align-content: end;
  gap: 22px;
  padding: 34px 0;
}

.homeCopy p {
  max-width: 500px;
  color: var(--muted);
  font-size: 17px;
}

.homeImage {
  min-height: 520px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.2)),
    repeating-linear-gradient(135deg, #202020 0 9px, #161616 9px 18px);
}

.sectionHeader {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.sectionHeader h2 {
  margin: 0;
  font-size: clamp(32px, 5vw, 72px);
  line-height: 0.95;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .homeHero {
    grid-template-columns: 1fr;
  }

  .homeImage {
    min-height: 360px;
  }
}
```

- [ ] **Step 2: Add catalog page**

Create `src/app/shop/page.tsx`:

```tsx
import { ProductCard } from '@/components/ProductCard'
import { getPublishedProducts } from '@/data/products'

export default function ShopPage() {
  const products = getPublishedProducts()

  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Магазин</span>
        <h1 className="display">Drop 01</h1>
        <p>Одежда с размерами и безразмерные аксессуары. В наличии и предзаказ можно оформить вместе.</p>
      </section>
      <div className="grid">
        {products.map((product) => (
          <ProductCard product={product} key={product.slug} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add client add-to-cart form**

Create `src/components/AddToCartForm.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { addCartItem, type CartItem } from '@/domain/cart'
import type { Product } from '@/domain/products'

const storageKey = 'bigstep-cart'

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return []

  try {
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
}

function writeCart(cart: CartItem[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(cart))
}

export function AddToCartForm({ product }: { product: Product }) {
  const defaultSize = useMemo(() => (product.type === 'sized' ? product.sizes.find((size) => size.stock > 0)?.label ?? null : null), [product])
  const [size, setSize] = useState<string | null>(defaultSize)
  const [added, setAdded] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextCart = addCartItem(readCart(), product, size)
    writeCart(nextCart)
    setAdded(true)
    window.dispatchEvent(new Event('bigstep-cart-updated'))
  }

  return (
    <form className="addToCart" onSubmit={handleSubmit}>
      {product.type === 'sized' ? (
        <label>
          Размер
          <select value={size ?? ''} onChange={(event) => setSize(event.target.value)}>
            {product.sizes.map((item) => (
              <option disabled={item.stock <= 0} key={item.label} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="oneSize">One size</div>
      )}
      <button className="button" type="submit">
        Добавить в корзину
      </button>
      {added ? <p className="formNote">Добавлено. Корзина сохранена на этом устройстве.</p> : null}
    </form>
  )
}
```

- [ ] **Step 4: Add product detail page**

Create `src/app/shop/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { AddToCartForm } from '@/components/AddToCartForm'
import { StatusPill } from '@/components/StatusPill'
import { getProductBySlug, getPublishedProducts } from '@/data/products'
import { formatRubles } from '@/domain/cart'

export function generateStaticParams() {
  return getPublishedProducts().map((product) => ({ slug: product.slug }))
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) notFound()

  return (
    <div className="page">
      <section className="productDetail">
        <div className={`productDetailImage tone-${product.imageTone}`} />
        <div className="productDetailInfo">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.title}</h1>
          <div className="productDetailMeta">
            <strong>{formatRubles(product.salePrice ?? product.price)}</strong>
            <StatusPill status={product.saleStatus} />
          </div>
          <p>{product.description}</p>
          {product.preorderNote ? <p className="preorderNote">{product.preorderNote}</p> : null}
          <AddToCartForm product={product} />
        </div>
      </section>
    </div>
  )
}
```

Append detail styles to `src/app/globals.css`:

```css
.shopIntro {
  display: grid;
  gap: 18px;
  padding: 46px 0;
  border-bottom: 1px solid var(--line);
}

.shopIntro p {
  max-width: 560px;
  color: var(--muted);
}

.productDetail {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  min-height: 680px;
  border-bottom: 1px solid var(--line);
}

.productDetailImage {
  min-height: 620px;
}

.productDetailInfo {
  display: grid;
  align-content: center;
  gap: 18px;
  padding: 32px;
}

.productDetailInfo h1 {
  margin: 0;
  font-size: clamp(42px, 7vw, 96px);
  line-height: 0.9;
  text-transform: uppercase;
}

.productDetailMeta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-transform: uppercase;
}

.preorderNote,
.formNote {
  color: var(--muted);
}

.addToCart {
  display: grid;
  gap: 14px;
}

.addToCart label {
  display: grid;
  gap: 8px;
  text-transform: uppercase;
  font-size: 12px;
}

.addToCart select {
  min-height: 44px;
  border: 1px solid var(--line);
  background: var(--panel);
  padding: 0 12px;
}

.oneSize {
  border: 1px solid var(--line);
  padding: 12px;
  text-transform: uppercase;
  font-size: 12px;
}

@media (max-width: 900px) {
  .productDetail {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Verify storefront**

Run:

```bash
/usr/local/bin/npm run typecheck
/usr/local/bin/npm test
```

Expected: both pass.

- [ ] **Step 6: Commit storefront**

Run:

```bash
/usr/bin/git add src/app src/components
/usr/bin/git commit -m "feat: build prototype storefront"
```

Expected: commit succeeds.

## Task 5: Build Cart And Checkout Shell

**Files:**

- Create: `src/components/CartClient.tsx`
- Create: `src/components/CheckoutClient.tsx`
- Create: `src/app/cart/page.tsx`
- Create: `src/app/checkout/page.tsx`

- [ ] **Step 1: Add cart page shell**

Create `src/app/cart/page.tsx`:

```tsx
import { CartClient } from '@/components/CartClient'

export default function CartPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Корзина</span>
        <h1 className="display">Cart</h1>
      </section>
      <CartClient />
    </div>
  )
}
```

- [ ] **Step 2: Add cart client**

Create `src/components/CartClient.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { calculateCartTotals, formatRubles, removeCartItem, updateCartItemQuantity, type CartItem } from '@/domain/cart'

const storageKey = 'bigstep-cart'

function readCart(): CartItem[] {
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return []

  try {
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
}

function writeCart(cart: CartItem[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(cart))
}

export function CartClient() {
  const [cart, setCart] = useState<CartItem[]>([])

  useEffect(() => {
    setCart(readCart())
  }, [])

  function update(nextCart: CartItem[]) {
    setCart(nextCart)
    writeCart(nextCart)
  }

  const totals = calculateCartTotals(cart)

  if (cart.length === 0) {
    return (
      <section className="section">
        <p>Корзина пустая.</p>
        <Link className="button" href="/shop">
          В магазин
        </Link>
      </section>
    )
  }

  return (
    <section className="cartLayout section">
      <div className="cartLines">
        {cart.map((item) => (
          <article className="cartLine" key={item.id}>
            <div>
              <h2>{item.title}</h2>
              <p>{item.size ?? 'One size'} / {item.saleStatus === 'preorder' ? 'Предзаказ' : 'В наличии'}</p>
            </div>
            <input
              aria-label={`Количество ${item.title}`}
              min={1}
              onChange={(event) => update(updateCartItemQuantity(cart, item.id, Number(event.target.value)))}
              type="number"
              value={item.quantity}
            />
            <strong>{formatRubles(item.price * item.quantity)}</strong>
            <button className="button buttonSecondary" onClick={() => update(removeCartItem(cart, item.id))} type="button">
              Убрать
            </button>
          </article>
        ))}
      </div>
      <aside className="cartSummary">
        {totals.hasPreorder ? (
          <p className="preorderNote">В корзине есть предзаказ. Весь заказ может быть отправлен позже.</p>
        ) : null}
        <div className="summaryRow">
          <span>Товары</span>
          <strong>{formatRubles(totals.itemsTotal)}</strong>
        </div>
        <Link className="button" href="/checkout">
          Оформить
        </Link>
      </aside>
    </section>
  )
}
```

- [ ] **Step 3: Add checkout page shell**

Create `src/app/checkout/page.tsx`:

```tsx
import { CheckoutClient } from '@/components/CheckoutClient'

export default function CheckoutPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Checkout</span>
        <h1 className="display">Оформление</h1>
      </section>
      <CheckoutClient />
    </div>
  )
}
```

- [ ] **Step 4: Add checkout client**

Create `src/components/CheckoutClient.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { calculateCartTotals, formatRubles, type CartItem } from '@/domain/cart'
import { validateCheckoutDraft, type CdekPickupPoint, type CustomerDetails } from '@/domain/checkout'

const storageKey = 'bigstep-cart'

const prototypePickup: CdekPickupPoint = {
  code: 'MSK123',
  name: 'СДЭК Тверская',
  address: 'Москва, Тверская 1',
  city: 'Москва',
  price: 650
}

function readCart(): CartItem[] {
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return []

  try {
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
}

export function CheckoutClient() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState<CustomerDetails>({
    fullName: '',
    phone: '',
    email: '',
    city: 'Москва'
  })
  const [pickupSelected, setPickupSelected] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setCart(readCart())
  }, [])

  const cdekPickup = pickupSelected ? prototypePickup : null
  const deliveryTotal = cdekPickup?.price ?? 0
  const totals = calculateCartTotals(cart, deliveryTotal)
  const validation = validateCheckoutDraft({ customer, cdekPickup })

  function updateCustomer(field: keyof CustomerDetails, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <form className="checkoutLayout section" onSubmit={handleSubmit}>
      <div className="checkoutPanel">
        <h2>Данные покупателя</h2>
        <label>
          Имя и фамилия
          <input value={customer.fullName} onChange={(event) => updateCustomer('fullName', event.target.value)} />
        </label>
        <label>
          Телефон
          <input value={customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} />
        </label>
        <label>
          Email
          <input value={customer.email} onChange={(event) => updateCustomer('email', event.target.value)} />
        </label>
        <label>
          Город
          <input value={customer.city} onChange={(event) => updateCustomer('city', event.target.value)} />
        </label>
      </div>

      <div className="checkoutPanel">
        <h2>Доставка СДЭК</h2>
        <p>В рабочем MVP здесь будет виджет выбора ПВЗ. В прототипе выбираем тестовый пункт.</p>
        <button className="button buttonSecondary" onClick={() => setPickupSelected(true)} type="button">
          Выбрать ПВЗ: {prototypePickup.name}
        </button>
        {cdekPickup ? <p>{cdekPickup.address}</p> : null}
      </div>

      <aside className="cartSummary">
        <h2>Итог</h2>
        {totals.hasPreorder ? <p className="preorderNote">В корзине есть предзаказ. Отправка может быть позже.</p> : null}
        <div className="summaryRow">
          <span>Товары</span>
          <strong>{formatRubles(totals.itemsTotal)}</strong>
        </div>
        <div className="summaryRow">
          <span>СДЭК</span>
          <strong>{formatRubles(totals.deliveryTotal)}</strong>
        </div>
        <div className="summaryRow">
          <span>К оплате</span>
          <strong>{formatRubles(totals.orderTotal)}</strong>
        </div>
        <button className="button" type="submit">
          Перейти к оплате
        </button>
        {submitted ? (
          validation.valid ? (
            <p className="formNote">Прототип: здесь будет создание платежа ЮKassa.</p>
          ) : (
            <ul className="errorList">
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )
        ) : null}
      </aside>
    </form>
  )
}
```

Append cart/checkout styles to `src/app/globals.css`:

```css
.cartLayout,
.checkoutLayout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
}

.cartLines,
.checkoutPanel {
  display: grid;
  gap: 14px;
}

.cartLine,
.cartSummary,
.checkoutPanel {
  border: 1px solid var(--line);
  background: var(--panel);
  padding: 18px;
}

.cartLine {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px auto auto;
  gap: 14px;
  align-items: center;
}

.cartLine h2,
.cartLine p,
.cartSummary h2,
.checkoutPanel h2 {
  margin: 0;
}

.cartLine p,
.checkoutPanel p {
  color: var(--muted);
}

.cartLine input,
.checkoutPanel input {
  min-height: 44px;
  border: 1px solid var(--line);
  background: var(--bg);
  padding: 0 12px;
}

.checkoutPanel label {
  display: grid;
  gap: 8px;
  text-transform: uppercase;
  font-size: 12px;
}

.cartSummary {
  align-self: start;
  display: grid;
  gap: 14px;
}

.summaryRow {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}

.errorList {
  color: var(--danger);
}

@media (max-width: 900px) {
  .cartLayout,
  .checkoutLayout {
    grid-template-columns: 1fr;
  }

  .cartLine {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Verify cart and checkout**

Run:

```bash
/usr/local/bin/npm run typecheck
/usr/local/bin/npm test
```

Expected: both pass.

- [ ] **Step 6: Commit cart and checkout**

Run:

```bash
/usr/bin/git add src/app/cart src/app/checkout src/components/CartClient.tsx src/components/CheckoutClient.tsx src/app/globals.css
/usr/bin/git commit -m "feat: add cart and checkout prototype"
```

Expected: commit succeeds.

## Task 6: Build Blog, Events, And Founder Pages

**Files:**

- Create: `src/app/blog/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`
- Create: `src/app/events/page.tsx`
- Create: `src/app/events/[slug]/page.tsx`
- Create: `src/app/founder/page.tsx`

- [ ] **Step 1: Add blog index**

Create `src/app/blog/page.tsx`:

```tsx
import Link from 'next/link'
import { blogPosts } from '@/data/content'

export default function BlogPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Блог</span>
        <h1 className="display">Journal</h1>
      </section>
      <section className="contentList section">
        {blogPosts.map((post) => (
          <Link className="contentCard" href={`/blog/${post.slug}`} key={post.slug}>
            <span className="eyebrow">{post.category} / {post.date}</span>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Add article page**

Create `src/app/blog/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/ProductCard'
import { blogPosts, events } from '@/data/content'
import { getPublishedProducts } from '@/data/products'

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = blogPosts.find((item) => item.slug === slug)
  const product = getPublishedProducts()[0]
  const event = events[0]

  if (!post) notFound()

  return (
    <article className="page article">
      <span className="eyebrow">{post.category} / {post.date}</span>
      <h1 className="display">{post.title}</h1>
      <p>{post.excerpt}</p>
      <div className="articleBody">
        <p>
          Это прототип rich article: в рабочей админке редактор сможет вставлять текст,
          изображения, карточки товаров и карточки ивентов.
        </p>
        {product ? <ProductCard product={product} /> : null}
        {event ? (
          <div className="contentCard">
            <span className="eyebrow">Ивент</span>
            <h2>{event.title}</h2>
            <p>{event.description}</p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
```

- [ ] **Step 3: Add events pages**

Create `src/app/events/page.tsx`:

```tsx
import Link from 'next/link'
import { events } from '@/data/content'

export default function EventsPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Ивенты</span>
        <h1 className="display">Events</h1>
        <p>Пока только анонсы. Запись и билеты появятся позже.</p>
      </section>
      <section className="contentList section">
        {events.map((event) => (
          <Link className="contentCard" href={`/events/${event.slug}`} key={event.slug}>
            <span className="eyebrow">{event.date} / {event.location}</span>
            <h2>{event.title}</h2>
            <p>{event.description}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
```

Create `src/app/events/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { events } from '@/data/content'

export function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }))
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const event = events.find((item) => item.slug === slug)

  if (!event) notFound()

  return (
    <article className="page article">
      <span className="eyebrow">{event.date} / {event.location}</span>
      <h1 className="display">{event.title}</h1>
      <p>{event.description}</p>
    </article>
  )
}
```

- [ ] **Step 4: Add founder page**

Create `src/app/founder/page.tsx`:

```tsx
import { founder } from '@/data/content'

export default function FounderPage() {
  return (
    <div className="page">
      <section className="founderHero">
        <div>
          <span className="eyebrow">Founder</span>
          <h1 className="display">{founder.title}</h1>
        </div>
        <div className="founderText">
          <p>{founder.text}</p>
          <div className="socialLinks">
            {founder.socialLinks.map((link) => (
              <a className="button buttonSecondary" href={link.href} key={link.label}>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
```

Append content styles to `src/app/globals.css`:

```css
.contentList {
  display: grid;
  gap: 14px;
}

.contentCard {
  display: grid;
  gap: 12px;
  border: 1px solid var(--line);
  background: var(--panel);
  padding: 18px;
}

.contentCard h2,
.contentCard p,
.article p {
  margin: 0;
}

.contentCard p,
.article p,
.founderText {
  color: var(--muted);
}

.article {
  display: grid;
  gap: 28px;
  max-width: 980px;
}

.articleBody {
  display: grid;
  gap: 18px;
}

.founderHero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.6fr);
  gap: 32px;
  min-height: 620px;
  align-items: end;
}

.founderText {
  display: grid;
  gap: 18px;
  font-size: 18px;
}

.socialLinks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 900px) {
  .founderHero {
    grid-template-columns: 1fr;
    min-height: auto;
  }
}
```

- [ ] **Step 5: Verify content pages**

Run:

```bash
/usr/local/bin/npm run typecheck
/usr/local/bin/npm test
```

Expected: both pass.

- [ ] **Step 6: Commit content pages**

Run:

```bash
/usr/bin/git add src/app/blog src/app/events src/app/founder src/app/globals.css
/usr/bin/git commit -m "feat: add content prototype pages"
```

Expected: commit succeeds.

## Task 7: Add Payload And Local Infrastructure Foundation

**Files:**

- Create: `docker-compose.yml`
- Create: `payload.config.ts`
- Create: `src/payload/access.ts`
- Create: `src/payload/collections/Users.ts`
- Create: `src/payload/collections/Media.ts`
- Create: `src/payload/collections/Products.ts`
- Create: `src/payload/collections/Orders.ts`
- Create: `src/payload/collections/BlogPosts.ts`
- Create: `src/payload/collections/Events.ts`
- Create: `src/payload/globals/SiteSettings.ts`
- Create: `src/app/(payload)/admin/[[...segments]]/page.tsx`
- Create: `src/app/(payload)/admin/[[...segments]]/not-found.tsx`
- Create: `src/app/(payload)/api/[...slug]/route.ts`
- Create: `src/app/(payload)/api/graphql/route.ts`
- Create: `src/app/(payload)/api/graphql-playground/route.ts`

- [ ] **Step 1: Add local Postgres**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: bigstep-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: bigstep
      POSTGRES_USER: bigstep
      POSTGRES_PASSWORD: bigstep
    ports:
      - "5432:5432"
    volumes:
      - bigstep-postgres-data:/var/lib/postgresql/data

volumes:
  bigstep-postgres-data:
```

- [ ] **Step 2: Add Payload access helpers**

Create `src/payload/access.ts`:

```ts
import type { Access } from 'payload'

type UserWithRole = {
  role?: 'admin' | 'editor'
}

function getRole(user: unknown): UserWithRole['role'] {
  return (user as UserWithRole | null)?.role
}

export const anyone: Access = () => true

export const admins: Access = ({ req }) => getRole(req.user) === 'admin'

export const adminsAndEditors: Access = ({ req }) => {
  const role = getRole(req.user)
  return role === 'admin' || role === 'editor'
}
```

- [ ] **Step 3: Add Users collection**

Create `src/payload/collections/Users.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { admins } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email'
  },
  access: {
    create: admins,
    read: admins,
    update: admins,
    delete: admins
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' }
      ]
    }
  ]
}
```

- [ ] **Step 4: Add core collections**

Create `src/payload/collections/Media.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { adminsAndEditors, anyone } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: true,
  access: {
    create: adminsAndEditors,
    read: anyone,
    update: adminsAndEditors,
    delete: adminsAndEditors
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true
    }
  ]
}
```

Create `src/payload/collections/Products.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { admins, anyone } from '../access'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title'
  },
  access: {
    create: admins,
    read: anyone,
    update: admins,
    delete: admins
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'category', type: 'text', required: true },
    { name: 'price', type: 'number', required: true, min: 0 },
    { name: 'salePrice', type: 'number', min: 0 },
    {
      name: 'productType',
      type: 'select',
      required: true,
      defaultValue: 'sized',
      options: [
        { label: 'Sized', value: 'sized' },
        { label: 'One size', value: 'one_size' }
      ]
    },
    {
      name: 'sizes',
      type: 'array',
      admin: {
        condition: (_, siblingData) => siblingData.productType === 'sized'
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'stock', type: 'number', required: true, min: 0 }
      ]
    },
    {
      name: 'stock',
      type: 'number',
      min: 0,
      admin: {
        condition: (_, siblingData) => siblingData.productType === 'one_size'
      }
    },
    {
      name: 'saleStatus',
      type: 'select',
      required: true,
      defaultValue: 'in_stock',
      options: [
        { label: 'In stock', value: 'in_stock' },
        { label: 'Preorder', value: 'preorder' },
        { label: 'Sold out', value: 'sold_out' },
        { label: 'Hidden', value: 'hidden' }
      ]
    },
    { name: 'preorderNote', type: 'text' },
    { name: 'shortDescription', type: 'textarea', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'published', type: 'checkbox', defaultValue: false }
  ]
}
```

Create `src/payload/collections/Orders.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { admins } from '../access'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber'
  },
  access: {
    create: admins,
    read: admins,
    update: admins,
    delete: admins
  },
  fields: [
    { name: 'orderNumber', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending_payment',
      options: [
        'draft',
        'pending_payment',
        'paid',
        'payment_failed',
        'processing',
        'ready_for_cdek',
        'shipped',
        'completed',
        'cancelled',
        'refunded'
      ]
    },
    { name: 'customerName', type: 'text', required: true },
    { name: 'customerPhone', type: 'text', required: true },
    { name: 'customerEmail', type: 'email', required: true },
    { name: 'cdekPickupCode', type: 'text' },
    { name: 'cdekPickupAddress', type: 'text' },
    { name: 'paymentId', type: 'text' },
    { name: 'trackingNumber', type: 'text' },
    { name: 'adminNotes', type: 'textarea' }
  ]
}
```

- [ ] **Step 5: Add content collections**

Create `src/payload/collections/BlogPosts.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { adminsAndEditors, anyone } from '../access'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: {
    useAsTitle: 'title'
  },
  access: {
    create: adminsAndEditors,
    read: anyone,
    update: adminsAndEditors,
    delete: adminsAndEditors
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'excerpt', type: 'textarea', required: true },
    { name: 'category', type: 'text' },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor({})
    },
    { name: 'published', type: 'checkbox', defaultValue: false }
  ]
}
```

Create `src/payload/collections/Events.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { adminsAndEditors, anyone } from '../access'

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title'
  },
  access: {
    create: adminsAndEditors,
    read: anyone,
    update: adminsAndEditors,
    delete: adminsAndEditors
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'dateLabel', type: 'text', required: true },
    { name: 'location', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'socialLink', type: 'text' },
    { name: 'published', type: 'checkbox', defaultValue: false }
  ]
}
```

Create `src/payload/globals/SiteSettings.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { admins, anyone } from '../access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: anyone,
    update: admins
  },
  fields: [
    { name: 'siteName', type: 'text', required: true, defaultValue: 'BIGSTEP.RU' },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true }
      ]
    }
  ]
}
```

- [ ] **Step 6: Add Payload config**

Create `payload.config.ts`:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { BlogPosts } from './src/payload/collections/BlogPosts'
import { Events } from './src/payload/collections/Events'
import { Media } from './src/payload/collections/Media'
import { Orders } from './src/payload/collections/Orders'
import { Products } from './src/payload/collections/Products'
import { Users } from './src/payload/collections/Users'
import { SiteSettings } from './src/payload/globals/SiteSettings'

export default buildConfig({
  admin: {
    user: Users.slug
  },
  collections: [Users, Media, Products, Orders, BlogPosts, Events],
  globals: [SiteSettings],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET ?? 'local-dev-secret-change-me',
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI ?? 'postgres://bigstep:bigstep@localhost:5432/bigstep'
    }
  }),
  sharp
})
```

- [ ] **Step 7: Add Payload route handlers**

Create `src/app/(payload)/admin/[[...segments]]/page.tsx`:

```tsx
import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = ({ params, searchParams }: Args) =>
  generatePageMetadata({ config, params, searchParams })

export default RootPage
```

Create `src/app/(payload)/admin/[[...segments]]/not-found.tsx`:

```tsx
import config from '@payload-config'
import { NotFoundPage } from '@payloadcms/next/views'

export default NotFoundPage({ config })
```

Create `src/app/(payload)/api/[...slug]/route.ts`:

```ts
import config from '@payload-config'
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
```

Create `src/app/(payload)/api/graphql/route.ts`:

```ts
import config from '@payload-config'
import { GRAPHQL_POST, REST_OPTIONS } from '@payloadcms/next/routes'

export const POST = GRAPHQL_POST(config)
export const OPTIONS = REST_OPTIONS(config)
```

Create `src/app/(payload)/api/graphql-playground/route.ts`:

```ts
import config from '@payload-config'
import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes'

export const GET = GRAPHQL_PLAYGROUND_GET(config)
```

- [ ] **Step 8: Add Payload alias**

Modify `tsconfig.json` paths:

```json
"paths": {
  "@/*": ["./src/*"],
  "@payload-config": ["./payload.config.ts"]
}
```

- [ ] **Step 9: Verify Payload types compile**

Run:

```bash
/usr/local/bin/npm run typecheck
```

Expected: PASS. If Payload package signatures differ from the installed latest version, adjust only the route-handler imports according to the installed package's documented exports, then rerun typecheck.

- [ ] **Step 10: Commit Payload foundation**

Run:

```bash
/usr/bin/git add docker-compose.yml payload.config.ts src/payload 'src/app/(payload)' tsconfig.json
/usr/bin/git commit -m "feat: add Payload admin foundation"
```

Expected: commit succeeds.

## Task 8: README, Browser Verification, And Final Commit

**Files:**

- Create: `README.md`

- [ ] **Step 1: Add README**

Create `README.md`:

```md
# BIGSTEP.RU

First working prototype for BIGSTEP.RU: a Russian, light-only, mobile-first fashion shop with product browsing, cart, checkout shell, blog, event announcements, founder page, and Payload CMS foundation.

## Requirements

- Node.js 20.9+
- npm
- Docker Desktop for local PostgreSQL when working with Payload

In this Codex desktop environment npm is available at:

```bash
/usr/local/bin/npm
```

## Local Development

Install dependencies:

```bash
/usr/local/bin/npm install
```

Copy env file:

```bash
cp .env.example .env
```

Start PostgreSQL for Payload:

```bash
docker compose up -d postgres
```

Run the app:

```bash
/usr/local/bin/npm run dev
```

Open:

- Public site: http://localhost:3000
- Shop: http://localhost:3000/shop
- Cart: http://localhost:3000/cart
- Checkout: http://localhost:3000/checkout
- Payload admin: http://localhost:3000/admin

## Verification

```bash
/usr/local/bin/npm run typecheck
/usr/local/bin/npm test
/usr/local/bin/npm run build
```

## Prototype Limits

- Product, blog, event, and founder pages currently use local fixtures.
- YooKassa is represented by checkout copy only; no live payment request is made.
- CDEK is represented by a test pickup point; no live widget/API call is made.
- Payload collection configs exist, but public pages are not yet reading from Payload.
```

- [ ] **Step 2: Run verification**

Run:

```bash
/usr/local/bin/npm run typecheck
/usr/local/bin/npm test
/usr/local/bin/npm run build
```

Expected: all pass.

- [ ] **Step 3: Start local dev server**

Run:

```bash
/usr/local/bin/npm run dev
```

Expected: Next.js starts and prints a local URL, normally `http://localhost:3000`.

- [ ] **Step 4: Browser smoke test**

Open the local URL and manually check:

- Home page renders in light minimalist fashion direction.
- `/shop` shows products.
- Product detail can add sized and one-size items to cart.
- `/cart` shows persisted cart items.
- `/checkout` validates missing fields.
- Selecting prototype CDEK pickup and filling fields shows YooKassa placeholder.
- `/blog`, `/events`, `/founder` render.
- Mobile viewport does not have obvious layout overlap.

- [ ] **Step 5: Commit README and final fixes**

Run:

```bash
/usr/bin/git add README.md .
/usr/bin/git commit -m "docs: add prototype runbook"
```

Expected: commit succeeds if README or verification fixes changed files. If there are no changes, skip the commit.

## Plan Self-Review

Spec coverage:

- Commerce-first public site: Tasks 3-5.
- Sized and one-size products: Task 2 fixtures and domain types, Task 4 product UI.
- In-stock and preorder mixed cart: Task 2 tests/domain, Task 5 cart/checkout warning.
- Guest cart via local storage: Task 4 add-to-cart and Task 5 cart.
- Checkout form with customer data and CDEK pickup shell: Task 5.
- YooKassa as payment provider boundary: Task 5 placeholder and Task 7 order/payment fields.
- Public blog, events, founder: Task 6.
- Admin roles and CMS foundation: Task 7.
- Local laptop MVP infrastructure: Task 7 Docker Compose and Task 8 README.
- Light-only, Russian, mobile-first direction: Tasks 3-6.

Known prototype gaps are explicit and intentional: live YooKassa, live CDEK, and public reads from Payload are next implementation plans after this working prototype.
