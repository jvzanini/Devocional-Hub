---
type: agent
name: Feature Developer
description: Implementar novas funcionalidades no DevocionalHub seguindo a arquitetura feature-based
agentType: feature-developer
phases: [P, E]
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Missao

Este agente implementa novas funcionalidades no DevocionalHub seguindo a arquitetura feature-based e as convenções do projeto.

**Quando acionar:**
- Implementação de nova feature (ex: novo módulo em `src/features/`)
- Adição de novos endpoints na API (`src/app/api/`)
- Criação de novas páginas no dashboard (`src/app/(dashboard)/`)
- Extensão de funcionalidades existentes (pipeline, zoom, bible, etc.)

**Abordagem de implementação:**
- Entender requisitos e onde a feature se encaixa na arquitetura feature-based
- Criar componentes e lógica dentro do diretório da feature correspondente
- Seguir as convenções de código do projeto (camelCase, PascalCase, CSS vars)
- Instalar dependências com `npm install --legacy-peer-deps`

## Responsabilidades

- Implementar features dentro da estrutura `src/features/<feature>/` (components/ + lib/)
- Criar API routes em `src/app/api/` seguindo o padrão existente dos 23 endpoints
- Adicionar páginas em `src/app/(dashboard)/` ou `src/app/(auth)/`
- Usar Prisma para interagir com o banco PostgreSQL (modelos: User, Session, Participant, Document, Webhook, AppSetting)
- Seguir o padrão de imports do projeto: `@/features/`, `@/shared/`
- Garantir que CSS use custom properties em `globals.css` (NUNCA `@theme` inline do Tailwind v4)
- Respeitar o sistema de autenticação NextAuth v5 (JWT, roles ADMIN/MEMBER)
- Escrever commits em português brasileiro

## Boas Praticas

- Usar `camelCase` para variáveis/funções e `PascalCase` para componentes React
- Inline styles (`style={{ }}`) para layout — mais confiável que Tailwind em produção Docker
- CSS classes hardcoded em `globals.css` para design visual (`.card`, `.btn-primary`, `.input-field`)
- NUNCA usar `@theme` inline do Tailwind v4 — não funciona no Docker
- NUNCA commitar credenciais reais — usar valores genéricos (YOUR_*, changeme)
- Usar acentos UTF-8 diretos, NUNCA unicode escapes (`\u00XX`)
- Instalar pacotes com `npm install --legacy-peer-deps` (conflito next-auth beta)
- Dark mode via `data-theme="dark"` no `<html>`, salvo em localStorage como `devhub-theme`

## Recursos Chave do Projeto

- `CLAUDE.md` — Diretrizes completas do projeto DevocionalHub
- `.context/` — Documentação de contexto e playbooks de agentes
- `AGENTS.md` — Índice de agentes e responsabilidades

## Diretórios Iniciais

- `src/features/` — Domínios de negócio: auth, sessions, pipeline, zoom, bible, email, admin, dashboard
- `src/app/api/` — 23 endpoints da API REST
- `src/app/(dashboard)/` — Páginas autenticadas com sidebar (dashboard, admin, profile, session/[id])
- `src/app/(auth)/` — Páginas de login e convite (sem sidebar)
- `src/shared/` — Componentes e utilitários compartilhados entre features

## Arquivos Chave

- `prisma/schema.prisma` — Schema do banco (User, Session, Participant, Document, Webhook, AppSetting)
- `src/shared/lib/db.ts` — Instância singleton do PrismaClient
- `src/features/auth/lib/` — Configuração NextAuth v5 (credentials, JWT, roles)
- `src/app/globals.css` — Design system com CSS custom properties (:root + [data-theme="dark"])
- `src/middleware.ts` — Middleware de autenticação para rotas protegidas
- `src/features/pipeline/lib/ai.ts` — Cascata de IA (OpenAI primário, fallbacks gratuitos)
- `src/features/pipeline/lib/pipeline.ts` — Orquestração do pipeline de processamento

## Contexto da Arquitetura

- **Monolito modular feature-based**: cada feature tem seus próprios `components/` e `lib/` isolados
- **Camada de roteamento**: `src/app/` — apenas pages e API routes (lógica fica em `src/features/`)
- **Código compartilhado**: `src/shared/components/` (Sidebar, ui/) e `src/shared/lib/` (db.ts, storage.ts, utils.ts)
- **Fluxo de dados principal**: Zoom webhook → Pipeline → IA (cascata) → Bible API → NotebookLM → DB + Storage

## Símbolos Chave para Este Agente

- `callAI()` — Função de cascata de IA com fallbacks (OpenAI → Nemotron → Step → Gemini)
- `PrismaClient` — Acesso ao banco via `src/shared/lib/db.ts`
- `Session`, `User`, `Document`, `Participant` — Modelos Prisma principais
- `Sidebar` — Componente compartilhado de navegação (`src/shared/components/Sidebar.tsx`)
- `SessionCard` — Componente de card de sessão (`src/features/sessions/components/`)

## Pontos de Documentação

- `CLAUDE.md` — Regras obrigatórias de código, segurança e deploy
- `src/app/globals.css` — Referência do design system (variáveis CSS, classes utilitárias)
- `prisma/schema.prisma` — Estrutura do banco de dados

## Checklist de Colaboração

- [ ] Identificar em qual feature a funcionalidade se encaixa (ou criar nova em `src/features/`)
- [ ] Criar componentes em `src/features/<feature>/components/`
- [ ] Criar lógica de negócio em `src/features/<feature>/lib/`
- [ ] Adicionar API routes necessários em `src/app/api/`
- [ ] Usar imports corretos (`@/features/`, `@/shared/`)
- [ ] Estilizar com CSS vars em `globals.css` + inline styles (NUNCA @theme)
- [ ] Verificar que não há credenciais hardcoded no código
- [ ] Testar dark mode (data-theme="dark")
- [ ] Rodar `npm run build` para validar
- [ ] Criar PR com descrição em português

## Notas de Entrega

Ao concluir a implementação, documentar:
- Quais arquivos foram criados/modificados
- Se houve alteração no schema Prisma (requer `npx prisma db push` no deploy)
- Se novas variáveis de ambiente são necessárias (configurar no Portainer)
- Se o pipeline de IA foi afetado (testar cascata de fallbacks)

## Recursos Relacionados

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
