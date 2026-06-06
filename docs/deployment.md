# Деплой BIGSTEP.RU на VPS (Docker)

Пошаговый runbook: развёртывание прода на одном VPS в РФ. Стек в одном `docker compose`:
**app** (Next.js 16 standalone + Payload CMS) + **postgres:16**. Reverse-proxy с TLS — на хосте.

> Прототипные ограничения: оплата (ЮKassa), СДЭК-виджет и реальное создание заказа на checkout —
> заглушки (`POST /api/checkout` в проде отдаёт 404). Не подключайте платёж/доставку без согласования.

---

## 0. Архитектура деплоя

```
Интернет ──443/TLS──> Caddy/nginx (хост) ──127.0.0.1:3000──> контейнер app ──postgres:5432──> контейнер postgres
                                                                  │
                                                            том bigstep-media (/app/media)
                                                            том bigstep-postgres-data
```

- Контейнеры `app` и `postgres` слушают только `127.0.0.1` — наружу их публикует reverse-proxy.
- Данные переживают пересборку образа: Postgres — в томе `bigstep-postgres-data`, загрузки Payload — в `bigstep-media`.
- Выбор БД в `payload.config.ts`: если задан `DATABASE_URI` — Postgres, иначе SQLite. В проде задаём `DATABASE_URI` → Postgres.

---

## 1. Аренда VPS

Ориентир (152-ФЗ — данные в РФ): **Timeweb Cloud / Beget / Selectel**, локация РФ.

- ОС: **Ubuntu 24.04 LTS**
- **2 vCPU / 4 ГБ RAM / 40–50 ГБ SSD**
- Публичный IPv4
- Доступ по SSH-ключу (пароль для root — отключить)

Домен `.ru` арендуется отдельно; A-запись настроим на шаге 9.

---

## 2. Базовая настройка сервера

```bash
ssh root@SERVER_IP

# Обновления
apt update && apt upgrade -y

# Непривилегированный пользователь с sudo
adduser deploy
usermod -aG sudo deploy

# Скопировать SSH-ключ новому пользователю
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Файрвол: только SSH, HTTP, HTTPS
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Swap: на 4 ГБ RAM сборка (next build) + Postgres могут упереться в OOM-killer.
# Без swap первый `docker compose up --build` часто молча обрывается.
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

> ⚠️ **Docker в обход UFW.** Docker пишет правила прямо в iptables и НЕ подчиняется UFW.
> Здесь это безопасно только потому, что порты опубликованы на `127.0.0.1`. **Никогда не меняйте
> `127.0.0.1:` на `0.0.0.0:` или голый `5432:5432`/`3000:3000`** в `docker-compose.yml` — иначе
> порт (включая БД с ПДн) окажется открыт в интернет мимо файрвола.

Дальше работаем под `deploy`: `ssh deploy@SERVER_IP`.

---

## 3. Установка Docker

```bash
# Официальный скрипт Docker
curl -fsSL https://get.docker.com | sudo sh

# Запускать docker без sudo
sudo usermod -aG docker $USER
newgrp docker   # или перелогиниться

# Проверка (включает plugin compose v2)
docker --version
docker compose version
```

---

## 4. Клонирование репозитория

```bash
cd ~
git clone https://github.com/gvukamolle/bigstap.git
cd bigstap
git checkout main      # рабочая ветка прода
```

---

## 5. Файл окружения `.env`

```bash
cp .env.production.example .env

# Сгенерировать секреты
openssl rand -base64 48   # → PAYLOAD_SECRET
openssl rand -base64 48   # → PAYLOAD_BOOTSTRAP_TOKEN
openssl rand -base64 24   # → POSTGRES_PASSWORD (без пробелов; см. примечание ниже)

nano .env
```

Заполнить в `.env`:

| Переменная | Значение |
|------------|----------|
| `PAYLOAD_SECRET` | длинный случайный секрет (≥16 симв.) |
| `NEXT_PUBLIC_SITE_URL` | `https://ВАШ_ДОМЕН` (без слеша в конце) |
| `POSTGRES_PASSWORD` | пароль БД |
| `DATABASE_URI` | `postgres://bigstep:ПАРОЛЬ@postgres:5432/bigstep` — тот же пароль |
| `PAYLOAD_BOOTSTRAP_TOKEN` | токен для первичного создания админа (на шаге 7) |
| `PAYLOAD_DB_PUSH` | пока **пустое** (включим на шаге 6 только для первого старта) |
| `YOOKASSA_*`, `CDEK_*` | оставить пустыми (заглушки) |

> **Пароль Postgres** должен совпадать в `POSTGRES_PASSWORD` и внутри `DATABASE_URI`.
> Избегайте в пароле символов `@ : / # ?` — они ломают URL. Если нужны, берите URL-safe генерацию,
> например `openssl rand -hex 24`.

---

## 6. Первый запуск и инициализация схемы БД

На чистой Postgres таблиц ещё нет. В production авто-`push` схемы выключен (защита от потери данных),
а миграций в репозитории пока нет, поэтому **для первого запуска** временно включаем `PAYLOAD_DB_PUSH`.

```bash
# 1) Временно включить создание схемы
sed -i 's/^PAYLOAD_DB_PUSH=.*/PAYLOAD_DB_PUSH=true/' .env

# 2) Собрать образ и поднять стек
docker compose up -d --build

# 3) Дождаться готовности и убедиться, что таблицы создались
docker compose ps
docker compose logs -f app        # Ctrl+C когда увидите, что сервер слушает :3000
```

**Убедитесь, что таблицы реально созданы** — drizzle `push` выполняется при первом обращении
Payload, а не при старте HTTP-сервера. Если выключить push раньше — получите пустую схему и 500-е:

```bash
docker compose exec -T postgres psql -U bigstep -d bigstep -c '\dt'
# В списке должны быть users, orders, products, media и др. Если пусто — откройте сайт
# (curl -I http://127.0.0.1:3000/), дайте Payload инициализироваться и повторите проверку.
```

Только когда таблицы появились, **выключаем push** (чтобы прод не «дрейфил» схему):

```bash
sed -i 's/^PAYLOAD_DB_PUSH=.*/PAYLOAD_DB_PUSH=/' .env
docker compose up -d             # пересоздаст app с новым окружением
```

Проверка локально на сервере:

```bash
curl -I http://127.0.0.1:3000/   # ожидаем HTTP/1.1 200
```

> Когда появится полноценный workflow миграций Payload, этот шаг заменяется на `payload migrate`
> внутри контейнера, а `PAYLOAD_DB_PUSH` больше не нужен.

---

## 7. Reverse-proxy + TLS (до создания админа!)

Создание первого админа Payload использует cookie с флагом `Secure` → **нужен HTTPS**.
Поэтому сначала поднимаем reverse-proxy с сертификатом, и только потом (шаг 8) заводим админа.

> 🚨 **СНАЧАЛА настройте DNS (шаг 9) и дождитесь распространения.** И Caddy (auto-TLS), и certbot
> выпускают сертификат Let's Encrypt только после того, как домен резолвится на IP сервера и доступен
> по порту 80 (HTTP-01 challenge). Если поднять proxy до DNS — получите циклические ошибки ACME и
> rate-limit Let's Encrypt (5 неудач/час). Проверка ПЕРЕД установкой proxy:
>
> ```bash
> dig +short ВАШ_ДОМЕН        # должен вернуть IP вашего сервера
> curl -I http://ВАШ_ДОМЕН    # должен достучаться до сервера (не таймаут)
> ```

Reverse-proxy обязан пробрасывать заголовки `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-For`
(на них завязаны редирект bootstrap и rate-limit) и **переустанавливать** их, а не доверять входящим
от клиента: иначе подделкой `X-Forwarded-Host` админа можно увести на фишинговый домен.

### Вариант A — Caddy (проще, авто-TLS)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
bigstep.ru, www.bigstep.ru {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy сам получит и продлит сертификат Let's Encrypt и автоматически пробросит `X-Forwarded-*`.

### Вариант B — nginx + certbot

`/etc/nginx/sites-available/bigstep` (после `ln -s` в `sites-enabled` и `nginx -t`):

```nginx
server {
    listen 80;
    server_name bigstep.ru www.bigstep.ru;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
    }
    client_max_body_size 25m;   # запас под загрузку изображений в админке
}
```

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d bigstep.ru -d www.bigstep.ru   # выпустит сертификат и поднимет 443 + редирект с 80
```

> HSTS уже выставляется приложением (`next.config.ts`), поэтому в nginx дублировать его не нужно.

---

## 8. Создание первого админа Payload

Только после того, как сайт открывается по HTTPS:

1. Убедитесь, что в `.env` задан `PAYLOAD_BOOTSTRAP_TOKEN`, и контейнер перезапущен после его установки
   (`docker compose up -d`).
2. Откройте `https://ВАШ_ДОМЕН/bootstrap-admin`.
3. Введите `PAYLOAD_BOOTSTRAP_TOKEN` в форму (токен не уходит в URL). Лимит — 5 попыток / 15 мин / IP.
4. При успехе — редирект на `/admin/create-first-user`. Создайте администратора
   (вход по **username**, email опционален).
5. **Закройте лазейку:** очистите токен и перезапустите app —

   ```bash
   sed -i 's/^PAYLOAD_BOOTSTRAP_TOKEN=.*/PAYLOAD_BOOTSTRAP_TOKEN=/' .env
   docker compose up -d
   ```

   Без токена `/admin/create-first-user` и `/api/users/first-register` снова отдают 404.

Дальше входите как обычно через `https://ВАШ_ДОМЕН/admin`. Товары добавляются в разделе
«Товары»; витрина `/shop` читает их из Payload (при пустой CMS — fallback на фикстуры).

> Альтернатива bootstrap-форме: `docker compose exec app ...` для `npm run admin:seed` здесь не подойдёт —
> standalone-образ не содержит dev-инструментов (`tsx`, исходники). На проде используйте только bootstrap-форму.

---

## 9. DNS

У регистратора домена создайте записи на IP сервера:

| Тип | Имя | Значение |
|-----|-----|----------|
| `A` | `@` | `SERVER_IP` |
| `A` | `www` | `SERVER_IP` |

Проверка: `dig +short bigstep.ru`. Распространение DNS — до нескольких часов. Сертификат
Let's Encrypt выпускается только после того, как домен резолвится на сервер.

---

## 10. Обновление приложения

```bash
cd ~/bigstap
git pull origin main
docker compose up -d --build      # пересоберёт образ и перезапустит app
docker image prune -f             # подчистить старые слои
```

Схема БД при обновлении не трогается (push выключен). **Перед любым изменением схемы обязательно
сделайте бэкап** (`pg_dump`, раздел 11). Гонять `PAYLOAD_DB_PUSH=true` на живой проде с заказами
рискованно (тихий schema drift и потеря данных); безопасный путь — Payload migrations, когда они
появятся. До этого порядок строго: бэкап → включить push → проверить таблицы (`\dt`) → выключить push.

---

## 11. Резервные копии

Коллекция `orders` хранит ПДн покупателей (имя, телефон, email, город, ПВЗ) — рабочий бэкап
обязателен ДО публичного запуска. **Храните копии в РФ и зашифрованными (152-ФЗ).**

Готовый скрипт `~/backup-bigstep.sh` (с ротацией 14 дней):

```bash
#!/usr/bin/env bash
set -euo pipefail
cd ~/bigstap
DEST=~/backups; mkdir -p "$DEST"
STAMP=$(date +%F-%H%M)
# Postgres (заказы, ПДн)
docker compose exec -T postgres pg_dump -U bigstep bigstep | gzip > "$DEST/db-$STAMP.sql.gz"
# Загрузки Payload (том bigstep_bigstep-media — префикс из `name: bigstep` в compose)
docker run --rm -v bigstep_bigstep-media:/data -v "$DEST":/backup alpine \
  tar czf "/backup/media-$STAMP.tar.gz" -C /data .
# Ротация: удалить копии старше 14 дней
find "$DEST" -name '*.gz' -mtime +14 -delete
```

```bash
chmod +x ~/backup-bigstep.sh
crontab -e
# добавить строку (ежедневно в 03:30):
# 30 3 * * * /home/deploy/backup-bigstep.sh >> /home/deploy/backup.log 2>&1
```

Восстановление:

```bash
gunzip -c ~/backups/db-YYYY-MM-DD-HHMM.sql.gz | docker compose exec -T postgres psql -U bigstep -d bigstep
```

> Имя тома детерминировано префиксом `name: bigstep` в `docker-compose.yml` → `bigstep_bigstep-media`.
> Раз в месяц проверяйте восстановление на тестовой базе — бэкап без проверки не бэкап. Копируйте
> `~/backups` в отдельное хранилище **в РФ**, шифруйте, `chmod 600`. НЕ держите дампы с ПДн в каталоге git.

---

## 12. Эксплуатация и диагностика

```bash
docker compose ps                 # статус и healthcheck
docker compose logs -f app        # логи приложения
docker compose logs -f postgres   # логи БД
docker compose restart app        # перезапуск приложения
docker compose down               # остановить стек (тома сохраняются)
```

**Типичные проблемы**

- `app` рестартится / 502 от прокси → смотрите `docker compose logs app`. Частая причина — неверный
  `DATABASE_URI` (хост должен быть `postgres`, не `localhost`) или несозданная схема (см. шаг 6).
- На главной товары из фикстур, а не из CMS → проверьте подключение к Postgres и что товары заведены в админке.
- `/bootstrap-admin` не пускает → проверьте, что сайт открыт по **HTTPS**, задан `PAYLOAD_BOOTSTRAP_TOKEN`,
  контейнер перезапущен после его установки, и не исчерпан лимит попыток (5 / 15 мин).
- Картинки админки не обрабатываются (sharp) → образ собран на `node:22-slim` с готовыми бинарниками sharp;
  пересоберите `docker compose build --no-cache app`.

---

## 13. Чек-лист безопасности перед публичным запуском

- [ ] `PAYLOAD_SECRET` — длинный случайный, не из примера.
- [ ] `PAYLOAD_BOOTSTRAP_TOKEN` очищен после создания админа.
- [ ] `PAYLOAD_DB_PUSH` выключен (пустой) в обычной работе.
- [ ] `.env` не в git (он в `.gitignore`), права `chmod 600 .env`.
- [ ] UFW: открыты только 22/80/443; порты 3000 и 5432 — только на `127.0.0.1`.
- [ ] HTTPS работает, HTTP редиректит на HTTPS, сертификат валиден.
- [ ] Настроены и проверены бэкапы Postgres и тома media.
- [ ] Креды из локального `.env.local` (если были) считаются скомпрометированными — на проде новые.
- [ ] Автозапуск Docker после ребута: `sudo systemctl enable docker`, проверено тест-перезагрузкой.

---

## 14. Перед боевым запуском: 152-ФЗ (обработка ПДн)

Магазин принимает ПДн покупателей (имя, телефон, email, город, ПВЗ) → действует 152-ФЗ. Технический
деплой этого НЕ закрывает. До публичного приёма заказов (не юрист — сверьтесь со специалистом):

- [ ] **Уведомление в Роскомнадзор** об обработке ПДн подано ДО начала обработки (ст. 22 152-ФЗ).
- [ ] **Политика обработки ПДн** на `/privacy` с реальными реквизитами (плейсхолдеры заполнены).
- [ ] **Согласие на обработку ПДн** — отдельный чекбокс в форме заказа (с 01.09.2025 нельзя объединять
      с офертой). В прототипе чекбокс пока НЕ реализован — добавить до запуска.
- [ ] **Оферта** `/offer` заполнена (реквизиты, адрес для возврата, дата редакции).
- [ ] Сервер и бэкапы с ПДн — **только в РФ** (локализация, ч. 5 ст. 18 152-ФЗ).
- [ ] Финальные тексты оферты и политики проверены юристом.
