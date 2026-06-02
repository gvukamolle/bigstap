# Архитектура

BIGSTEP.RU — русскоязычный прототип магазина одежды (mobile-first, светлая тема). Стек: **Next.js 16** (App Router, Turbopack) + **React 19** + **Payload CMS 3.84** + **TypeScript 6** (strict, ESM).

## Слои (не смешивать)

```
┌─────────────────────────────────────────────────────────────┐
│  src/app/(site)          Публичная витрина (RSC + клиент)   │
│  src/components/         UI (корзина, каталог, checkout)    │
├─────────────────────────────────────────────────────────────┤
│  src/lib/                Серверные/браузерные адаптеры       │
│    catalog.ts            Payload → Product + fallback       │
│    cartStorage.ts        localStorage + события             │
│    siteUrl.ts, requestOrigin.ts                           │
├─────────────────────────────────────────────────────────────┤
│  src/domain/             Чистый TS, без React/Payload       │
│    products, cart, checkout, catalog, formatting            │
├─────────────────────────────────────────────────────────────┤
│  src/data/               Типизированные фикстуры            │
│    products.ts, content.ts, retail.ts                     │
├─────────────────────────────────────────────────────────────┤
│  src/payload/            Схема CMS, access, хуки            │
│  payload.config.ts       Адаптер БД, коллекции, RU i18n     │
├─────────────────────────────────────────────────────────────┤
│  src/app/(payload)/      Админка + REST/GraphQL Payload     │
│  src/proxy.ts            Сетевой gate (Next.js 16 proxy)    │
└─────────────────────────────────────────────────────────────┘
```

**Правило:** бизнес-инварианты (деньги, остатки, валидация корзины/заказа) — в `domain/` и в `beforeValidate` коллекций Payload. UI только оркестрирует.

## Маршруты

### Публичные `(site)`

| Путь | Источник данных |
|------|-----------------|
| `/`, `/shop`, `/shop/[slug]` | `getCatalogProducts()` — CMS с fallback на фикстуры |
| `/cart`, `/checkout` | Каталог с сервера + корзина в `localStorage` |
| `/blog`, `/blog/[slug]` | `src/data/content.ts` |
| `/events`, `/events/[slug]` | `src/data/content.ts` |
| `/founder` | `src/data/content.ts` |
| `/bootstrap-admin` | Форма POST → `/api/admin-bootstrap` |

Страницы магазина помечены `dynamic = 'force-dynamic'`, чтобы видеть свежие товары из Payload без кэша сборки.

### Payload `(payload)`

- `/admin` — админка (кастомный брендинг в `src/payload/admin/*`)
- `/api/*` — REST Payload
- `/api/graphql`, playground — GraphQL

### API приложения

- `POST /api/admin-bootstrap` — выдача cookie `payload-bootstrap` (см. [security-bootstrap.md](./security-bootstrap.md))

## Каталог (кратко)

Подробно: [catalog-and-cms.md](./catalog-and-cms.md).

1. `getCatalogProducts()` читает опубликованные товары из коллекции `products`.
2. Документ маппится в `domain/products.Product`; при неполных полях подмешивается фикстура с тем же `slug`.
3. Если в CMS нет ни одного валидного товара — возвращаются `getPublishedProducts()` из фикстур.
4. Фильтрация/сортировка на витрине — `domain/catalog.ts` + клиент `ProductCatalog`.

## Корзина и оформление

- **Хранение:** `lib/cartStorage.ts` (версионированный JSON, событие `bigstep-cart-updated`).
- **Логика:** `domain/cart.ts` — всегда прогонять через `sanitizeCart` по актуальному списку товаров.
- **Checkout:** `domain/checkout.ts#validateCheckoutDraft`; ЮKassa и СДЭК — заглушки, реальный заказ в Payload не создаётся.

## База данных Payload

`payload.config.ts`:

- Если задан `DATABASE_URI` → PostgreSQL (`docker compose up -d postgres`).
- Иначе → SQLite (`SQLITE_DATABASE_URL`, по умолчанию `file:payload-local.db`).
- `push: true` только вне production runtime; в проде схему менять миграциями.

## SEO

- `src/app/robots.ts`, `sitemap.ts` — `NEXT_PUBLIC_SITE_URL` / fallback `bigstep.ru` / localhost.
- Карточки товаров — JSON-LD `Product`, валюта RUB.
- `/cart`, `/checkout` — `robots: { index: false }`.

## Алиасы TypeScript

- `@/*` → `src/*`
- `@payload-config` → `payload.config.ts`

## Что остаётся прототипом

- Блог, ивенты, основатель — только фикстуры.
- Оплата и СДЭК — UI-заглушки.
- Создание заказа в CMS при checkout — не подключено.

При задаче на «боевую» интеграцию — уточнить scope до правок.
