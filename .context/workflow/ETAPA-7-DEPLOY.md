# ETAPA 7 — Validação & Deploy

> **Terminal dedicado para esta etapa (última)**
> **Depende de:** Etapas 1-6 (TODAS CONCLUÍDAS)

## Contexto

Todas as 22 features foram implementadas e polidas. Esta é a etapa final: validar, documentar e fazer deploy em produção.

**Referências:**
- CLAUDE.md na raiz do projeto (convenções, infra, deploy)
- PRD: `.context/workflow/docs/prd-devocional-hub-master-update-v2.md`
- Tech Spec: `.context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md`

## Regras Gerais

- Responder SEMPRE em português brasileiro
- NUNCA commitar credenciais reais (valores genéricos no repo, reais no Portainer)
- O banco roda na VPS, NUNCA localmente
- Build roda no CI/CD (GitHub Actions → Docker), não localmente
- Validar com `npx prisma generate` + `npx tsc --noEmit` antes de commitar
- Deploy: push para `main` → CI/CD builda → Portainer atualiza
- Container leva ~30s para reiniciar após deploy

---

## Subetapa 7.1 — Validação de Tipos e Schema

### Tasks

1. **Gerar Prisma Client e validar schema**
   ```bash
   cd devocional-hub
   npx prisma generate
   ```
   - Confirmar que gera sem erros
   - Verificar que todos os 15 models estão presentes:
     User, ZoomIdentifier, PasswordResetToken, Permission, Session, Participant, ParticipantEntry, Document, Attendance, ReadingPlan, ReadingPlanDay, ChapterReading, PlanningCard, Webhook, AppSetting

2. **Validar TypeScript**
   ```bash
   npx tsc --noEmit 2>&1 | head -50
   ```
   - Corrigir quaisquer erros de tipo
   - Ignorar warnings se não forem críticos

3. **Verificar imports quebrados**
   - Grep por `@/lib/` (path antigo — deve ser 0 resultados)
   - Grep por `@/components/` (path antigo — deve ser 0 resultados)
   - Todos os imports devem usar `@/features/`, `@/shared/`, ou pacotes npm

---

## Subetapa 7.2 — Validação de Segurança

### Tasks

1. **Verificar .gitignore**
   - `.env*` deve estar presente
   - `data/` (storage local) deve estar presente
   - `node_modules/` deve estar presente

2. **Verificar que NÃO há credenciais no código**
   - Grep por padrões de API keys:
     ```bash
     grep -rn "sk-proj-\|sk-or-v1-\|AIzaSy\|GWhLJ" src/ --include="*.ts" --include="*.tsx"
     ```
   - Resultado deve ser ZERO (credenciais devem estar APENAS no .env)

3. **Verificar portainer-stack.yml**
   - Ler o arquivo e confirmar que tem valores genéricos (YOUR_*, changeme)
   - NUNCA deve ter credenciais reais

4. **Verificar que .env NÃO será commitado**
   - Confirmar com `git status` que .env não aparece

---

## Subetapa 7.3 — Atualização do CLAUDE.md

### Tasks

1. **Revisar e atualizar CLAUDE.md completamente**
   - Seção de Build & Deploy: confirmar instrução de build local
   - Seção de Stack: incluir sharp, @anthropic-ai/sdk (se instalado)
   - Seção de Arquitetura: confirmar tree de diretórios
   - Seção de Rotas: adicionar `/planning`, `/reset-password/[token]`
   - Seção de Modelos: confirmar todos os 15 models
   - Seção de Pipeline: incluir triagem de transcrições e multi-sessão
   - Seção de Cascata de IA: confirmar GPT-4.1-mini (sem 3.5-turbo, sem Claude)
   - Seção Master Update: marcar TODAS as etapas como CONCLUÍDAS

2. **Atualizar lista de endpoints**
   - Adicionar novos endpoints criados nas Etapas 2-5:
     - `/api/auth/forgot-password`
     - `/api/auth/reset-password`
     - `/api/auth/validate-reset-token`
     - `/api/profile/password`
     - `/api/profile/account`
     - `/api/admin/permissions`
     - `/api/search`
     - `/api/sessions/[id]/adjacent`
     - `/api/admin/reading-plans/[id]/retroactive`
     - `/api/admin/reading-plans/[id]/days/[dayId]/chapters`
     - `/api/admin/settings/schedules`
     - `/api/reports/presence`
     - `/api/reports/frequency`
     - `/api/reports/evolution`
     - `/api/reports/hours`
     - `/api/reports/books-distribution`
     - `/api/bible/versions`
     - `/api/bible/context`
     - `/api/bible/books/[versionId]`
     - `/api/bible/chapters/[versionId]/[bookId]`
     - `/api/bible/content/[versionId]/[chapterId]`
     - `/api/bible/audio/[versionId]/[chapterId]`
     - `/api/planning/current`
     - `/api/planning/cards/[planId]`
     - `/api/planning/card/[cardId]`
     - `/api/planning/generate/[planId]`

---

## Subetapa 7.4 — Preparação do Deploy

### Tasks

1. **Atualizar portainer-stack.yml (se necessário)**
   - Adicionar novas variáveis de ambiente necessárias:
     - `BIBLE_API_KEY` (já deve existir)
     - Verificar se `STORAGE_PATH` inclui `/data/user-photos/`
   - Verificar que volumes Docker estão mapeados para persistência:
     - `/data` → volume persistente (fotos, documentos)
   - NUNCA colocar credenciais reais no arquivo (usar variáveis do Portainer)

2. **Verificar Dockerfile**
   - `npm install --legacy-peer-deps` (necessário)
   - `npx prisma generate` no build
   - `sharp` como dependência (verificar se compila no Docker)
   - Playwright não precisa de mudanças (já configurado)

3. **Verificar GitHub Actions workflow**
   - Confirmar que `.github/workflows/deploy.yml` faz:
     - `npm ci --legacy-peer-deps`
     - `npm run build`
     - Push para GHCR
     - Deploy via Portainer

---

## Subetapa 7.5 — Deploy em Produção

### Tasks

1. **Commit final**
   - `git add` de todos os arquivos novos e modificados
   - Mensagem: `feat(v2): Master Update v2 — 22 features, sistema de permissões, Bíblia interativa, planejamento, relatórios`
   - VERIFICAR que não há credenciais nos arquivos antes do commit

2. **Push para main**
   - `git push origin main`
   - CI/CD vai disparar automaticamente

3. **Monitorar CI/CD**
   - Acompanhar build no GitHub Actions
   - Se falhar: ler logs, corrigir, commitar novamente

4. **Validar deploy no Portainer**
   - Acessar painel.nexusai360.com
   - Verificar se stack 86 foi atualizada
   - Se container não atualizou: verificar DEPLOY_SHA no stack YAML

5. **Validar em produção**
   ```bash
   # Health check
   curl -s https://devocional.nexusai360.com/api/cron/check

   # Testar login
   curl -s https://devocional.nexusai360.com/login

   # Testar API de relatórios
   curl -s https://devocional.nexusai360.com/api/reports/presence
   ```

6. **Aplicar migração do banco na VPS**
   - Dentro do container: `npx prisma db push`
   - Isso vai criar as novas tabelas (Permission, PasswordResetToken, etc.)
   - Executar seed: `npx prisma db seed` (migra ADMIN → SUPER_ADMIN + cria permissões padrão)

7. **Validar funcionalidades críticas em produção**
   - [ ] Login funciona
   - [ ] Dashboard carrega (stats, calendário, pizza)
   - [ ] Sidebar: menus corretos, clique no nome funciona
   - [ ] Bíblia interativa: bubble aparece, modal abre, seletores funcionam
   - [ ] Relatórios: gráficos carregam, filtros funcionam
   - [ ] Admin: permissões, usuários, planos de leitura
   - [ ] Perfil: foto, WhatsApp, redefinir senha
   - [ ] Responsivo: testar pelo celular
   - [ ] Dark mode: testar toggle

8. **Testar envio de email**
   - Criar usuário de teste no admin
   - Verificar se convite chega
   - Testar "Esqueci minha senha" na tela de login

---

## Subetapa 7.6 — Documentação Final

### Tasks

1. **Atualizar o plano de execução**
   - Marcar TODAS as etapas como completed no `.context/plans/devocional-hub-master-update-v2.md`

2. **Registrar decisão sobre Claude Max**
   - Já documentado em `.context/workflow/docs/claude-max-research.md` (status: FECHADO)

3. **Registrar decisão sobre geração de imagens**
   - Documentar que DALL-E está integrado com fallback (placeholder se falhar)
   - Custo: ~$0.04/imagem

---

## Checklist Final de Conclusão

### Validação
- [ ] `npx prisma generate` sem erros
- [ ] `npx tsc --noEmit` sem erros críticos
- [ ] Zero imports antigos (`@/lib/`, `@/components/`)
- [ ] Zero credenciais no código-fonte
- [ ] .env no .gitignore

### Deploy
- [ ] Commit com mensagem descritiva
- [ ] Push para main
- [ ] CI/CD build verde
- [ ] Container atualizado no Portainer
- [ ] `prisma db push` executado na VPS
- [ ] Seed executado (migração ADMIN → SUPER_ADMIN)

### Validação em Produção
- [ ] Login funciona
- [ ] Dashboard carrega completamente
- [ ] Bíblia interativa funciona
- [ ] Relatórios com gráficos
- [ ] Admin panel com permissões
- [ ] Email de convite chega
- [ ] Responsivo no celular
- [ ] Dark mode funcional

### Métricas de Sucesso (do PRD)
- [ ] 22/22 features implementadas
- [ ] 0 bugs críticos
- [ ] 100% responsivo
- [ ] Emails entregues > 95%
