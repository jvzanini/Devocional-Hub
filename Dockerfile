FROM node:20-bookworm-slim AS base

# Dependências do sistema para Chromium do Playwright + app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libxkbcommon0 libatspi2.0-0 libx11-6 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 \
    fonts-freefont-ttf ca-certificates openssl curl dbus \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Dependências ──────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps && npx prisma generate

# Instala Chromium bundled do Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium

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
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

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

# Playwright — Chromium bundled + bibliotecas do pacote
COPY --from=deps /ms-playwright /ms-playwright
COPY --from=deps /app/node_modules/playwright /app/node_modules/playwright
COPY --from=deps /app/node_modules/playwright-core /app/node_modules/playwright-core

# Permissões — Prisma engines + entrypoint precisam ser acessíveis pelo nextjs
RUN chown -R nextjs:nodejs /app/node_modules/@prisma /app/node_modules/.prisma

# Script de inicialização
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Diretórios de dados
RUN mkdir -p data playwright-state storage/photos && chown -R nextjs:nodejs data playwright-state storage

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
