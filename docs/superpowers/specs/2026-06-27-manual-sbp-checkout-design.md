# Ручное оформление заказа: СБП + PDF-чек + Telegram

**Дата:** 2026-06-27
**Статус:** дизайн согласован, ожидает ревью спецификации
**Ветка:** main

## Контекст и цель

Текущий чекаут BIGSTEP уже собирает контакты + пункт СДЭК + согласия, создаёт полноценный
`Order` в Payload и имеет рабочую интеграцию ЮKassa (redirect + webhook). Подключить ЮKassa
самозанятому так и не вышло, поэтому переходим на **ручной приём оплаты по СБП**:

1. Покупатель выбирает товар/размер → корзина.
2. Заполняет: ФИО, телефон, Telegram (для связи), пункт СДЭК.
3. Выбирает доставку: Москва (400 ₽) или Россия (600 ₽). Показывается ИТОГО (товары + доставка).
4. Открывается окно оплаты: QR СБП, инструкция «введите сумму вручную — ровно ИТОГО ₽»,
   поле для прикрепления PDF-чека.
5. Жмёт «Завершить».
6. Все данные + PDF уходят одним запросом в **Make** (webhook); собранный там сценарий («пайп»)
   пересылает их владельцу в Telegram.

## Зафиксированные решения

| Развилка | Решение |
|---|---|
| ЮKassa | **Удалить полностью** (redirect, webhook, lib, ключи в админке) |
| Источник правды о заказе | **Payload Order** (база — правда); уведомление наружу — через Make |
| Канал уведомления | **Make.com webhook** → сценарий Make пересылает в Telegram (бот/чат настроены в Make) |
| Email на чекауте | **Убрать** (контакт через Telegram) |
| Доставка | **Регион-тариф** (Москва 400 / Россия 600) + **текстовое поле ПВЗ** |
| PDF-чек на бэкенде | **Relay в Make → Telegram, не хранить** (буфер в памяти → отправка → отбросить) |
| Авто-проверка чека | **L1**: парсинг текстового слоя (без OCR), мягкие флаги, заказ не блокируется |

## Архитектура (подход A — один multipart-запрос)

На «Завершить» весь чекаут (поля + PDF) уходит одним `POST /api/checkout` (multipart/form-data).
Сервер:

1. Разбирает `formData` (поля + файл).
2. Валидирует поля (домен) и PDF (mime по сигнатуре `%PDF-`, размер ≤ 10 МБ).
3. **Пересчитывает сумму сам**: товары (sanitize по каталогу) + доставка по региону
   (константы домена) = `amount`. Клиентской сумме не доверяем.
4. Парсит текстовый слой PDF (L1) → сверка суммы/даты/получателя/ID → результат-флаги.
5. Создаёт `Order` (overrideAccess) со статусом `payment_review`, кладёт в него итог авто-проверки.
6. Отправляет данные заказа (структурой) + PDF в **Make** одним POST на webhook-URL.
   Make-сценарий формирует сообщение и шлёт его + PDF в Telegram (бот и чат настроены в Make,
   не в нашем коде).
7. Make — **best-effort**: успех → `order.notificationSent = true`; сбой → лог +
   `notificationSent = false`, но ответ покупателю всё равно `ok` (заказ сохранён в базе).
8. Ответ: `{ ok: true, orderNumber }`. Витрина показывает экран «Заказ принят», чистит корзину.

Принцип слоёв (соблюдаем существующий):
- `domain/` — чистые функции: расчёт доставки/итога, валидация чекаута, **парсер и проверка чека**.
- `lib/` — IO-границы: извлечение текста из PDF (`unpdf`), отправка в Make (webhook).
- `payload/` — схема `Orders`, глобал настроек, инварианты в хуках.

## UX витрины

### Форма чекаута
- **Шаг 1 «Контакты»**: ФИО (required), телефон (required), **Telegram** (required, `@username`).
  *(email удалён)*
- **Шаг 2 «Доставка»**: радио **Москва — 400 ₽** / **Россия — 600 ₽** (required);
  поле **«Пункт СДЭК»** (required, текст: адрес или код) со ссылкой-подсказкой на карту cdek.ru.
  Внизу секции: `Товары N ₽ + Доставка M ₽ = ИТОГО K ₽`.
- **Шаг 3 «Согласия»**: оферта + ПДн (как сейчас, на каждый сабмит; в драфте не хранятся).
- Кнопка **«Перейти к оплате»** → открывает модалку (форма предварительно валидируется на клиенте).

### Модалка оплаты
- Заголовок: **«К оплате ровно K ₽»** (крупно).
- **QR СБП** — картинка из настроек (`sbp.qrImage`).
- Подсказка получателя из настроек (`sbp.recipientHint`), напр. «Степан Г., Т‑Банк».
- Инструкция: «Отсканируйте QR в приложении банка. Сумму **введите вручную — ровно K ₽**
  (статический QR сумму не подставляет). После оплаты прикрепите PDF-чек ниже».
- **Поле загрузки PDF**: только `.pdf`, ≤ 10 МБ, показывает имя файла; drag&drop + кнопка выбора.
- Кнопка **«Завершить»** — активна только когда приложен валидный PDF. Спиннер на время отправки.
- Успех → экран «Заказ GS-… принят. Проверю оплату и напишу тебе в Telegram». Корзина очищается.

## Изменения в данных (Payload)

### Orders (`src/payload/collections/Orders.ts`)
Добавить:
- `customerTelegram` (text, required) — `@username` покупателя.
- `deliveryRegion` (select: `moscow` | `russia`, required).
- `cdekPickupRaw` (text, required) — пункт СДЭК как ввёл покупатель.
- `notificationSent` (checkbox, default false) — ушёл ли заказ в Make (→ Telegram).
- Группа `receiptCheck` (результат L1, **без самого файла**):
  - `parsedAmount` (number, nullable)
  - `amountMatches` (checkbox)
  - `parsedDate` (text, nullable) + `dateFresh` (checkbox)
  - `recipientMatches` (select: `yes` | `no` | `unknown`)
  - `operationId` (text, nullable)
  - `rawSummary` (textarea) — человекочитаемый итог проверки (дублирует то, что ушло в Make → Telegram).

Изменить:
- `status`: добавить **`payment_review`** (стартовый для нового флоу: «чек получен, проверяю оплату»).
  Оставить `paid`, `processing`, `ready_for_cdek`, `shipped`, `completed`, `cancelled`, `refunded`.
  Удалить ЮKassa-эховые `pending_payment`, `payment_failed`.
- Удалить `paymentId` (ЮKassa). `npdReceiptStatus` / `npdReceiptUrl` оставить (чек НПД владелец
  формирует в «Мой налог», ссылку кладёт сюда).
- Удалить поля старого пункта СДЭК (`cdekPickupCode/Name/City/Address`) — заменены на `cdekPickupRaw`.
- Удалить `customerEmail`.
- `customerName`, `customerPhone` — оставить. `customerCity` — **удалить**: регион доставки
  и текст ПВЗ заменяют отдельное поле города.

Инварианты в `beforeValidate` обновить: `amount = itemsTotal + deliveryTotal`,
`deliveryTotal ∈ {400, 600}` и соответствует `deliveryRegion`.

### IntegrationSettings (`src/payload/globals/IntegrationSettings.ts`)
- **Удалить** группу `yookassa`.
- **Добавить** группу `make`:
  - `webhookUrl` (text) — URL custom-webhook сценария Make; env-фоллбэк `MAKE_WEBHOOK_URL`.
  - `webhookSecret` (text, опц.) — общий секрет, шлём заголовком; Make-сценарий его проверяет;
    env-фоллбэк `MAKE_WEBHOOK_SECRET`. Бот Telegram и целевой чат настраиваются **внутри Make**,
    нашему коду не нужны.
- **Добавить** группу `sbp`:
  - `qrImage` (upload → media) — статичный QR СБП.
  - `recipientHint` (text) — что показать покупателю в модалке.
  - `expectedRecipientName` (text) — эталон для L1-сверки получателя.
  - `expectedPhoneTail` (text) — последние цифры телефона/счёта для сверки.
- Группу `cdek` **оставить** (договор СДЭК в планах), но живой поиск пунктов в этом флоу не зовём.

Резолвинг кредов (`lib/integrationCredentials.ts`) расширить Make по той же схеме
(CMS-поле приоритетнее env, иначе env, иначе null).

## Бэкенд

### `POST /api/checkout` (переписать на multipart)
- Принять `multipart/form-data`: поля заказа + файл `receipt`.
- Валидация полей — новый домен (`validateCheckoutDraft` без email, с telegram/region/pickup).
- Валидация PDF — `lib/receiptFile.ts`: сигнатура `%PDF-`, размер ≤ 10 МБ, иначе 422.
- Пересчёт суммы — домен.
- Парсинг чека (L1) — `lib/receiptText.ts` (`unpdf` extractText) → `domain/receipt.ts`
  (`parseReceipt`, `checkReceipt`).
- Создать Order → отправить в Make (`lib/make.ts`) → проставить `notificationSent`.
- Ответ `{ ok, orderNumber }` или ошибка `{ ok:false, error, fields? }`.

### Удалить
- `src/lib/yookassa.ts`, `src/app/api/yookassa/route.ts`, `src/app/api/yookassa/webhook/route.ts`.
- Логику ЮKassa в `/api/checkout` и на `checkout/return`.
- ЮKassa-поля из IntegrationSettings и резолвера кредов.

### `lib/make.ts` (новый)
- `sendOrderToMake(config, { data, pdf, filename })`: один `POST multipart/form-data` на
  `config.webhookUrl` — JSON-поля заказа (поле `payload`) + файл `receipt`. Если задан
  `webhookSecret` — шлём его заголовком `X-Bigstep-Secret`. Возвращает `{ ok }`. Прямой `fetch`,
  таймаут + один ретрай. Форматирование текста и доставка в Telegram — **внутри Make-сценария**,
  не в нашем коде.

### Контракт payload для Make (что шлёт наш бэкенд)
`multipart/form-data`:
- `payload` (JSON-строка): `orderNumber`, `amount`, `itemsTotal`, `deliveryRegion`,
  `deliveryTotal`, `items[]` (title, size, qty, unitPrice), `customer` (name, phone, telegram),
  `cdekPickupRaw`, `consent` (privacyAt, offerAt), `receiptCheck` (amountMatches, parsedAmount,
  dateFresh, recipientMatches, operationId), `createdAt`.
- `receipt` (файл): PDF-чек.

Make-сценарий маппит эти поля в текст Telegram и прикладывает PDF. Сам сценарий
(custom webhook → проверка секрета → формат → Telegram) собирает владелец в Make (вне репозитория).

## L1: проверка чека (домен, чисто и тестируемо)

- `lib/receiptText.ts` — IO: PDF buffer → текст (`unpdf`). Если текстового слоя нет
  (пустой/скан) → возвращает пустую строку (флаг «не распознан», заказ не блокируется).
- `domain/receipt.ts` — чистые функции:
  - `parseReceipt(text): { amount: number|null, dateISO: string|null, recipientRaw: string|null, operationId: string|null }`
    — регексы под форматы Сбер/Т‑Банк/Альфа/ВТБ/Озон; нормализация чисел (`1 200,00` → `1200`)
    и дат.
  - `checkReceipt(parsed, { expectedAmount, expectedRecipientName, expectedPhoneTail, now }): ReceiptCheck`
    — `amountMatches`, `dateFresh` (≤ 24 ч от `now`, анти-replay), `recipientMatches`
    (`yes`/`no`/`unknown`), плюс `operationId` для дедупа.
- Дедуп: если `operationId` распознан и уже встречался в другом заказе — пометить ⚠️ «повтор чека».
  (Поиск по `Orders.receiptCheck.operationId`.)
- Результат **не блокирует** создание заказа — только формирует флаги (✅/⚠️) в данных для Make
  (→ Telegram) и в `order.receiptCheck`.

### Граница (важно зафиксировать)
Парсинг проверяет **содержимое**, а не **подлинность** PDF (его можно отредактировать).
Это фильтр от честных ошибок и ленивых обманщиков. Настоящее подтверждение «деньги пришли» —
сверка владельцем по факту поступления (банк/«Мой налог») перед отгрузкой:
`payment_review → paid` вручную. Автосверка с банком — отдельный уровень (вне скоупа).

## Безопасность PDF
- Принимаем только `application/pdf` по магической сигнатуре `%PDF-` (не доверяем заголовку).
- Лимит 10 МБ.
- Не сохраняем на диск/в БД: буфер в памяти → Make → отбросить.
- PDF не рендерим; `unpdf` только извлекает текст (без выполнения JS внутри PDF).
- Базовый rate-limit на эндпоинт (по IP, простое окно) против спама.
- URL вебхука Make — секрет: хранится только на сервере (env/CMS), клиенту не отдаётся; запрос к
  Make подписываем `X-Bigstep-Secret`, чтобы в пайп нельзя было залить левые заказы.

## Легал / операционка (вне кода — флаги владельцу/юристу)
- **Политика ПДн** (`data/legal.ts`): добавить **Make.com и Telegram** как получателей/обработчиков
  ПДн (серверы за рубежом → трансграничная передача данных покупателя); убрать ЮKassa из
  обработчиков, СДЭК оставить.
- **Оферта**: способ оплаты — «перевод по СБП»; порядок подтверждения/возврата.
- **Антифрод**: оплату подтверждаешь вручную до отгрузки — by design.
- **Чек НПД**: формируешь в «Мой налог», ссылку — в `order.npdReceiptUrl`.

## Деплой / миграции
- Схема Postgres меняется (Orders: новые/удалённые колонки, enum статусов; IntegrationSettings:
  удаление yookassa-группы, добавление telegram/sbp). Прогнать через документированный процесс
  миграции схемы на проде (см. память проекта / runbook). На промптах drizzle выбирать
  create/drop, не rename.
- Новые env (фоллбэк): `MAKE_WEBHOOK_URL` (+ опц. `MAKE_WEBHOOK_SECRET`). Либо задать в админке
  («Интеграции»). Загрузить QR СБП и эталон получателя в настройках.
- В Make собрать сценарий: custom webhook → (проверка секрета) → форматирование → Telegram
  (бот + целевой чат). Это делает владелец в Make; наш код шлёт payload по контракту выше.
- Новая зависимость: `unpdf` (чистый JS, без нативных бинарей).

## Тестирование
- `domain/checkout` — расчёт доставки (400/600), пересчёт итога, валидация (telegram/region/pickup,
  без email).
- `domain/receipt` — `parseReceipt`/`checkReceipt` на наборе реальных текстов чеков разных банков
  (сумма, дата, получатель, operationId; несовпадения; пустой текст).
- `app` — `/api/checkout`: успешный заказ, неверный mime/размер PDF, пересчёт суммы при подмене,
  поведение при недоступном Make webhook (заказ сохранён, `notificationSent=false`).
- Существующие тесты ЮKassa/seo — удалить/обновить под новый флоу.

## Вне скоупа (YAGNI / позже)
- Живой поиск ПВЗ СДЭК (после ключей API).
- OCR-фолбэк для чеков-картинок (L2, `tesseract.js`).
- Автосверка поступления через банковский API/выписку (L3).
- Динамический СБП-QR с зашитой суммой (нужен банк-мерчант/ТСП).
- Ответное уведомление покупателю в Telegram.
- Автосписание остатков и автосоздание отправления СДЭК (как сейчас — вручную).

## Затрагиваемые файлы (ориентир для плана)
- Витрина: `components/CheckoutClient.tsx` (+ новая модалка оплаты), `components/CartClient.tsx`
  (кнопка), `app/(site)/checkout/*`.
- Домен: `domain/checkout.ts` (форма, доставка), новый `domain/receipt.ts`.
- Lib: новый `lib/make.ts`, `lib/receiptText.ts`, `lib/receiptFile.ts`;
  правки `lib/integrationCredentials.ts`; удалить `lib/yookassa.ts`.
- API: переписать `app/api/checkout/route.ts`; удалить `app/api/yookassa/*`.
- Payload: `collections/Orders.ts`, `globals/IntegrationSettings.ts`.
- Легал (флаги): `data/legal.ts`.
