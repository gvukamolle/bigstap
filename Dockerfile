# syntax=docker/dockerfile:1

# BIGSTEP.RU — production-образ: Next.js 16 (standalone) + Payload CMS 3.
# Многоступенчатая сборка deps → builder → runner. Node 22 LTS на Debian slim:
# у sharp есть готовые бинарники под glibc, поэтому не нужны ни libc6-compat, ни сборка из исходников.

# ---- 1) Зависимости (отдельный слой ради кэша) ----
FROM node:22-slim AS deps
WORKDIR /app
# Payload/Next требуют --legacy-peer-deps (см. CLAUDE.md)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ---- 2) Сборка ----
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_SITE_URL инлайнится в бандл на этапе build (sitemap, robots, canonical, OG, JSON-LD).
# Передаётся build-аргументом из docker-compose (build.args), иначе домен останется дефолтным
# и sitemap/canonical укажут на чужой адрес для любого домена, кроме bigstep.ru.
ARG NEXT_PUBLIC_SITE_URL=https://bigstep.ru
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next build выдаёт .next/standalone (output: 'standalone' в next.config.ts).
# DATABASE_URI/PAYLOAD_SECRET на этапе сборки не нужны: это build-фаза, не боевой рантайм.
RUN npm run build

# ---- 3) Рантайм ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Непривилегированный пользователь node (uid 1000) уже есть в официальном образе.
# /app/media — каталог загрузок Payload (upload: true → ./media), монтируется именованным томом.
# chown только на сам media: код ниже копируется с --chown=node:node, рекурсивный chown /app лишний.
RUN mkdir -p /app/media && chown node:node /app/media

# standalone тащит только реально используемые зависимости (включая sharp, payload, db-адаптеры).
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
# Персистентность /app/media обеспечивает именованный том в docker-compose.yml.
# VOLUME в образе намеренно НЕ объявляем: при ручном `docker run` он плодил бы анонимные тома
# и терял загруженные картинки при каждом пересоздании контейнера.

CMD ["node", "server.js"]
