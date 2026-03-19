# Devocional Hub — Diretrizes do Projeto

## Build & Deploy
- Build: `npm run build`
- Dev: `npm run dev`
- Prisma: `npx prisma generate` após alterar schema
- DB sync: `npx prisma db push`
- Install: `npm install --legacy-peer-deps` (conflito de peer deps com next-auth beta)
- Deploy: push para `main` → GitHub Actions builda Docker image → faz deploy no Portainer
- IMPORTANTE: Após deploy, o container leva ~30s para reiniciar. Aguardar antes de validar.
- IMPORTANTE: O Portainer só atualiza o container se o stack YAML mudar. O CI/CD injeta `DEPLOY_SHA` para forçar redeploy.

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 (ATENÇÃO: NÃO usar @theme inline — as CSS variables não funcionam em produção)
- CSS: usar classes hardcoded em `globals.css` (`.card`, `.btn-primary`, `.input-field`, etc.) + inline styles
- Prisma 5 + PostgreSQL (via Docker Swarm, host: `postgres`)
- NextAuth v5 beta (credentials provider, JWT strategy, `trustHost: true`)
- Nodemailer para emails (Gmail SMTP)
- Playwright para automação NotebookLM
- OpenRouter API (primário) — Nemotron 120B gratuito para IA pesada
- Google Gemini API (fallback) — gemini-2.5-flash para processar transcrições

## Arquitetura (Feature-Based)
```
src/
├── app/                          # Routing layer (pages + API routes)
│   ├── (auth)/                   # Login, Invite (sem sidebar)
│   ├── (dashboard)/              # Páginas autenticadas (com sidebar)
│   │   ├── layout.tsx            # Layout compartilhado: Sidebar + auth check
│   │   ├── page.tsx              # Dashboard (home)
│   │   ├── admin/page.tsx        # Painel admin
│   │   ├── profile/page.tsx      # Perfil do usuário
│   │   └── session/[id]/page.tsx # Detalhe da sessão
│   ├── api/                      # 23 API endpoints
│   ├── layout.tsx                # Root layout (font, theme script)
│   └── globals.css               # Design system com CSS variables + dark mode
├── features/                     # Domínios de negócio
│   ├── auth/lib/                 # Autenticação (NextAuth config)
│   ├── sessions/                 # Sessões e presença
│   │   ├── components/           # AttendanceSection, ProtectedDocuments, SessionCard, AddToCalendar
│   │   └── lib/                  # attendance-sync.ts
│   ├── dashboard/components/     # DashboardCalendar
│   ├── admin/components/         # PipelineButton
│   ├── bible/                    # Textos bíblicos
│   │   ├── components/           # BibleBooksGrid
│   │   └── lib/                  # bible.ts, bible-books.ts
│   ├── pipeline/lib/             # Orquestração: ai.ts, pipeline.ts, notebooklm.ts, reading-plan-sync.ts
│   ├── zoom/lib/                 # Integração Zoom (OAuth, recordings, participants)
│   └── email/lib/                # Envio de emails (Gmail SMTP)
├── shared/                       # Código compartilhado entre features
│   ├── components/               # Sidebar e componentes compartilhados
│   │   ├── Sidebar.tsx           # Sidebar com navegação, tema e logout
│   │   └── ui/                   # Badge e componentes de UI
│   └── lib/                      # db.ts, storage.ts, utils.ts
└── middleware.ts                 # Middleware de autenticação
```
- CSS em `src/app/globals.css` — Design system com CSS custom properties (:root + [data-theme="dark"])
- ATENÇÃO: NÃO usar `@theme` inline do Tailwind v4 — apenas CSS custom properties padrão
- Dark mode: `data-theme="dark"` no `<html>`, salvo em localStorage como `devhub-theme`
- Imports: `@/features/<feature>/lib/<module>`, `@/features/<feature>/components/<Component>`, `@/shared/lib/<module>`

## Modelos do Banco (Prisma)
- User: email, password?, name, role (ADMIN/MEMBER), church, team, subTeam, photoUrl, inviteToken
- Session: date, zoomMeetingId, zoomUuid, chapterRef, summary, contentPassword?, status, documents[], participants[]
- Participant: name, email, joinTime, leaveTime, duration (segundos)
- Document: type (TRANSCRIPT_RAW/CLEAN, BIBLE_TEXT, INFOGRAPHIC, SLIDES), fileName, storagePath
- Webhook: name, slug, active
- AppSetting: key-value (mainSpeakerName, zoomMeetingId, aiModel)

## Pipeline de Processamento
1. Webhook Zoom (`meeting.ended`) → recebe meeting_id + uuid
2. Aguarda 5min para VTT ficar pronto
3. Baixa VTT via `GET /meetings/{uuid}/recordings` (file_type=TRANSCRIPT)
4. UUID com `/` ou `+` precisa de duplo URL-encode (%252F, %252B)
5. Processa transcrição com IA (cascata de fallbacks)
6. Busca texto bíblico NVI via API.Bible
7. Gera pesquisa teológica + Knowledge Base unificada
8. Extrai senha da transcrição (se mencionada)
9. NotebookLM: cria notebook com KB rica, gera slides + infográfico + vídeo resumo
10. Salva tudo no banco + storage local

## Cascata de IA (callAI)
OpenAI como primário (modelo configurável via admin), fallback automático para gratuitos:
1. **OpenAI** — Modelo selecionado no admin (padrão: `gpt-4.1-mini`) — `OPENAI_API_KEY`
2. Nemotron 120B (`nvidia/nemotron-3-super-120b-a12b:free`) — OpenRouter (fallback gratuito)
3. Step 3.5 Flash (`stepfun/step-3.5-flash:free`) — OpenRouter (fallback gratuito)
4. Nemotron 30B (`nvidia/nemotron-3-nano-30b-a3b:free`) — OpenRouter (fallback gratuito)
5. Gemini 2.5 Flash — Google API direta (fallback gratuito)
6. Erro com log de todas as falhas

O modelo OpenAI pode ser alterado no painel admin (aba "IA") sem necessidade de deploy.
Modelos disponíveis: gpt-4.1-mini, gpt-4.1, gpt-4.1-nano, gpt-4o, gpt-4o-mini, o4-mini, o3, o3-mini, gpt-3.5-turbo

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
