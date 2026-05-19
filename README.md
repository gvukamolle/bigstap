# BIGSTEP.RU

Первый рабочий прототип BIGSTEP.RU: русскоязычный, светлый магазин одежды и аксессуаров с приоритетом мобильной версии, каталогом, карточками товаров, сохраненной корзиной, заглушкой оформления заказа, блогом, анонсами ивентов, страницей основателя и основой для Payload CMS + PostgreSQL.

Публичные страницы пока работают на TypeScript-фикстурах, чтобы магазин можно было открыть и пройти пользовательский сценарий сразу. Payload подключен как основа будущей админки и серверного слоя.

## Требования

- Node.js 20.9+
- npm
- Docker Desktop для локального PostgreSQL и работы с Payload-админкой

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

Проверить, что в `.env` задан `POSTGRES_PASSWORD`. Для локальной разработки подходит значение из примера:

```bash
POSTGRES_PASSWORD=bigstep
```

Запустить PostgreSQL для Payload:

```bash
docker compose up -d postgres
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

## Проверка

В Codex-окружении используй явный путь к npm:

```bash
/usr/local/bin/npm run typecheck
/usr/local/bin/npm test
/usr/local/bin/npm run lint
/usr/local/bin/npm run build
/usr/local/bin/npm audit --omit=dev
```

## Ограничения Прототипа

- Публичные страницы товаров, блога, ивентов и основателя пока используют локальные фикстуры.
- Публичные страницы еще не читают данные из Payload.
- ЮKassa представлена заглушкой в checkout; реальный платеж не создается.
- СДЭК представлен тестовым пунктом выдачи; реальный виджет/API пока не подключен.
- Оформление заказа проверяет пользовательский сценарий, но не создает реальный заказ.

## Продакшен-Заметки

В продакшен-окружении обязательно задать:

- `PAYLOAD_SECRET`
- `DATABASE_URI`
- `PAYLOAD_BOOTSTRAP_TOKEN` для защищенного создания первого пользователя Payload

В продакшене маршрут создания первого пользователя Payload защищен сценарием bootstrap-токена. Для первичной настройки открой `/bootstrap-admin` и введи токен через форму; токен не передается в URL. Не публикуй `PAYLOAD_BOOTSTRAP_TOKEN`; после первичной настройки его нужно удалить или ротировать по продакшен-runbook.
