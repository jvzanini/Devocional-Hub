FROM node:20-alpine AS base

# Chromium para Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openssl \
    curl

ENV PLAYWRIGHT_BROWSERS_PATH=/app/browsers
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=""

WORKDIR /app

# ── Dependências ──────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps && npx prisma generate && npx playwright install chromium

# ── Build ─────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ── Runner ────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia arquivos do build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Prisma — cliente gerado + CLI + schema
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma

# bcryptjs para o seed do admin
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Playwright browsers (Chromium compatível)
COPY --from=deps /app/browsers ./browsers

# Script de inicialização
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Diretórios de dados
RUN mkdir -p data playwright-state storage/photos && chown -R nextjs:nodejs data playwright-state storage

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
