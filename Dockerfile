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
# /app/media — каталог загрузок Payload (upload: true → ./media), монтируется томом.
RUN mkdir -p /app/media && chown -R node:node /app

# standalone тащит только реально используемые зависимости (включая sharp, payload, db-адаптеры).
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
VOLUME ["/app/media"]

CMD ["node", "server.js"]
