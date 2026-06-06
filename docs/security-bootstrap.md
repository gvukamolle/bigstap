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
   - при успехе — redirect 303 на `/admin/create-first-user` + httpOnly cookie с **HMAC-тикетом**
     (30 мин, `Secure`, `SameSite=strict`). Сам мастер-токен в cookie НЕ кладётся — только короткоживущий
     тикет, подписанный токеном (`src/lib/bootstrapTicket.ts`), поэтому токен не оседает в логах прокси.
4. `proxy.ts` пропускает только:
   - `/admin/create-first-user`
   - `/api/users/first-register`
   если cookie содержит **валидный HMAC-тикет** (подпись проверяется `PAYLOAD_BOOTSTRAP_TOKEN`, срок не истёк).
   Проверка через Web Crypto — совместима с edge/proxy runtime; сам токен с cookie не сравнивается.

Без `PAYLOAD_BOOTSTRAP_TOKEN` в production эти пути отдают **404**.

## Development

- `proxy` — `NextResponse.next()` (gate выключен).
- `POST /api/admin-bootstrap` без токена редиректит на create-first-user с cookie `local-development`.

## Пользователи CMS

- Вход: **username** (email опционален) — `Users` collection, `loginWithUsername`.
- Первый созданный пользователь через Payload получает роль `admin` (hook `beforeValidate`).
- Альтернатива для локалки: `npm run admin:seed` с `PAYLOAD_SEED_ADMIN_*` (обходит UI bootstrap).

## Заголовки Next

`next.config.ts` отдаёт для всех путей: `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, HSTS. Для `/bootstrap-admin` дополнительно отдаётся CSP (`default-src 'self'`, `form-action 'self'`, `base-uri 'self'`, `frame-ancestors 'self'`, `object-src 'none'`). Строгую CSP для `/admin` (Payload) пока не вводим — требует настройки под inline-стили админки.

`getPublicRequestOrigin` принимает `x-forwarded-host` только если он совпадает с `NEXT_PUBLIC_SITE_URL` (когда задан), иначе берётся настроенный домен — защита от увода редиректа bootstrap подделкой заголовка.

## Публичный origin за прокси

`getPublicRequestOrigin` (`src/lib/requestOrigin.ts`) — для редиректов bootstrap с учётом `x-forwarded-host` / `x-forwarded-proto`. Тесты: `tests/app/request-origin.test.ts`.

## Что не ослаблять

- Не открывать `create-first-user` без валидного тикета в production.
- Не класть сам токен в cookie (только HMAC-тикет) и не передавать его в query string.
- После создания админа — ротировать или удалить `PAYLOAD_BOOTSTRAP_TOKEN` по runbook хостинга.

## Известные ограничения (усилить перед публичным запуском)

- **Единая точка гейта.** В окне «ноль пользователей» защиту даёт только `proxy.ts`. Defense-in-depth:
  добавить серверную проверку bootstrap-тикета в `Users` (запрет создания первого пользователя без
  валидного тикета). Пока не реализовано — срабатывает только в production и не верифицируется локально.
- **Rate-limiter** bootstrap — in-memory и ключуется по `x-forwarded-for` (подделываем при прямом доступе
  к app). Reverse-proxy обязан **переустанавливать** `X-Forwarded-*`, а не проксировать клиентские;
  при масштабировании на несколько инстансов вынести лимит в Redis/Postgres.
- **CSP для `/admin`** не задана (Payload требует inline-стили) — рассмотреть строгую CSP с nonce.
