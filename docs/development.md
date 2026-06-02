# Разработка

## Требования

- Node.js **20.9+**
- npm (`npm install --legacy-peer-deps` — peer-deps Payload/Next)
- Docker — только для локального PostgreSQL

## Первый запуск

```bash
cp .env.example .env
npm install --legacy-peer-deps
npm run dev
```

Локально без `DATABASE_URI` Payload использует SQLite-файл из `SQLITE_DATABASE_URL`.

### PostgreSQL (опционально)

```bash
docker compose up -d postgres
```

В `.env`:

```env
DATABASE_URI=postgres://bigstep:bigstep@localhost:5432/bigstep
POSTGRES_PASSWORD=bigstep
```

## Команды

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Dev-сервер (Turbopack) |
| `npm run build` / `start` | Продакшен-сборка и запуск |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Vitest, все `tests/**/*.test.ts` |
| `npm run test:watch` | Vitest watch |
| `npm run lint` | ESLint flat config |
| `npm run admin:seed` | Сид админа и товаров в Payload (см. ниже) |

В Codex Desktop npm часто по пути `/usr/local/bin/npm` (см. корневой README).

## Переменные окружения

Копия ключей — в `.env.example`.

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical, sitemap, Open Graph, JSON-LD |
| `PAYLOAD_SECRET` | Обязателен в production (≥16 символов) |
| `PAYLOAD_BOOTSTRAP_TOKEN` | Токен для `/bootstrap-admin` в production |
| `PAYLOAD_SEED_ADMIN_*` | Логин/пароль для `npm run admin:seed` |
| `DATABASE_URI` / `SQLITE_DATABASE_URL` | Выбор БД |
| `YOOKASSA_*`, `CDEK_*` | Заглушки под будущие интеграции |

## Сид админки и товаров

```bash
# В .env задать:
# PAYLOAD_SEED_ADMIN_USERNAME=...
# PAYLOAD_SEED_ADMIN_PASSWORD=...
# PAYLOAD_SEED_ADMIN_EMAIL=...   # опционально

npm run admin:seed
```

Скрипт `scripts/seed-admin.ts`:

- создаёт/обновляет пользователя с ролью `admin` (логин по **username**, см. коллекцию Users);
- upsert всех товаров из `src/data/products.ts` в коллекцию `products`;
- снимает с публикации legacy-плейсхолдеры в CMS;
- для старых SQLite-файлов может добавить недостающие колонки (`username`, `drop_name`, `image_url`, …).

После сида витрина `/shop` должна читать товары из Payload (если маппинг прошёл успешно).

## Локальные URL

- Витрина: http://localhost:3000
- Магазин: http://localhost:3000/shop
- Админка: http://localhost:3000/admin
- Bootstrap: http://localhost:3000/bootstrap-admin

Через localtunnel те же пути на домене туннеля; на странице туннеля нужно подтвердить IP.

## CI

`.github/workflows/ci.yml` на push/PR в `main`:

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`

В CI заданы `PAYLOAD_SECRET` (заглушка) и `SQLITE_DATABASE_URL=file:payload-ci.db`.

## Конвенции кода

- **UI и Payload-лейблы — по-русски.**
- **Коммиты — по-русски**, префиксы: `feat:`, `fix:`, `улучшение:`, `дизайн:`, `контент:`, `безопасность:`, `сборка:`, `доки:` — смотреть `git log`.
- **Деньги и остатки — целые рубли/штуки**, лимиты в хуках Products/Orders (`MAX_RUB_AMOUNT`, `MAX_STOCK`, `MAX_QUANTITY`).
- **Комментарии** — только неочевидный «почему».
- **Не коммитить:** `.next/`, `payload-types.ts`, `*.db`, `*.sqlite`.

## Куда класть изменения

| Задача | Куда |
|--------|------|
| Формула корзины, скидка, сортировка каталога | `src/domain/` + `tests/domain/` |
| Новое поле товара на витрине | `domain/products.ts` → `data/products.ts` → `payload/collections/Products.ts` → `lib/catalog.ts` (маппер) |
| Фильтры магазина (UI) | `components/ProductCatalog.tsx` + `domain/catalog.ts` |
| Тексты блога/ивентов | `src/data/content.ts` |
| Права в CMS | `src/payload/access.ts` |
| Заголовки безопасности | `next.config.ts` |
| Gate create-first-user | `src/proxy.ts`, `api/admin-bootstrap/route.ts` |

## Тестирование

- Доменная логика — обязательно тесты в `tests/domain/`.
- Утилиты `siteUrl`, `requestOrigin` — `tests/app/`.
- Payload/bootstrap/seed — `tests/payload/`.
- React-компоненты **не** покрыты; для UI-тестов сначала настроить окружение (jsdom/RTL), не шимить в существующих тестах.

## Сгенерированные файлы

После изменений схемы Payload может понадобиться перегенерация типов (если включено в workflow проекта). `payload-types.ts` в gitignore — не редактировать вручную.

Admin `importMap` — `src/app/(payload)/admin/importMap.ts` (и сгенерированный `.js` при сборке админки).
