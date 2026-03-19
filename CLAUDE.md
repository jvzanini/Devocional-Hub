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
- Google Gemini API (gratuita) para processar transcrições

## Arquitetura
- API routes em `src/app/api/`
- Páginas em `src/app/`
- Libs em `src/lib/` (zoom.ts, ai.ts, bible.ts, pipeline.ts, storage.ts, email.ts, auth.ts, db.ts)
- Componentes em `src/components/`
- CSS em `src/app/globals.css` — TODAS as classes visuais são hardcoded aqui (sem CSS variables do Tailwind)

## Modelos do Banco (Prisma)
- User: email, password?, name, role (ADMIN/MEMBER), church, team, subTeam, photoUrl, inviteToken
- Session: date, zoomMeetingId, zoomUuid, chapterRef, summary, status, documents[], participants[]
- Participant: name, email, joinTime, leaveTime, duration (segundos)
- Document: type (TRANSCRIPT_RAW/CLEAN, BIBLE_TEXT, INFOGRAPHIC, SLIDES), fileName, storagePath
- Webhook: name, slug, active
- AppSetting: key-value (mainSpeakerName, zoomMeetingId)

## Pipeline de Processamento
1. Webhook Zoom (`meeting.ended`) → recebe meeting_id + uuid
2. Aguarda 5min para VTT ficar pronto
3. Baixa VTT via `GET /meetings/{uuid}/recordings` (file_type=TRANSCRIPT)
4. UUID com `/` ou `+` precisa de duplo URL-encode (%252F, %252B)
5. Processa com Gemini AI (foca no mainSpeakerName configurado no admin)
6. Busca texto bíblico NVI via API.Bible
7. Gera slides + infográfico via NotebookLM (Playwright)
8. Salva tudo no banco + storage local

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
- Variáveis usadas: ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_USER, SMTP_PASS, ZOOM_*, GEMINI_API_KEY, BIBLE_API_KEY, GOOGLE_EMAIL, GOOGLE_PASSWORD

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
