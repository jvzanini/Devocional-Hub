---
type: doc
name: tooling
description: Scripts, IDE settings, automation, and developer productivity tips
category: tooling
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---

## Guia de Ferramentas e Produtividade

Este guia cobre as ferramentas, scripts e configurações usadas no DevocionalHub.

## Runtime e Gerenciador de Pacotes

**Runtime**: Node.js 20 (Debian bookworm-slim no Docker)

**Gerenciador de Pacotes**: npm (com `--legacy-peer-deps` devido a conflitos de peer deps do NextAuth v5 beta)

## Instalação

```bash
npm install --legacy-peer-deps
npx prisma generate
npm run dev  # http://localhost:3000
```

## Comandos Principais

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento com hot reload |
| `npm run build` | Build de produção |
| `npm start` | Iniciar servidor de produção |
| `npx prisma generate` | Gerar Prisma client após alterações no schema |
| `npx prisma db push` | Sincronizar schema com o banco de dados |
| `npx prisma studio` | Navegador visual do banco de dados |

## Docker

- `docker-compose up` — Dev local (PostgreSQL + App)
- `docker build -t devocional-hub:latest .` — Build da imagem
- Dockerfile multi-stage: deps → builder → runner (standalone output)
- Imagem base: `node:20-bookworm-slim` (NÃO usar Alpine — incompatibilidade com Playwright)

## CI/CD (GitHub Actions)

- Push para `main` dispara build + deploy
- Builda imagem Docker → push para GHCR (`ghcr.io/jvzanini/devocional-hub:latest`)
- Deploy no Portainer (Stack ID 86, Docker Swarm)
- `DEPLOY_SHA` injetado para forçar redeploy

## Banco de Dados

- **PostgreSQL 16** (via Docker)
- **Prisma 5** como ORM
- Schema: `prisma/schema.prisma`
- Seed: `prisma/seed.ts`
- O `docker-entrypoint.sh` executa `prisma db push --skip-generate` na inicialização

## Configuração de IDE (VS Code)

Extensões recomendadas:

- **Prisma** — Syntax highlighting do schema
- **Tailwind CSS IntelliSense** — Autocomplete de classes
- **ESLint** — Linting inline
- **TypeScript** — IntelliSense e verificação de tipos

## Playwright (Automação NotebookLM)

- Chromium auto-discovered (NÃO definir `executablePath`)
- Sessão persistida em `./playwright-state/google-session.json` (volume Docker)
- Setup: `/api/admin/notebooklm-setup` (login único no Google)

## Armadilhas e Cuidados

- **SEMPRE** usar `--legacy-peer-deps` com `npm install`
- `prisma db push` precisa de `--skip-generate` no entrypoint do Docker (EACCES no /app)
- Senha do PostgreSQL com `@` precisa de `%40` na `DATABASE_URL`
- **NUNCA** usar `@theme` inline do Tailwind v4 — CSS variables não funcionam em produção no Docker

## Recursos Relacionados

- [development-workflow.md](./development-workflow.md)
