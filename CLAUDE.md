# Devocional Hub — Diretrizes do Projeto

## Hotfix v2.1 — Correções pós-deploy (ATIVO)

~30 bugs e ajustes de UI/UX identificados após review em produção. Execução em 3 terminais paralelos + 1 sequencial.

### Execução Paralela — Terminais Hotfix

| Terminal | Etapas | Documento | Escopo | Status |
|----------|--------|-----------|--------|--------|
| A | 1+4 | `.context/workflow/HOTFIX-TERMINAL-A.md` | Backend bugs + Bíblia interativa | PENDENTE |
| B | 2+3 | `.context/workflow/HOTFIX-TERMINAL-B.md` | Dashboard + Devocional/Cards | PENDENTE |
| C | 5+6 | `.context/workflow/HOTFIX-TERMINAL-C.md` | Planejamento, Relatórios, Login, Perfil, Design | PENDENTE |
| D | 7 | `.context/workflow/HOTFIX-TERMINAL-D.md` | Deploy (APÓS A+B+C) | PENDENTE |

**IMPORTANTE:** Cada terminal NÃO deve tocar nos arquivos dos outros terminais. NÃO fazer push — apenas o Terminal D faz push.

## Master Update v2 — CONCLUÍDO

Atualização master com 22 features em 8 tracks. Todas as 7 etapas foram concluídas com sucesso.

### Documentação Completa
- **PRD:** `.context/workflow/docs/prd-devocional-hub-master-update-v2.md`
- **Tech Spec:** `.context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md`
- **Plano de Execução:** `.context/plans/devocional-hub-master-update-v2.md`

### Etapa 1 — Fundação (CONCLUÍDA)
Schema Prisma atualizado (5 novos models, UserRole com 5 níveis), sistema de permissões implementado, endpoints de autenticação criados, sharp instalado, templates de email prontos.

### Etapas 2, 3, 5 — Core Backend + Frontend + Novas Features (CONCLUÍDAS)
Triagem de transcrições, deduplicação Zoom, multi-sessão, email funcional, sidebar redesenhada, calendário com legendas, admin panel completo, perfil com foto/WhatsApp/apagar conta, Bíblia interativa (bubble + player + seletores), módulo de planejamento teológico.

### Etapa 4 — Features Complexas (CONCLUÍDA)
Cards redesenhados (layout vertical, AI_SUMMARY, ParticipantLog, navegação), busca inteligente, plano de leitura (calendário interativo, ChapterChecklist parcial/completo, progresso), relatórios (gráficos barras/linha/pizza, filtros avançados, toggle semanal/mensal/anual, exportar CSV), seção devocional (progresso por livro, roadmap, "Abrir Bíblia").

### Etapa 6 — Polimento (CONCLUÍDA)
Correções da Etapa 4 (modal retroativo, popup horário, rotação de dias), responsividade total (4+ breakpoints, fullscreen mobile, sidebar hamburger), dark mode (2042 linhas CSS), performance (lazy loading Bíblia, skeletons, debounce), segurança (29 endpoints com requireRole, uploads validados, API key segura, tokens com expiração).

### Etapa 7 — Validação & Deploy (CONCLUÍDA)
Prisma generate e tsc --noEmit sem erros, zero imports antigos, zero credenciais no código, .gitignore completo, CLAUDE.md atualizado, deploy em produção.

### Execução Paralela — Terminais
Cada terminal deve ler seu documento de etapa ANTES de começar:

| Terminal | Etapa | Documento de Instruções | Escopo | Status |
|----------|-------|------------------------|--------|--------|
| Terminal 1 | Etapa 2 — Backend | `.context/workflow/ETAPA-2-BACKEND.md` | Pipeline IA, triagem, deduplicação, email | CONCLUÍDA |
| Terminal 2 | Etapa 3 — Frontend | `.context/workflow/ETAPA-3-FRONTEND.md` | Sidebar, calendário, admin, perfil | CONCLUÍDA |
| Terminal 3 | Etapa 5 — Novas Features | `.context/workflow/ETAPA-5-NOVAS-FEATURES.md` | Bíblia interativa, planejamento | CONCLUÍDA |
| Terminal 4 | Etapa 4 — Backend | `.context/workflow/ETAPA-4-BACKEND.md` | Endpoints de cards, busca, plano leitura, relatórios | CONCLUÍDA |
| Terminal 5 | Etapa 4 — Frontend | `.context/workflow/ETAPA-4-FRONTEND.md` | UI de cards, plano leitura, relatórios, devocional | CONCLUÍDA (3 itens → Etapa 6) |
| Terminal 6 | Etapa 6 — Polimento | `.context/workflow/ETAPA-6-POLIMENTO.md` | Responsividade, dark mode, performance, segurança, correções | CONCLUÍDA |
| Terminal 7 | Etapa 7 — Deploy | `.context/workflow/ETAPA-7-DEPLOY.md` | Testes, documentação, deploy produção | CONCLUÍDA |

**IMPORTANTE:** Ao abrir cada terminal, passar o prompt:
```
Leia o arquivo .context/workflow/ETAPA-{N}-{NOME}.md e execute todas as tasks descritas. O PRD está em .context/workflow/docs/prd-devocional-hub-master-update-v2.md e o Tech Spec em .context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md
```

### Novos Arquivos da Etapa 1 (já implementados)
- `src/features/permissions/lib/role-hierarchy.ts` — Hierarquia de roles (SUPER_ADMIN:100 → MEMBER:20)
- `src/features/permissions/lib/permission-guard.ts` — Guards: requireRole(), requirePermission()
- `src/app/api/admin/permissions/route.ts` — GET/PATCH permissões
- `src/app/api/auth/forgot-password/route.ts` — Enviar email de redefinição
- `src/app/api/auth/reset-password/route.ts` — Redefinir senha com token
- `src/app/api/profile/password/route.ts` — Alterar senha (logado)
- `src/app/api/profile/account/route.ts` — Soft delete (LGPD)
- `src/shared/lib/image-utils.ts` — Compressão de fotos (sharp)

### Novos Models Prisma (Etapa 1)
- `Permission` — recurso + minRole (controle de acesso configurável)
- `PasswordResetToken` — token de redefinição de senha com expiração
- `ParticipantEntry` — log de entradas/saídas individuais do Zoom
- `ChapterReading` — leitura parcial/completa por capítulo
- `PlanningCard` — card de planejamento teológico por capítulo

### Enum UserRole Atualizado
```
SUPER_ADMIN (100) — Controle total (antigo ADMIN)
ADMIN (80) — Equipe de manutenção
SUBSCRIBER_VIP (60) — Assinante VIP (futuro)
SUBSCRIBER (40) — Assinante (futuro)
MEMBER (20) — Participante regular
```

## Build & Deploy
- Build: `npm run build` (APENAS na VPS/Docker — ver nota abaixo)
- Dev: `npm run dev`
- Prisma: `npx prisma generate` após alterar schema
- DB sync: `npx prisma db push` (APENAS na VPS — requer PostgreSQL)
- Install: `npm install --legacy-peer-deps` (conflito de peer deps com next-auth beta)
- Deploy: push para `main` → GitHub Actions builda Docker image → faz deploy no Portainer
- IMPORTANTE: Após deploy, o container leva ~30s para reiniciar. Aguardar antes de validar.
- IMPORTANTE: O Portainer só atualiza o container se o stack YAML mudar. O CI/CD injeta `DEPLOY_SHA` para forçar redeploy.

### Build Local — ATENÇÃO
- O `npm run build` TRAVA localmente porque tenta conectar ao PostgreSQL durante a compilação de server components
- PostgreSQL roda APENAS na VPS (Docker Swarm), NUNCA localmente
- Para validar código localmente: usar `npx prisma generate` (valida schema) + `npx tsc --noEmit` (valida tipos)
- O build real acontece no CI/CD (GitHub Actions → Docker)

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 (ATENÇÃO: NÃO usar @theme inline — as CSS variables não funcionam em produção)
- CSS: usar classes hardcoded em `globals.css` (`.card`, `.btn-primary`, `.input-field`, etc.) + inline styles
- Prisma 5 + PostgreSQL (via Docker Swarm, host: `postgres`)
- NextAuth v5 beta (credentials provider, JWT strategy, `trustHost: true`)
- Nodemailer para emails (Gmail SMTP)
- Playwright para automação NotebookLM
- sharp (v0.34.5) para compressão de imagens de perfil
- Recharts para gráficos (pizza, barras, linha)
- OpenAI API (primário) — gpt-4.1-mini, modelo configurável via admin
- OpenRouter API (fallback gratuito) — Nemotron 120B
- Google Gemini API (fallback gratuito) — gemini-2.5-flash

## Arquitetura (Feature-Based)
```
src/
├── app/                          # Routing layer (pages + API routes)
│   ├── (auth)/                   # Login, Invite (sem sidebar)
│   ├── (dashboard)/              # Páginas autenticadas (com sidebar)
│   │   ├── layout.tsx            # Layout compartilhado: Sidebar + auth check
│   │   ├── page.tsx              # Dashboard (home) — stats, hero, insights IA, calendário
│   │   ├── books/page.tsx        # Devocional (lista + grid de cards)
│   │   ├── planning/page.tsx     # Planejamento teológico
│   │   ├── reports/page.tsx      # Relatórios (filtros, gráficos, tabela)
│   │   ├── admin/page.tsx        # Painel admin (7 abas com ícones)
│   │   ├── profile/page.tsx      # Perfil do usuário
│   │   └── session/[id]/page.tsx # Detalhe da sessão
│   ├── api/                      # 51 API endpoints
│   ├── layout.tsx                # Root layout (font, theme script)
│   └── globals.css               # Design system v3 com CSS variables + dark mode
├── features/                     # Domínios de negócio
│   ├── auth/lib/                 # Autenticação (NextAuth config)
│   ├── sessions/                 # Sessões e presença
│   │   ├── components/           # AttendanceSection, ProtectedDocuments, SessionCard, SessionNavigation, ParticipantLog
│   │   └── lib/                  # attendance-sync.ts
│   ├── dashboard/components/     # DashboardCalendar, BooksDistributionChart
│   ├── admin/components/         # PipelineButton, ChapterChecklist
│   ├── search/                   # Busca inteligente
│   ├── bible/                    # Textos bíblicos
│   │   ├── components/           # BooksPageClient, BibleBooksGrid (legado)
│   │   └── lib/                  # bible.ts, bible-books.ts
│   ├── bible-reader/             # Bíblia interativa (bubble + player) — NOVO
│   │   ├── components/           # BibleBubble, BibleModal, AudioPlayer, Seletores
│   │   └── lib/                  # bible-api-client, audio-manager, version-discovery
│   ├── permissions/lib/          # Sistema de permissões multi-nível — NOVO
│   ├── planning/                 # Módulo de planejamento teológico — NOVO
│   │   ├── components/           # PlanningPage, PlanningCard, ThemeGroup
│   │   └── lib/                  # planning-generator, reference-fetcher
│   ├── pipeline/lib/             # Orquestração: ai.ts, pipeline.ts, notebooklm.ts, reading-plan-sync.ts, transcription-triage.ts
│   ├── zoom/lib/                 # Integração Zoom (OAuth, recordings, participants)
│   └── email/lib/                # Envio de emails (Gmail SMTP) — Templates atualizados
├── shared/                       # Código compartilhado entre features
│   ├── components/               # Sidebar e componentes compartilhados
│   │   ├── Sidebar.tsx           # Sidebar: Menu, Relatórios, Administração
│   │   └── ui/                   # Badge e componentes de UI
│   └── lib/                      # db.ts, storage.ts, utils.ts, image-utils.ts
└── middleware.ts                 # Middleware de autenticação
```

### Rotas
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `(dashboard)/page.tsx` | Dashboard com stats, hero, insights IA, calendário |
| `/books` | `(dashboard)/books/page.tsx` | Devocional (lista lateral + grid responsivo de cards azuis) |
| `/planning` | `(dashboard)/planning/page.tsx` | Planejamento teológico |
| `/reports` | `(dashboard)/reports/page.tsx` | Relatórios (filtros, gráficos, tabela por usuário) |
| `/profile` | `(dashboard)/profile/page.tsx` | Perfil do usuário |
| `/admin` | `(dashboard)/admin/page.tsx` | Painel admin (7 abas) |
| `/session/[id]` | `(dashboard)/session/[id]/page.tsx` | Detalhe da sessão |
| `/login` | `(auth)/login/page.tsx` | Login |
| `/invite/[token]` | `(auth)/invite/[token]/page.tsx` | Aceitar convite |
| `/reset-password/[token]` | `(auth)/reset-password/[token]/page.tsx` | Redefinir senha |

### Endpoints de API
| Grupo | Endpoint | Descrição |
|-------|----------|-----------|
| Auth | `/api/auth/[...nextauth]` | NextAuth (login/session) |
| Auth | `/api/auth/forgot-password` | Enviar email de redefinição |
| Auth | `/api/auth/reset-password` | Redefinir senha com token |
| Auth | `/api/auth/validate-reset-token` | Validar token de redefinição |
| Profile | `/api/profile/password` | Alterar senha (logado) |
| Profile | `/api/profile/account` | Soft delete (LGPD) |
| Profile | `/api/profile/photo/[userId]` | Foto de perfil |
| Admin | `/api/admin/permissions` | GET/PATCH permissões |
| Admin | `/api/admin/users/[id]` | Editar/desativar usuário |
| Admin | `/api/admin/users/[id]/zoom-identifiers` | Zoom IDs do usuário |
| Admin | `/api/admin/webhooks` | CRUD webhooks |
| Admin | `/api/admin/settings/schedules` | Horários agendados |
| Admin | `/api/admin/reading-plans/[id]/retroactive` | Processamento retroativo |
| Admin | `/api/admin/reading-plans/[id]/days/[dayId]/chapters` | Marcar capítulos |
| Admin | `/api/admin/notebooklm-session` | Sessão NotebookLM |
| Admin | `/api/admin/notebooklm-setup` | Setup NotebookLM |
| Bible | `/api/bible/versions` | Listar versões |
| Bible | `/api/bible/books/[versionId]` | Listar livros |
| Bible | `/api/bible/chapters/[versionId]/[bookId]` | Listar capítulos |
| Bible | `/api/bible/content/[versionId]/[chapterId]` | Conteúdo do capítulo |
| Bible | `/api/bible/audio/[versionId]/[chapterId]` | URL do áudio |
| Bible | `/api/bible/context` | Contexto devocional |
| Planning | `/api/planning/current` | Plano ativo com cards |
| Planning | `/api/planning/cards/[planId]` | Cards de um plano |
| Planning | `/api/planning/card/[cardId]` | Detalhe de um card |
| Planning | `/api/planning/generate/[planId]` | Gerar cards via IA |
| Search | `/api/search` | Busca inteligente |
| Reports | `/api/reports/presence` | Dados de presença |
| Reports | `/api/reports/frequency` | Frequência semanal/mensal |
| Reports | `/api/reports/evolution` | Evolução (gráfico linha) |
| Reports | `/api/reports/hours` | Horas de devocional |
| Reports | `/api/reports/books-distribution` | Distribuição por livro |
| Sessions | `/api/sessions/[id]` | Detalhe da sessão |
| Sessions | `/api/sessions/[id]/adjacent` | Sessões adjacentes |
| Sessions | `/api/sessions/[id]/verify-password` | Verificar senha |
| Dashboard | `/api/dashboard/day-summary` | Resumo do dia |
| Attendance | `/api/attendance/user/[id]` | Presença por usuário |
| Pipeline | `/api/pipeline/run` | Executar pipeline |
| Cron | `/api/cron/check` | Health check |
| Files | `/api/files/[id]` | Servir arquivos |
| Invite | `/api/invite/[token]` | Aceitar convite |
| Webhook | `/api/webhook/[slug]` | Webhooks Zoom |

### Design System v3 (`globals.css`)
- CSS em `src/app/globals.css` — Design system v3 com CSS custom properties (:root + [data-theme="dark"])
- ATENÇÃO: NÃO usar `@theme` inline do Tailwind v4 — apenas CSS custom properties padrão
- Dark mode (tema principal): bg `#0c0c0e`, surface `#141416`, accent `#f5a623`
- Light mode: bg `#f5f5f7`, surface `#ffffff`, accent `#d97706`
- Cores SEMPRE via `var()`: `var(--text)`, `var(--accent)`, `var(--surface)`, etc.
- NUNCA usar cores hardcoded (#hex) em componentes — sempre CSS variables
- Classes de layout: `.dashboard-two-col`, `.books-layout`, `.reports-top-grid`, `.session-detail-grid`
- Classes de reports: `.reports-stat-card`, `.reports-chart-card`, `.reports-table-card`, `.reports-table`
- Dark mode: `data-theme="dark"` no `<html>`, salvo em localStorage como `devhub-theme`
- Responsive breakpoints: Mobile (<768px), Small tablet (480-767px), Tablet (768-1023px), Desktop (1024-1279px), Large (≥1440px)
- Imports: `@/features/<feature>/lib/<module>`, `@/features/<feature>/components/<Component>`, `@/shared/lib/<module>`

### Navegação (Sidebar) — Atualização v2
- Menu principal: Início (/), Devocional (/books), Planejamento (/planning), Progresso (/reports)
- Admin: Painel Admin (/admin)
- "Meu Perfil" acessível pelo clique no nome do usuário (rodapé sidebar)
- Menu "Presença" removido (redundante com Progresso/Relatórios)

## Modelos do Banco (Prisma) — Atualizado v2
- User: email, password?, name, role (SUPER_ADMIN/ADMIN/SUBSCRIBER_VIP/SUBSCRIBER/MEMBER), church, team, subTeam, photoUrl, whatsapp?, deletedAt?, deletedBy?, inviteToken
- Session: date, startTime?, zoomMeetingId, zoomUuid, chapterRef, summary, contentPassword?, status, relatedSessionIds[], documents[], participants[]
- Participant: name, email, joinTime, leaveTime, duration, totalDuration, entries[]
- ParticipantEntry: joinTime, leaveTime, duration (log de cada entrada/saída)
- Document: type (TRANSCRIPT_RAW/CLEAN, BIBLE_TEXT, INFOGRAPHIC, SLIDES, AUDIO_OVERVIEW, AI_SUMMARY, PLANNING), fileName, storagePath
- Permission: resource (unique), minRole (controle de acesso configurável)
- PasswordResetToken: userId, token, expiresAt, usedAt?
- ChapterReading: dayId, chapter, isComplete, isPartial, sessions, completedAt?
- PlanningCard: planId, bookName, bookCode, chapter, analysis, references, studyLinks[], imageUrls[], themeGroup?
- ReadingPlanDay: planId, date, chapters, completed, logNote?, actualChapters?, chapterReadings[]
- Webhook: name, slug, active
- AppSetting: key-value (mainSpeakerName, zoomMeetingId, aiModel)

## Pipeline de Processamento
1. Webhook Zoom (`meeting.ended`) → recebe meeting_id + uuid
2. Aguarda 5min para VTT ficar pronto
3. Baixa VTT via `GET /meetings/{uuid}/recordings` (file_type=TRANSCRIPT)
4. UUID com `/` ou `+` precisa de duplo URL-encode (%252F, %252B)
5. Deduplicação de participantes (agrupa por email, múltiplas entradas/saídas → ParticipantEntry)
6. Triagem teológica da transcrição (remove nomes, corrige fatos bíblicos, mantém interpretações)
7. Detecção de multi-sessão (verifica se capítulo já tem sessão anterior, sinais de continuidade)
8. Processa transcrição com IA (cascata de fallbacks)
9. Busca texto bíblico NVI via API.Bible
10. Gera pesquisa teológica + Knowledge Base unificada
11. Extrai senha da transcrição (se mencionada)
12. NotebookLM: cria notebook com KB rica, gera slides + infográfico + vídeo resumo
13. Salva tudo no banco + storage local

## Cascata de IA (callAI)
OpenAI como primário (modelo configurável via admin), fallback automático para gratuitos:
1. **OpenAI** — Modelo selecionado no admin (padrão: `gpt-4.1-mini`) — `OPENAI_API_KEY`
2. Nemotron 120B (`nvidia/nemotron-3-super-120b-a12b:free`) — OpenRouter (fallback gratuito)
3. Step 3.5 Flash (`stepfun/step-3.5-flash:free`) — OpenRouter (fallback gratuito)
4. Nemotron 30B (`nvidia/nemotron-3-nano-30b-a3b:free`) — OpenRouter (fallback gratuito)
5. Gemini 2.5 Flash — Google API direta (fallback gratuito)
6. Erro com log de todas as falhas

O modelo OpenAI pode ser alterado no painel admin (aba "IA") sem necessidade de deploy.
Modelos disponíveis: gpt-4.1-mini, gpt-4.1, gpt-4.1-nano, gpt-4o, gpt-4o-mini, o4-mini, o3, o3-mini

## Infraestrutura
- Domínio: devocional.nexusai360.com (Cloudflare DNS)
- Docker Swarm via Portainer
- Rede: rede_nexusAI (overlay)
- Traefik: reverse proxy + Let's Encrypt SSL + HSTS
- GHCR: ghcr.io/jvzanini/devocional-hub:latest
- GitHub: github.com/jvzanini/Devocional-Hub

## Credenciais (definidas APENAS no Portainer, NUNCA no código)
- Todas as credenciais são configuradas via variáveis de ambiente no Portainer
- No repositório, usar SEMPRE valores genéricos (YOUR_*, changeme, etc.)
- NUNCA commitar senhas, API keys, tokens ou emails reais no Git
- Variáveis usadas: ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_USER, SMTP_PASS, ZOOM_*, OPENAI_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, BIBLE_API_KEY, GOOGLE_EMAIL, GOOGLE_PASSWORD

## Segurança — REGRAS OBRIGATÓRIAS
- NUNCA commitar credenciais, senhas, API keys, tokens ou emails reais no Git
- Arquivos com credenciais (portainer-stack.yml, docker-compose.yml) devem ter SEMPRE valores genéricos no repositório (YOUR_*, changeme)
- As credenciais reais ficam APENAS no Portainer (variáveis de ambiente da stack)
- Antes de cada commit, verificar se não há dados sensíveis nos arquivos alterados
- O .env está no .gitignore e NUNCA deve ser commitado

## Gotchas Críticos
- NUNCA usar `@theme inline` do Tailwind v4 — as CSS variables não existem em runtime no Docker
- SEMPRE usar CSS hardcoded em globals.css ou inline styles para estilos visuais
- O `npm ci` no Dockerfile PRECISA de `--legacy-peer-deps`
- O `prisma db push` no entrypoint PRECISA de `--skip-generate` (EACCES no /app)
- A senha do PostgreSQL tem `@` — usar `%40` na DATABASE_URL
- Cloudflare está em modo "DNS only" (sem proxy) — SSL é pelo Traefik/Let's Encrypt
- O browser do usuário pode cachear versão HTTP — HSTS está configurado mas pode precisar de hard refresh

## Git
- Branch: main
- Commit messages em português, descritivos
- Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
- CI/CD: .github/workflows/deploy.yml (build Docker + deploy Portainer)

## Convenções de Código
- Responder SEMPRE em português brasileiro
- Usar acentos corretos (UTF-8 direto, NUNCA unicode escapes \u00XX)
- camelCase para variáveis/funções, PascalCase para componentes
- Inline styles para layout (style={{ }}) — mais confiável que Tailwind em produção
- CSS classes hardcoded em globals.css para design visual (cards, buttons, inputs, badges)
