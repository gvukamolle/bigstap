# BIGSTEP.RU

Первый рабочий прототип BIGSTEP.RU: русскоязычный, светлый магазин одежды и аксессуаров с приоритетом мобильной версии, каталогом, карточками товаров, сохраненной корзиной, заглушкой оформления заказа, блогом, анонсами ивентов, страницей основателя и основой для Payload CMS + PostgreSQL.

Публичные страницы пока работают на TypeScript-фикстурах, чтобы магазин можно было открыть и пройти пользовательский сценарий сразу. Payload подключен как основа будущей админки и серверного слоя.

## Требования

- Node.js 20.9+
- npm
- Docker Desktop нужен только если локально проверяем PostgreSQL-режим. По умолчанию админка работает на SQLite без Docker.

В окружении Codex Desktop npm доступен здесь:

```bash
/usr/local/bin/npm
```

## Локальный Запуск

Установить зависимости:

```bash
/usr/local/bin/npm install --legacy-peer-deps
```

Если зависимости уже установлены, этот шаг можно пропустить.

Скопировать пример переменных окружения:

```bash
cp .env.example .env
```

Для локальной разработки и MVP-запуска с ноутбука Payload использует SQLite-файл, если
`DATABASE_URI` не задан:

```bash
SQLITE_DATABASE_URL=file:payload-local.db
```

PostgreSQL можно поднять отдельно, если нужно проверить production-like режим:

```bash
docker compose up -d postgres
```

Для PostgreSQL-режима нужно дополнительно задать:

```bash
DATABASE_URI=postgres://bigstep:bigstep@localhost:5432/bigstep
POSTGRES_PASSWORD=bigstep
```

Запустить приложение:

```bash
/usr/local/bin/npm run dev
```

## Локальные URL

- Главная: http://localhost:3000
- Магазин: http://localhost:3000/shop
- Корзина: http://localhost:3000/cart
- Оформление заказа: http://localhost:3000/checkout
- Блог: http://localhost:3000/blog
- Ивенты: http://localhost:3000/events
- Основатель: http://localhost:3000/founder
- Payload-админка: http://localhost:3000/admin
- Первичная настройка админки: http://localhost:3000/bootstrap-admin

Если сайт открыт через localtunnel, путь сохраняется таким же:

- Главная: `https://<адрес-туннеля>.loca.lt/`
- Админка: `https://<адрес-туннеля>.loca.lt/admin`
- Первичная настройка: `https://<адрес-туннеля>.loca.lt/bootstrap-admin`

На предупреждающей странице localtunnel нужно ввести IP, который показан на этой же странице. После этого можно открыть `/admin`. На публичном сайте ссылка "Админка" также есть в футере.

## Проверка

В Codex-окружении используй явный путь к npm:

```bash
/usr/local/bin/npm run typecheck
/usr/local/bin/npm test
/usr/local/bin/npm run lint
/usr/local/bin/npm run build
/usr/local/bin/npm audit --omit=dev
```

## Документация для разработки

- [docs/README.md](./docs/README.md) — оглавление
- [AGENTS.md](./AGENTS.md) — кратко для AI-ассистентов

## Ограничения Прототипа

- Каталог (`/shop` и связанные страницы) читает товары из Payload; при пустой CMS или ошибке — fallback на фикстуры в `src/data/products.ts`.
- Блог, ивенты и страница основателя пока только на фикстурах (`src/data/content.ts`).
- ЮKassa представлена заглушкой в checkout; реальный платеж не создается.
- СДЭК представлен тестовым пунктом выдачи; реальный виджет/API пока не подключен.
- Оформление заказа проверяет пользовательский сценарий, но не создает реальный заказ.

## Продакшен-Заметки

Для постоянного продакшен-хостинга обязательно задать:

- `PAYLOAD_SECRET`
- `DATABASE_URI`
- `PAYLOAD_BOOTSTRAP_TOKEN` для защищенного создания первого пользователя Payload

В продакшене маршрут создания первого пользователя Payload защищен сценарием bootstrap-токена. Для первичной настройки открой `/bootstrap-admin` и введи токен через форму; токен не передается в URL. Не публикуй `PAYLOAD_BOOTSTRAP_TOKEN`; после первичной настройки его нужно удалить или ротировать по продакшен-runbook.
