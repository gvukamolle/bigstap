# AGENTS.md — BIGSTEP.RU

Краткая инструкция для AI-ассистентов. Подробности — в [docs/README.md](./docs/README.md) и [CLAUDE.md](./CLAUDE.md).

## Проект

Русскоязычный магазин-прототип (одежда/аксессуары). Next.js 16 + Payload 3 + TypeScript strict. Публичный UI на русском.

## Перед правками

1. Прочитать [docs/architecture.md](./docs/architecture.md) — слои `domain` / `data` / `lib` / `payload`.
2. Каталог: [docs/catalog-and-cms.md](./docs/catalog-and-cms.md) — CMS с fallback на фикстуры.
3. Админка prod: [docs/security-bootstrap.md](./docs/security-bootstrap.md).
4. Команды и сиды: [docs/development.md](./docs/development.md).

## Жёсткие правила

- Не смешивать React/Payload в `src/domain/`.
- Корзину всегда санитизировать через `domain/cart.ts`.
- Деньги и остатки — только safe integers; те же лимиты в Payload hooks.
- UI-тексты и лейблы CMS — на русском.
- Коммиты только по запросу пользователя; сообщения коммитов — по-русски (`feat:`, `fix:`, …).
- Не коммитить секреты, `.env`, `*.db`.

## Ключевые файлы

| Область | Файлы |
|---------|--------|
| Каталог | `src/lib/catalog.ts`, `src/domain/catalog.ts`, `ProductCatalog.tsx` |
| Корзина | `CartClient.tsx`, `lib/cartStorage.ts`, `domain/cart.ts` |
| Checkout | `CheckoutClient.tsx`, `domain/checkout.ts` |
| CMS схема | `payload.config.ts`, `src/payload/collections/*` |
| Сетевой gate | `src/proxy.ts` (Next 16, не `middleware.ts`) |
| SEO | `lib/siteUrl.ts`, `app/robots.ts`, `app/sitemap.ts` |

## Проверка

```bash
npm run typecheck && npm test && npm run lint
```

## Прототип (не додумывать «уже работает»)

- Блог/ивенты/основатель — фикстуры `data/content.ts`.
- ЮKassa, СДЭК, создание заказа в Payload при checkout — заглушки.

## Тесты

Добавлять в `tests/domain/` при изменении cart/checkout/catalog; в `tests/payload/` и `tests/app/` — по смыслу. React-тестов нет.
