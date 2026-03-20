---
type: doc
name: project-overview
description: Visão geral do projeto DevocionalHub, sua finalidade e componentes principais
category: overview
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Visão Geral do Projeto

O **DevocionalHub** é uma plataforma web para gerenciamento de sessões devocionais (grupos de estudo bíblico). Ele automatiza todo o fluxo desde a gravação da reunião no Zoom até a geração de materiais de estudo enriquecidos por IA — transcrição, resumo, texto bíblico, slides, infográfico e vídeo resumo via NotebookLM.

A plataforma atende líderes e membros de grupos devocionais, oferecendo controle de presença, planos de leitura bíblica, gestão de usuários com convites e um pipeline completo de processamento de conteúdo com inteligência artificial.

## Referência do Codebase

> **Análise Detalhada**: Para contagens completas de símbolos, camadas de arquitetura e grafos de dependência, veja [`codebase-map.json`](./codebase-map.json).

## Dados Rápidos

- **Repositório**: [github.com/jvzanini/Devocional-Hub](https://github.com/jvzanini/Devocional-Hub)
- **Domínio**: [devocional.nexusai360.com](https://devocional.nexusai360.com)
- **Linguagem Principal**: TypeScript
- **Entry Point**: `src/app/layout.tsx` (Root Layout do Next.js App Router)
- **Análise Completa**: [`codebase-map.json`](./codebase-map.json)

## Pontos de Entrada

- **Root Layout**: `src/app/layout.tsx` — Layout raiz com fontes, tema e providers
- **Dashboard**: `src/app/(dashboard)/page.tsx` — Página inicial autenticada
- **Login**: `src/app/(auth)/login/page.tsx` — Autenticação de usuários
- **API Routes**: `src/app/api/` — 23 endpoints REST
- **Middleware**: `src/middleware.ts` — Middleware de autenticação (NextAuth)

## Funcionalidades Principais

- **Integração Zoom**: Captura automática de gravações via webhook (`meeting.ended`), download de transcrições VTT
- **Pipeline de IA**: Transcrição → Resumo → Texto bíblico → Pesquisa teológica → Knowledge Base → NotebookLM (slides, infográfico, vídeo resumo)
- **Cascata de IA**: OpenAI (primário, modelo configurável) → OpenRouter (modelos gratuitos) → Gemini 2.5 Flash
- **Automação NotebookLM**: Via Playwright — cria notebooks, gera slides, infográfico e vídeo resumo automaticamente
- **Controle de Presença**: Sincronização automática de participantes do Zoom
- **Planos de Leitura Bíblica**: Planos com acompanhamento diário por usuário
- **Gestão de Usuários**: Convites por email, papéis (ADMIN/MEMBER), perfis com foto
- **Texto Bíblico**: Busca automática da NVI via API.Bible
- **Design System v3**: Dark mode (bg `#0c0c0e`, surface `#151518`, accent `#f5a623`) e light mode (bg `#f5f5f7`, surface `#ffffff`, accent `#d97706`) via CSS custom properties. Cores SEMPRE via `var()`, NUNCA hardcoded em componentes

## Estrutura de Arquivos e Organização do Código

```
src/
├── app/                          # Camada de roteamento (Next.js App Router)
│   ├── (auth)/                   # Páginas de login e convite (sem sidebar)
│   ├── (dashboard)/              # Páginas autenticadas (com sidebar)
│   │   ├── layout.tsx            # Layout com Sidebar + verificação de auth
│   │   ├── page.tsx              # Dashboard (stats, hero, insights IA, calendário)
│   │   ├── books/page.tsx        # Livros da Bíblia (lista lateral + grid cards azuis)
│   │   ├── reports/page.tsx      # Relatórios (filtros, gráfico, tabela)
│   │   ├── admin/page.tsx        # Painel administrativo (7 abas com ícones)
│   │   ├── profile/page.tsx      # Perfil do usuário
│   │   └── session/[id]/page.tsx # Detalhes da sessão
│   ├── api/                      # 23 endpoints REST
│   ├── layout.tsx                # Root layout (fontes, tema)
│   └── globals.css               # Design System v3 com CSS custom properties + dark mode
├── features/                     # Domínios de negócio (feature-based architecture)
│   ├── auth/lib/                 # Configuração NextAuth v5 (JWT + Credentials)
│   ├── sessions/                 # Sessões devocionais
│   │   ├── components/           # AttendanceSection, ProtectedDocuments, SessionCard, AddToCalendar
│   │   └── lib/                  # attendance-sync.ts
│   ├── dashboard/components/     # DashboardCalendar
│   ├── admin/components/         # PipelineButton
│   ├── pipeline/lib/             # Orquestração de IA: ai.ts, pipeline.ts, notebooklm.ts, reading-plan-sync.ts
│   ├── zoom/lib/                 # Zoom OAuth + gravações + participantes
│   ├── bible/                    # Textos bíblicos
│   │   ├── components/           # BooksPageClient (novo), BibleBooksGrid (legado)
│   │   └── lib/                  # bible.ts, bible-books.ts
│   └── email/lib/                # Envio de emails (Gmail SMTP via Nodemailer)
├── shared/                       # Código compartilhado entre features
│   ├── components/               # Sidebar (Menu, Relatórios, Administração), componentes de UI (Badge)
│   └── lib/                      # db.ts (Prisma), storage.ts, utils.ts
└── middleware.ts                 # Middleware de autenticação
```

## Stack Tecnológica

**Runtime**: Node.js

**Framework**: Next.js 16 (App Router) + React 19

**Linguagem**: TypeScript 5

**Estilização**: Tailwind CSS 4 + Design System v3 em `globals.css` (CSS custom properties)

**ORM e Banco**: Prisma 5 + PostgreSQL 16

**Autenticação**: NextAuth v5 (JWT strategy + Credentials provider)

**Bibliotecas Principais**:
- Playwright 1.58 — Automação do NotebookLM
- Recharts — Gráficos no dashboard
- Nodemailer — Envio de emails (Gmail SMTP)
- bcryptjs — Hash de senhas

**Qualidade de Código**:
- ESLint
- TypeScript strict mode

## Modelos do Banco de Dados (Prisma)

| Modelo | Descrição |
|--------|-----------|
| **User** | Usuários com email, senha, papel (ADMIN/MEMBER), igreja, equipe, foto, token de convite |
| **Session** | Sessões devocionais com data, referência bíblica, resumo, status, senha de conteúdo |
| **Participant** | Participantes de cada sessão (nome, email, horários de entrada/saída, duração) |
| **Document** | Documentos gerados (transcrição raw/limpa, texto bíblico, infográfico, slides) |
| **Attendance** | Registro de presença por sessão |
| **ReadingPlan** | Planos de leitura bíblica |
| **ReadingPlanDay** | Dias individuais de cada plano de leitura |
| **ZoomIdentifier** | Identificadores de reuniões Zoom |
| **AppSetting** | Configurações da aplicação (chave-valor: mainSpeakerName, zoomMeetingId, aiModel) |
| **Webhook** | Webhooks configurados (nome, slug, ativo) |

## Pipeline de Processamento

1. **Webhook Zoom** (`meeting.ended`) → recebe `meeting_id` + `uuid`
2. **Aguarda 5 minutos** para o VTT ficar disponível no Zoom
3. **Download do VTT** via `GET /meetings/{uuid}/recordings` (file_type=TRANSCRIPT)
4. **Processamento com IA** (cascata de fallbacks: OpenAI → OpenRouter → Gemini)
5. **Busca texto bíblico** NVI via API.Bible
6. **Pesquisa teológica** + geração de Knowledge Base unificada
7. **Extração de senha** da transcrição (se mencionada)
8. **NotebookLM**: cria notebook com KB rica, gera slides + infográfico + vídeo resumo
9. **Persistência**: salva tudo no banco + storage local

## Infraestrutura e Deploy

- **Deploy**: Docker Swarm via Portainer (painel.nexusai360.com)
- **CI/CD**: GitHub Actions — build de imagem Docker → deploy no Portainer
- **Registry**: `ghcr.io/jvzanini/devocional-hub:latest`
- **Rede**: `rede_nexusAI` (overlay)
- **Reverse Proxy**: Traefik + Let's Encrypt SSL + HSTS
- **DNS**: Cloudflare (modo "DNS only", sem proxy)
- **Credenciais**: Todas via variáveis de ambiente no Portainer (nunca no código)

## Comandos Essenciais

- `npm install --legacy-peer-deps` — Instalar dependências (conflito de peer deps com next-auth beta)
- `npm run dev` — Iniciar servidor de desenvolvimento
- `npm run build` — Build de produção
- `npx prisma generate` — Gerar cliente Prisma após alterar schema
- `npx prisma db push` — Sincronizar schema com o banco de dados

## Checklist para Começar

1. Clonar o repositório: `git clone https://github.com/jvzanini/Devocional-Hub.git`
2. Instalar dependências: `npm install --legacy-peer-deps`
3. Copiar variáveis de ambiente: `cp .env.example .env` e preencher
4. Gerar cliente Prisma: `npx prisma generate`
5. Sincronizar banco: `npx prisma db push`
6. Iniciar desenvolvimento: `npm run dev`
7. Acessar: `http://localhost:3000`

## Gotchas Críticos

- **NUNCA** usar `@theme inline` do Tailwind v4 — as CSS variables não existem em runtime no Docker
- **NUNCA** usar cores hardcoded (#hex) em componentes — sempre CSS variables via `var()`
- **SEMPRE** usar CSS hardcoded em `globals.css` ou inline styles para estilos visuais
- O `npm ci` no Dockerfile **precisa** de `--legacy-peer-deps`
- O `prisma db push` no entrypoint **precisa** de `--skip-generate` (EACCES no /app)
- A senha do PostgreSQL com `@` deve usar `%40` na DATABASE_URL
- **NUNCA** commitar credenciais reais no Git — valores genéricos (YOUR_*, changeme) no repositório
- Alpine Chromium é incompatível com Playwright 1.58 — usar Debian bookworm
- NÃO usar `executablePath` no Playwright — deixar auto-discovery do Chromium

## Recursos Relacionados

- [architecture.md](./architecture.md)
- [development-workflow.md](./development-workflow.md)
- [tooling.md](./tooling.md)
- [codebase-map.json](./codebase-map.json)
