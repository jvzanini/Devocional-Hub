---
type: doc
name: development-workflow
description: Processos de desenvolvimento, deploy e convenções do DevocionalHub
category: workflow
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Fluxo de Desenvolvimento

Este documento descreve o fluxo de desenvolvimento do DevocionalHub, incluindo deploy, convenções de código e boas práticas.

## Branch e Deploy

**Modelo de Branch**: Branch única (`main`) — todo o desenvolvimento acontece diretamente na `main`.

**Pipeline de Deploy (CI/CD)**:
1. Push para `main` dispara o GitHub Actions (`.github/workflows/deploy.yml`)
2. GitHub Actions builda a imagem Docker
3. A imagem é publicada no GHCR (`ghcr.io/jvzanini/devocional-hub:latest`)
4. O Portainer recebe o webhook e faz redeploy da stack
5. O container leva aproximadamente 30 segundos para reiniciar

**Forçando Redeploy no Portainer**:
O Portainer só atualiza o container se o stack YAML mudar. O CI/CD injeta a variável `DEPLOY_SHA` com o hash do commit para forçar o redeploy a cada push.

## Desenvolvimento Local

**Setup inicial**:
```bash
git clone https://github.com/jvzanini/Devocional-Hub.git
cd Devocional-Hub
npm install --legacy-peer-deps
npx prisma generate
npm run dev
```

> **IMPORTANTE**: Sempre usar `npm install --legacy-peer-deps` devido a conflitos de peer deps com o next-auth beta.

**Comandos do dia a dia**:
- `npm run dev` — Inicia o servidor de desenvolvimento
- `npm run build` — Builda para produção
- `npx prisma generate` — Regenera o client do Prisma após alterar o schema
- `npx prisma db push` — Sincroniza o schema com o banco de dados

**Banco de dados**:
Não há PostgreSQL local. Todo o desenvolvimento e testes são feitos contra o banco de dados na VPS. A `DATABASE_URL` deve apontar para o PostgreSQL da VPS.

## Convenções de Commit

- Mensagens de commit em português brasileiro, descritivas
- Co-autoria com IA: `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
- Nunca commitar credenciais, senhas, API keys, tokens ou emails reais no Git
- Verificar arquivos alterados antes de cada commit para garantir que não há dados sensíveis

## Convenções de Código

**Nomenclatura**:
- `camelCase` para variáveis e funções
- `PascalCase` para componentes React

**Estilização**:
- Inline styles (`style={{ }}`) para layout — mais confiável que Tailwind em produção Docker
- Classes CSS hardcoded em `src/app/globals.css` para design visual (`.card`, `.btn-primary`, `.input-field`, `.badge`, etc.)
- NUNCA usar `@theme inline` do Tailwind v4 — as CSS variables não existem em runtime no Docker
- Dark mode via `data-theme="dark"` no `<html>`, salvo em localStorage como `devhub-theme`

**Idioma**:
- Sempre responder e documentar em português brasileiro
- Usar acentos corretos (UTF-8 direto, nunca unicode escapes `\u00XX`)

## Estrutura de Features

O projeto segue arquitetura baseada em features. Cada feature agrupa seus componentes e lógica:

```
src/features/[feature]/
├── components/    # Componentes React da feature
└── lib/           # Lógica de negócio, utilitários, integrações
```

**Exemplos de features existentes**:
- `auth/` — Autenticação (NextAuth v5 config)
- `sessions/` — Sessões devocionais e presença
- `pipeline/` — Orquestração: IA, NotebookLM, plano de leitura
- `zoom/` — Integração com Zoom (OAuth, gravações, participantes)
- `bible/` — Textos bíblicos (API.Bible)
- `email/` — Envio de emails (Gmail SMTP)
- `admin/` — Painel administrativo
- `dashboard/` — Calendário e visão geral

**Rotas de API**: Todas ficam em `src/app/api/` (23 endpoints atualmente).

**Imports padronizados**:
- `@/features/<feature>/lib/<module>`
- `@/features/<feature>/components/<Component>`
- `@/shared/lib/<module>`

## Validação Pós-Deploy

Após cada deploy, validar que a aplicação está funcionando:
```bash
curl -s -o /dev/null -w "%{http_code}" https://devocional.nexusai360.com
```
Esperar pelo menos 30 segundos após o deploy antes de validar.

## Credenciais e Segurança

- Todas as credenciais são configuradas via variáveis de ambiente no Portainer
- No repositório, usar SEMPRE valores genéricos (`YOUR_*`, `changeme`, etc.)
- O `.env` está no `.gitignore` e nunca deve ser commitado

## Recursos Relacionados

- [testing-strategy.md](./testing-strategy.md)
- [glossary.md](./glossary.md)
- [architecture.md](./architecture.md)
