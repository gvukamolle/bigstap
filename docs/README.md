# Документация BIGSTEP.RU

Рабочие материалы для разработки и для AI-ассистентов. Пользовательский онбординг — в [README.md](../README.md) в корне репозитория.

## Быстрый старт

| Документ | Когда читать |
|----------|----------------|
| [architecture.md](./architecture.md) | Слои кода, маршруты, границы ответственности |
| [development.md](./development.md) | Команды, env, сиды, CI, типичные задачи |
| [catalog-and-cms.md](./catalog-and-cms.md) | Каталог: Payload ↔ витрина ↔ фикстуры |
| [security-bootstrap.md](./security-bootstrap.md) | Первый пользователь, proxy, bootstrap-токен |

## Для ассистентов

- **[../AGENTS.md](../AGENTS.md)** — краткая точка входа (Cursor / Codex / Claude).
- **[../CLAUDE.md](../CLAUDE.md)** — расширенный справочник на английском (синхронизирован с `docs/`).

## Планирование и исследования (не runbook)

- [superpowers/specs/2026-05-19-bigstep-mvp-shop-design.md](./superpowers/specs/2026-05-19-bigstep-mvp-shop-design.md) — MVP-спека магазина.
- [superpowers/plans/2026-05-19-bigstep-working-prototype.md](./superpowers/plans/2026-05-19-bigstep-working-prototype.md) — план прототипа.
- [research/2026-05-20-retail-best-practices.md](./research/2026-05-20-retail-best-practices.md) — retail-заметки.
- [research/2026-06-02-checkout-cdek-yookassa-make.md](./research/2026-06-02-checkout-cdek-yookassa-make.md) — СДЭК, ЮKassa, заказы, Make/TG.

## Карта тестов

```
tests/domain/     — чистая логика (cart, checkout, catalog)
tests/app/        — siteUrl, requestOrigin, SEO-метаданные
tests/payload/    — bootstrap, seed credentials, admin params, users auth
```

Запуск: `npm test` (Vitest, Node, без jsdom).
