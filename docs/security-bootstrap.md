# Безопасность: bootstrap админки

Защита маршрутов создания первого пользователя Payload в production.

## Участники

| Файл | Роль |
|------|------|
| `src/app/(site)/bootstrap-admin/page.tsx` | Форма: POST токена на `/api/admin-bootstrap` (токен не в URL) |
| `src/app/api/admin-bootstrap/route.ts` | Проверка токена, rate limit, cookie `payload-bootstrap` |
| `src/proxy.ts` | Next.js 16 **proxy** (бывший middleware): 404 без cookie |

## Production runtime

Условие «боевой рантайм» везде одинаковое:

```ts
NODE_ENV === 'production' && NEXT_PHASE !== 'phase-production-build'
```

Во время `next build` ограничения не ломают сборку.

## Сценарий оператора

1. Задать в env `PAYLOAD_BOOTSTRAP_TOKEN` (длинный секрет).
2. Открыть `/bootstrap-admin`, ввести токен, отправить форму.
3. `POST /api/admin-bootstrap` с полем `token`:
   - сравнение с env — **constant-time** (`timingSafeEqual`);
   - не более **5 попыток / 15 мин / IP** (in-memory `Map`; для нескольких инстансов — Redis);
   - при успехе — redirect 303 на `/admin/create-first-user` + httpOnly cookie (30 мин, `Secure`, `SameSite=strict`).
4. `proxy.ts` пропускает только:
   - `/admin/create-first-user`
   - `/api/users/first-register`
   если cookie совпадает с `PAYLOAD_BOOTSTRAP_TOKEN` (сравнение constant-time без `node:crypto` — совместимость с edge/proxy runtime).

Без `PAYLOAD_BOOTSTRAP_TOKEN` в production эти пути отдают **404**.

## Development

- `proxy` — `NextResponse.next()` (gate выключен).
- `POST /api/admin-bootstrap` без токена редиректит на create-first-user с cookie `local-development`.

## Пользователи CMS

- Вход: **username** (email опционален) — `Users` collection, `loginWithUsername`.
- Первый созданный пользователь через Payload получает роль `admin` (hook `beforeValidate`).
- Альтернатива для локалки: `npm run admin:seed` с `PAYLOAD_SEED_ADMIN_*` (обходит UI bootstrap).

## Заголовки Next

`next.config.ts` отдаёт для всех путей: `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, HSTS. CSP пока нет.

## Публичный origin за прокси

`getPublicRequestOrigin` (`src/lib/requestOrigin.ts`) — для редиректов bootstrap с учётом `x-forwarded-host` / `x-forwarded-proto`. Тесты: `tests/app/request-origin.test.ts`.

## Что не ослаблять

- Не открывать `create-first-user` без cookie в production.
- Не передавать bootstrap-токен в query string.
- После создания админа — ротировать или удалить `PAYLOAD_BOOTSTRAP_TOKEN` по runbook хостинга.
