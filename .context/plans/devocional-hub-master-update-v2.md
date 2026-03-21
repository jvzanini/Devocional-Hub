---
status: filled
progress: 100
generated: 2026-03-20
agents:
  - type: "architect-specialist"
    role: "Definir arquitetura de permissões, schema do banco, estrutura de componentes e integração de APIs"
  - type: "frontend-specialist"
    role: "Implementar UI/UX: sidebar, calendário, cards, modais, responsividade, componentes customizados"
  - type: "feature-developer"
    role: "Implementar lógica de negócio: pipeline IA, deduplicação, plano de leitura, email, busca"
  - type: "security-auditor"
    role: "Auditoria de permissões, LGPD compliance, validação de uploads, segurança de endpoints"
  - type: "code-reviewer"
    role: "Revisão de qualidade, consistência, padrões de código, performance"
  - type: "documentation-writer"
    role: "Documentar mudanças, atualizar CLAUDE.md, schema, endpoints"
  - type: "performance-optimizer"
    role: "Otimizar carregamento, cache, lazy loading, compressão de imagens"
  - type: "devops-specialist"
    role: "Ajustar Docker, volumes persistentes, CI/CD, cron jobs"
docs:
  - "prd-devocional-hub-master-update-v2.md"
  - "tech-spec-devocional-hub-master-update-v2.md"
phases:
  - id: "etapa-1"
    name: "Fundação — Schema, Permissões & Infraestrutura"
    prevc: "C"
    agent: "architect-specialist"
  - id: "etapa-2"
    name: "Core Backend — Pipeline IA, Email, Deduplicação"
    prevc: "C"
    agent: "feature-developer"
  - id: "etapa-3"
    name: "Core Frontend — Sidebar, Calendário, Admin Panel"
    prevc: "C"
    agent: "frontend-specialist"
  - id: "etapa-4"
    name: "Features Complexas — Cards, Plano de Leitura, Relatórios"
    prevc: "C"
    agent: "feature-developer"
  - id: "etapa-5"
    name: "Novas Funcionalidades — Bíblia Interativa, Planejamento"
    prevc: "C"
    agent: "feature-developer"
  - id: "etapa-6"
    name: "Polimento — Responsividade, Dark Mode, Performance"
    prevc: "C"
    agent: "frontend-specialist"
  - id: "etapa-7"
    name: "Validação & Deploy"
    prevc: "C"
    agent: "devops-specialist"
lastUpdated: "2026-03-21T00:34:30.473Z"
---

# DevocionalHub Master Update v2 — Plano de Execução Completo

> Atualização master da plataforma DevocionalHub: 22 features, 8 tracks de desenvolvimento, 7 etapas de execução, organizado para desenvolvimento paralelo com multiagentes.

## Task Snapshot
- **Primary goal:** Transformar o DevocionalHub de ferramenta funcional em plataforma profissional completa com 22 novas features, sistema de permissões multi-nível, Bíblia interativa, módulo de planejamento teológico, e responsividade total.
- **Success signal:** Todas as 22 features implementadas, zero bugs críticos, 100% responsivo, emails funcionais, permissões corretas, deploy bem-sucedido em produção.
- **Key references:**
  - [PRD Completo](../workflow/docs/prd-devocional-hub-master-update-v2.md)
  - [Tech Spec](../workflow/docs/tech-spec-devocional-hub-master-update-v2.md)

## Codebase Context
- **Stack:** Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4 + Prisma 5 + PostgreSQL
- **Infraestrutura:** Docker Swarm + Portainer + Traefik + GitHub Actions
- **Integrações:** Zoom API, OpenAI, OpenRouter, Gemini, NotebookLM (Playwright), API.Bible, Gmail SMTP
- **Banco de dados:** 10 models Prisma (User, Session, Participant, Document, Attendance, ReadingPlan, etc.)
- **Endpoints:** 23 API routes REST
- **Design System:** CSS variables + dark mode em globals.css

## Catálogo de Features (22 Features / 8 Tracks)

### Track A: Sistema de Permissões & Autenticação
| ID | Feature | Prioridade | Etapa |
|----|---------|-----------|-------|
| F13 | Sistema de Permissões Multi-Nível | CRÍTICA | 1 |
| F16 | Sistema de Email Completo | ALTA | 2 |
| F17 | Cadastro Manual de Usuário | ALTA | 2 |
| F10 | Perfil de Usuário Redesign | ALTA | 3-4 |

### Track B: Pipeline & IA
| ID | Feature | Prioridade | Etapa |
|----|---------|-----------|-------|
| F6 | Triagem Inteligente de Transcrições | CRÍTICA | 2 |
| F8 | Inteligência Capítulos Multi-Sessão | ALTA | 2 |
| F19 | Integração Claude Code Max | ALTA | 2 |
| F7 | Deduplicação Participantes Zoom | ALTA | 2 |

### Track C: UI/UX Core
| ID | Feature | Prioridade | Etapa |
|----|---------|-----------|-------|
| F1 | Calendário Redesign | MÉDIA | 3 |
| F2 | Banner de Leitura | MÉDIA | 3 |
| F9 | Sidebar Redesign | MÉDIA | 3 |
| F22 | Responsividade Total | CRÍTICA | 6 |

### Track D: Cards & Busca
| ID | Feature | Prioridade | Etapa |
|----|---------|-----------|-------|
| F5 | Card de Capítulo Redesign | ALTA | 4 |
| F4 | Busca Inteligente | MÉDIA | 4 |

### Track E: Plano de Leitura
| ID | Feature | Prioridade | Etapa |
|----|---------|-----------|-------|
| F18 | Plano de Leitura Redesign | CRÍTICA | 4 |

### Track F: Relatórios & Analytics
| ID | Feature | Prioridade | Etapa |
|----|---------|-----------|-------|
| F11 | Relatórios Redesign | ALTA | 4 |
| F12 | Gráfico de Pizza | MÉDIA | 4 |

### Track G: Novas Funcionalidades
| ID | Feature | Prioridade | Etapa |
|----|---------|-----------|-------|
| F20 | Módulo Planejamento | ALTA | 5 |
| F21 | Bíblia Interativa (Bubble) | ALTA | 5 |

### Track H: Admin Panel
| ID | Feature | Prioridade | Etapa |
|----|---------|-----------|-------|
| F3 | Seção Devocional/Livros | MÉDIA | 4 |
| F14 | Admin Zoom Config | BAIXA | 3 |
| F15 | Admin Usuários Redesign | ALTA | 3-4 |

## Agent Lineup
| Agent | Role | Foco Principal |
| --- | --- | --- |
| Architect Specialist | Definir schema, estrutura, integração de APIs | Etapas 1-2: Foundation |
| Frontend Specialist | UI/UX, componentes customizados, responsividade | Etapas 3-6: Visual |
| Feature Developer | Lógica de negócio, pipeline IA, APIs, algoritmos | Etapas 2-5: Backend |
| Security Auditor | Permissões, LGPD, validação, segurança | Etapas 1, 6: Segurança |
| Code Reviewer | Qualidade, consistência, padrões | Todas as etapas |
| Documentation Writer | Documentação, CLAUDE.md, schema | Etapa 7: Finalização |
| Performance Optimizer | Cache, lazy loading, compressão, otimização | Etapa 6: Polimento |
| DevOps Specialist | Docker, volumes, CI/CD, cron jobs | Etapas 1, 7: Infra |

## Risk Assessment

### Identified Risks
| Risk | Probabilidade | Impacto | Mitigação | Agent |
| --- | --- | --- | --- | --- |
| Claude Code Max inviável como provider IA | Média | Alto | Manter OpenAI como fallback, pesquisar ANTES de implementar | `architect-specialist` |
| API.Bible rate limits / versões sem áudio | Média | Médio | Cache agressivo, fallback bolls.life, allowlist de versões | `feature-developer` |
| Foto de perfil quebra após deploy (novamente) | Alta | Baixo | Volume Docker persistente, testes de persistência | `devops-specialist` |
| NotebookLM automation frágil (Playwright) | Alta | Alto | Retry, fallback manual, monitoramento | `feature-developer` |
| Complexidade da F18 (Plano de Leitura) | Alta | Alto | Dividir em sub-tasks menores, testar cada algoritmo | `feature-developer` |
| Emails não entregues (spam/bounce) | Média | Alto | Testar com múltiplos provedores, SPF/DKIM/DMARC | `devops-specialist` |
| Performance com muitos participantes | Baixa | Médio | Paginação, indexação no banco | `performance-optimizer` |
| Geração de imagens por IA | Alta | Baixo | NÃO decidir sozinho, comunicar ao usuário | `architect-specialist` |

### Dependencies
- **Internas:** Schema migration (Etapa 1) bloqueia Etapas 2-5
- **Externas:** API.Bible (F21), Anthropic API (F19), Gmail SMTP (F16)
- **Técnicas:** Volume Docker persistente para fotos, cron jobs para planejamento

### Assumptions
- API.Bible possui versões em português com áudio disponível
- Claude Code Max permite uso programático via Anthropic API
- Gmail SMTP funciona sem limitações significativas para volume esperado
- Estrutura de CSS variables em globals.css é mantida (não migrar para outro sistema)

---

## ETAPAS DE EXECUÇÃO

---

### ETAPA 1 — Fundação: Schema, Permissões & Infraestrutura
> **Duração estimada:** 2-3 dias
> **Paralelismo:** Subetapas 1.1, 1.2, 1.3 podem rodar em PARALELO

**Objetivo:** Estabelecer a base de dados, sistema de permissões e infraestrutura necessários para todas as features subsequentes.

**Dependências:** Nenhuma (primeira etapa)
**Bloqueia:** Etapas 2, 3, 4, 5

---

#### Subetapa 1.1 — Migração do Schema do Banco de Dados

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 1.1.1 | Alterar enum `UserRole`: adicionar SUPER_ADMIN, SUBSCRIBER_VIP, SUBSCRIBER; migrar ADMIN→SUPER_ADMIN | `architect-specialist` | pending | `prisma/schema.prisma` atualizado |
| 1.1.2 | Adicionar campos `whatsapp`, `deletedAt`, `deletedBy` ao model User | `architect-specialist` | pending | Schema atualizado |
| 1.1.3 | Criar model `Permission` (resource + minRole) | `architect-specialist` | pending | Novo model no schema |
| 1.1.4 | Criar model `PasswordResetToken` (userId, token, expiresAt, usedAt) | `architect-specialist` | pending | Novo model no schema |
| 1.1.5 | Criar model `ParticipantEntry` (joinTime, leaveTime, duration) + relação com Participant | `architect-specialist` | pending | Novo model no schema |
| 1.1.6 | Alterar Participant: adicionar campo `totalDuration`, relação com ParticipantEntry | `architect-specialist` | pending | Schema atualizado |
| 1.1.7 | Criar model `ChapterReading` (dayId, chapter, isComplete, isPartial, sessions, completedAt) | `architect-specialist` | pending | Novo model no schema |
| 1.1.8 | Alterar ReadingPlanDay: relação com ChapterReading | `architect-specialist` | pending | Schema atualizado |
| 1.1.9 | Alterar Session: adicionar `startTime`, `relatedSessionIds` | `architect-specialist` | pending | Schema atualizado |
| 1.1.10 | Alterar enum DocType: adicionar AI_SUMMARY, PLANNING | `architect-specialist` | pending | Schema atualizado |
| 1.1.11 | Criar model `PlanningCard` (planId, bookName, chapter, analysis, references, studyLinks, imageUrls, themeGroup) | `architect-specialist` | pending | Novo model no schema |
| 1.1.12 | Gerar e testar migração Prisma (`npx prisma db push`) | `architect-specialist` | pending | Migração aplicada sem erros |
| 1.1.13 | Criar script de migração de dados: ADMIN → SUPER_ADMIN para usuários existentes | `feature-developer` | pending | Script SQL/seed |

---

#### Subetapa 1.2 — Sistema de Permissões (Backend)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 1.2.1 | Criar `src/features/permissions/lib/role-hierarchy.ts`: hierarquia numérica (SUPER_ADMIN:100 → MEMBER:20) | `architect-specialist` | pending | Módulo funcional |
| 1.2.2 | Criar `src/features/permissions/lib/permission-guard.ts`: middleware de verificação de acesso por recurso | `architect-specialist` | pending | Middleware funcional |
| 1.2.3 | Criar `GET /api/admin/permissions`: listar permissões configuradas | `feature-developer` | pending | Endpoint funcional |
| 1.2.4 | Criar `PATCH /api/admin/permissions`: atualizar permissões em batch | `feature-developer` | pending | Endpoint funcional |
| 1.2.5 | Seed de permissões padrão: documento:video→ADMIN, menu:planning→ADMIN | `feature-developer` | pending | Seed aplicado |
| 1.2.6 | Atualizar middleware de autenticação (`src/middleware.ts`): incluir role no token JWT | `security-auditor` | pending | Middleware atualizado |
| 1.2.7 | Atualizar callbacks NextAuth: incluir `role` no session/token | `security-auditor` | pending | Auth atualizado |
| 1.2.8 | Auditar TODOS os endpoints existentes: aplicar verificação de role | `security-auditor` | pending | Relatório de auditoria |

---

#### Subetapa 1.3 — Infraestrutura Docker & Storage

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 1.3.1 | Configurar volume Docker persistente para `/data/user-photos/` | `devops-specialist` | pending | Volume configurado no stack YAML |
| 1.3.2 | Instalar `sharp` como dependência para compressão de imagens | `devops-specialist` | pending | package.json atualizado |
| 1.3.3 | Criar utilitário de compressão de imagem: `src/shared/lib/image-utils.ts` (resize, compress, thumbnail) | `feature-developer` | pending | Módulo funcional |
| 1.3.4 | Verificar configuração de SMTP para envio de emails (diagnosticar por que não funciona) | `devops-specialist` | pending | Diagnóstico completo |

**Commit Checkpoint Etapa 1:**
```
git commit -m "feat(schema): migração completa do banco + sistema de permissões multi-nível + infra storage"
```

---

### ETAPA 2 — Core Backend: Pipeline IA, Email, Deduplicação
> **Duração estimada:** 3-4 dias
> **Paralelismo:** Subetapas 2.1, 2.2, 2.3, 2.4 podem rodar em PARALELO
> **Depende de:** Etapa 1 (schema + permissões)

**Objetivo:** Implementar toda a lógica de negócio do backend: triagem de transcrições, deduplicação, multi-sessão, email e integração IA.

---

#### Subetapa 2.1 — Triagem Inteligente de Transcrições (F6)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 2.1.1 | Criar `src/features/pipeline/lib/transcription-triage.ts`: módulo de triagem | `feature-developer` | pending | Módulo funcional |
| 2.1.2 | Implementar remoção de nomes pessoais (regex + NER via IA) | `feature-developer` | pending | Função testada |
| 2.1.3 | Implementar remoção de referências a áudio/música/idiomas | `feature-developer` | pending | Função testada |
| 2.1.4 | Implementar validação teológica: prompt IA para cruzar transcrição vs Bíblia vs base teológica | `feature-developer` | pending | Prompt otimizado |
| 2.1.5 | Implementar regras de corte: fatos errados → corrigir, grotesco → remover, interpretação → manter | `feature-developer` | pending | Lógica implementada |
| 2.1.6 | Atualizar `pipeline.ts`: integrar triagem antes da geração da base de conhecimento | `feature-developer` | pending | Pipeline atualizado |
| 2.1.7 | Atualizar instruções da base de conhecimento: prioridade transcrição > bíblia > teológica | `feature-developer` | pending | Instruções atualizadas |
| 2.1.8 | Adicionar instruções para NotebookLM: dar evidência ao resumo do devocional na geração de slides/infográfico/vídeo | `feature-developer` | pending | Instruções adicionadas |

---

#### Subetapa 2.2 — Deduplicação de Participantes + Multi-Sessão (F7, F8)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 2.2.1 | Criar algoritmo de deduplicação por email em `attendance-sync.ts` | `feature-developer` | pending | Função testada |
| 2.2.2 | Implementar criação de `ParticipantEntry` para cada entrada/saída do Zoom | `feature-developer` | pending | Persistência funcional |
| 2.2.3 | Implementar cálculo de `totalDuration` (somatório de entries) | `feature-developer` | pending | Cálculo correto |
| 2.2.4 | Criar `detectMultiSession()`: verificar se capítulo já existe + analisar sinais de continuidade na transcrição | `feature-developer` | pending | Função testada |
| 2.2.5 | Implementar merge de transcrições: buscar transcrições anteriores do mesmo capítulo e mesclar | `feature-developer` | pending | Merge funcional |
| 2.2.6 | Implementar nomenclatura de arquivos: Parte 1/2/N e Cap Completo | `feature-developer` | pending | Nomenclatura correta |
| 2.2.7 | Implementar update de card existente (não duplicar): adicionar novos documentos mantendo anteriores | `feature-developer` | pending | Update sem perda |

---

#### Subetapa 2.3 — Sistema de Email Completo (F16, F17)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 2.3.1 | Diagnosticar e corrigir envio de email via Gmail SMTP (F16 fix) | `feature-developer` | pending | Emails sendo enviados |
| 2.3.2 | Criar template HTML de convite: branding DevocionalHub, botão, link, expiração 7 dias | `frontend-specialist` | pending | Template funcional |
| 2.3.3 | Criar template HTML de redefinição de senha: branding, botão, link, expiração 1h | `frontend-specialist` | pending | Template funcional |
| 2.3.4 | Criar `POST /api/auth/forgot-password`: enviar email de redefinição | `feature-developer` | pending | Endpoint funcional |
| 2.3.5 | Criar `POST /api/auth/reset-password`: redefinir senha com token | `feature-developer` | pending | Endpoint funcional |
| 2.3.6 | Criar tela de redefinição de senha: `/reset-password/[token]` (campos: Nova Senha, Confirmar Senha, Confirmar WhatsApp) | `frontend-specialist` | pending | Página funcional |
| 2.3.7 | Fix tela de login: botão "Esqueci minha senha" → abre modal para confirmar email | `frontend-specialist` | pending | Fluxo funcional |
| 2.3.8 | Atualizar tela de convite `/invite/[token]`: adicionar campo WhatsApp obrigatório | `frontend-specialist` | pending | Campo obrigatório |
| 2.3.9 | Criar campo "Criar Senha" + "Confirmar Senha" na criação de usuário admin | `frontend-specialist` | pending | Campos funcionais |
| 2.3.10 | Implementar lógica: se senha preenchida → botão muda para "Criar Usuário" | `frontend-specialist` | pending | Comportamento dinâmico |
| 2.3.11 | Adicionar campo WhatsApp na criação de usuário admin | `frontend-specialist` | pending | Campo no formulário |
| 2.3.12 | Adicionar campo nível de acesso (dropdown 5 níveis) na criação de usuário admin | `frontend-specialist` | pending | Dropdown funcional |
| 2.3.13 | Implementar `POST /api/admin/users` atualizado: suportar criação com senha OU convite | `feature-developer` | pending | Endpoint atualizado |

---

#### Subetapa 2.4 — Integração Claude Code Max (F19)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 2.4.1 | Pesquisar viabilidade: Anthropic API com assinatura Claude Code Max | `architect-specialist` | completed | claude-max-research.md |
| 2.4.2 | **DECISÃO FINAL:** Manter GPT-4.1-mini. NÃO integrar Claude API. | `architect-specialist` | completed | Opção A aprovada |
| 2.4.3 | ~~Instalar @anthropic-ai/sdk~~ | — | skipped | Não integrar |
| 2.4.4 | ~~Atualizar cascata de IA~~ | — | skipped | Manter atual |
| 2.4.5 | GPT-3.5-Turbo removido da lista de modelos | `feature-developer` | completed | Já feito |
| 2.4.6 | ~~Seletor Claude no admin~~ | — | skipped | Não integrar |

**Commit Checkpoint Etapa 2:**
```
git commit -m "feat(backend): triagem inteligente, deduplicação, multi-sessão, email funcional, integração IA"
```

---

### ETAPA 3 — Core Frontend: Sidebar, Calendário, Admin Panel
> **Duração estimada:** 3-4 dias
> **Paralelismo:** Subetapas 3.1, 3.2, 3.3, 3.4 podem rodar em PARALELO
> **Depende de:** Etapa 1 (permissões para mostrar/ocultar menus)
> **Pode rodar em paralelo com:** Etapa 2

**Objetivo:** Redesign visual da interface principal: sidebar, calendário, banner, e correções no admin panel.

---

#### Subetapa 3.1 — Sidebar Redesign (F9)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 3.1.1 | Aumentar largura da sidebar (CSS: min-width, max-width) | `frontend-specialist` | pending | Sidebar mais larga |
| 3.1.2 | Aumentar fontes e espaçamento dos itens de menu | `frontend-specialist` | pending | Fontes maiores |
| 3.1.3 | Remover menu "Meu Perfil" da sidebar | `frontend-specialist` | pending | Menu removido |
| 3.1.4 | Tornar nome/foto do usuário clicável (cursor: pointer) → navegar para /profile | `frontend-specialist` | pending | Clique funcional |
| 3.1.5 | Renomear "Livros da Bíblia" → "Devocional" | `frontend-specialist` | pending | Label atualizado |
| 3.1.6 | Renomear "Relatórios" → "Progresso" | `frontend-specialist` | pending | Label atualizado |
| 3.1.7 | Menu "Progresso" visível para TODOS os níveis de acesso | `frontend-specialist` | pending | Visibilidade universal |
| 3.1.8 | Remover menu "Presença" (redundante) | `frontend-specialist` | pending | Menu removido |
| 3.1.9 | Ajustar sidebar mobile: largura, fontes, espaçamento | `frontend-specialist` | pending | Mobile corrigido |

---

#### Subetapa 3.2 — Calendário Redesign (F1) + Banner (F2)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 3.2.1 | Criar mapa de abreviações com máximo de caracteres para todos os 66 livros | `feature-developer` | pending | Mapa completo |
| 3.2.2 | Redesign do calendário: devocionais futuros em amarelo, passados em cor escura/bordas | `frontend-specialist` | pending | Visual diferenciado |
| 3.2.3 | Destaque especial para o dia de hoje | `frontend-specialist` | pending | Dia atual destacado |
| 3.2.4 | Legendas embaixo de TODOS os dias com devocional: formato `{ABREV} {cap}` | `frontend-specialist` | pending | Legendas funcionais |
| 3.2.5 | Redesign banner de leitura: retângulo grande, barra de progresso, botão elaborado | `frontend-specialist` | pending | Banner redesenhado |
| 3.2.6 | Remover insights de IA da posição atual (mover para gráfico de pizza - F12) | `frontend-specialist` | pending | Seção limpa |

---

#### Subetapa 3.3 — Admin Panel Fixes (F14, F15 parcial)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 3.3.1 | F14: Lógica de bloqueio: campo vazio→desbloqueado, preenchido→bloqueado com lápis | `frontend-specialist` | pending | Lógica correta |
| 3.3.2 | F14: Fix ícone relógio no modo escuro (cor: var(--text)) | `frontend-specialist` | pending | Ícone visível |
| 3.3.3 | F14: Normalizar ícones de webhooks: remover contorno branco, alinhar botões | `frontend-specialist` | pending | Ícones normalizados |
| 3.3.4 | F15: Mover barra de busca para junto da lista de usuários | `frontend-specialist` | pending | Busca reposicionada |
| 3.3.5 | F15: Reduzir tamanho do botão "Enviar Convite" | `frontend-specialist` | pending | Botão menor |
| 3.3.6 | F15: Adicionar foto de perfil na lista de usuários | `frontend-specialist` | pending | Fotos visíveis |
| 3.3.7 | F15: Admin na lista: apenas botão "Editar" (sem desativar/remover) | `frontend-specialist` | pending | Botões corretos |
| 3.3.8 | F15: Campo email na edição (pré-preenchido, editável) | `frontend-specialist` | pending | Email editável |
| 3.3.9 | F15: Dropdown nível de acesso na criação E edição | `frontend-specialist` | pending | Dropdown funcional |
| 3.3.10 | F15: Campo email/username Zoom com "+" para adicionar múltiplos na criação | `frontend-specialist` | pending | UI de múltiplos items |
| 3.3.11 | Criar seção "Permissões" no admin: subseções "Arquivos do Card" e "Menus" | `frontend-specialist` | pending | UI de permissões |
| 3.3.12 | Criar menu placeholder "Assinaturas" no admin | `frontend-specialist` | pending | Menu criado |

---

#### Subetapa 3.4 — Perfil de Usuário (F10 parcial)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 3.4.1 | Implementar upload de foto com compressão (sharp): max 5MB, resize 300x300 + thumbnail 64x64 | `feature-developer` | pending | Upload funcional |
| 3.4.2 | Endpoint `POST /api/profile/photo`: upload com validação MIME + compressão | `feature-developer` | pending | Endpoint funcional |
| 3.4.3 | Fix persistência de foto: salvar em volume Docker `/data/user-photos/` | `devops-specialist` | pending | Foto persiste após deploy |
| 3.4.4 | Adicionar campo WhatsApp no perfil (editável, obrigatório) | `frontend-specialist` | pending | Campo funcional |
| 3.4.5 | Adicionar botão "Redefinir Senha" no perfil (abre modal) | `frontend-specialist` | pending | Botão funcional |
| 3.4.6 | Implementar `PATCH /api/profile/password`: alterar senha (logado) | `feature-developer` | pending | Endpoint funcional |
| 3.4.7 | Implementar botão "Apagar Conta" com confirmação em 2 etapas | `frontend-specialist` | pending | UI com confirmação |
| 3.4.8 | Implementar `DELETE /api/profile/account`: soft delete (manter email, nome, igreja, WhatsApp) | `feature-developer` | pending | Soft delete funcional |
| 3.4.9 | Exibir nível de acesso no perfil (visível, não editável) | `frontend-specialist` | pending | Badge de nível |

**Commit Checkpoint Etapa 3:**
```
git commit -m "feat(frontend): sidebar redesign, calendário com legendas, admin panel fixes, perfil com foto persistente"
```

---

### ETAPA 4 — Features Complexas: Cards, Plano de Leitura, Relatórios
> **Duração estimada:** 5-7 dias
> **Paralelismo:** Subetapas 4.1, 4.2, 4.3, 4.4 podem rodar em PARALELO
> **Depende de:** Etapas 1, 2 (schema, permissões, deduplicação, triagem)

**Objetivo:** Implementar as features mais complexas: redesign de cards, plano de leitura com leitura parcial, relatórios avançados.

---

#### Subetapa 4.1 — Card de Capítulo Redesign (F5) + Busca (F4)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 4.1.1 | Adicionar horário na data do card (ex: "20 de março de 2026, 07:00") | `frontend-specialist` | pending | Horário exibido |
| 4.1.2 | Redesign layout vertical: Data/Horário → Resumo IA → Arquivos → Participantes | `frontend-specialist` | pending | Layout vertical |
| 4.1.3 | Resumo gerado por IA: baseado no arquivo de contexto (3 seções) | `feature-developer` | pending | Resumo correto |
| 4.1.4 | Arquivos em PDF: converter saída de TXT para PDF | `feature-developer` | pending | PDFs gerados |
| 4.1.5 | Renomear "Infográfico" → "Mapa Mental" no display e nomenclatura | `frontend-specialist` | pending | Label atualizado |
| 4.1.6 | Vídeo visível APENAS para admin (verificar permissão) | `feature-developer` | pending | Permissão aplicada |
| 4.1.7 | Remover transcrição bruta e limpa da lista de arquivos visíveis | `frontend-specialist` | pending | Arquivos limpos |
| 4.1.8 | Implementar log de participantes: foto + nome + entradas/saídas + total | `frontend-specialist` | pending | Log visual |
| 4.1.9 | Criar componente `ParticipantLog.tsx`: sublinha por entrada, somatório | `frontend-specialist` | pending | Componente funcional |
| 4.1.10 | Implementar navegação anterior/próximo entre cards do mesmo livro | `frontend-specialist` | pending | Navegação funcional |
| 4.1.11 | Meet ID processado: visível apenas para admin | `frontend-specialist` | pending | Visibilidade condicional |
| 4.1.12 | F4: Criar `GET /api/search?q=keyword`: busca full-text | `feature-developer` | pending | Endpoint funcional |
| 4.1.13 | F4: Implementar barra de busca funcional na seção "Devocional" | `frontend-specialist` | pending | Busca visual |
| 4.1.14 | F4: Indexar campos relevantes no banco (summary, chapterRef) para performance | `feature-developer` | pending | Índices criados |

---

#### Subetapa 4.2 — Plano de Leitura Redesign (F18) — PARTE 1: Layout & Calendário

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 4.2.1 | Redesign layout de criação em 3 seções: livro, capítulos/dia, calendário | `frontend-specialist` | pending | Layout 3 seções |
| 4.2.2 | Calendário: fontes maiores (dias, semana, mês, números) | `frontend-specialist` | pending | Fontes grandes |
| 4.2.3 | Calendário: cores consistentes com paleta da plataforma | `frontend-specialist` | pending | Cores corrigidas |
| 4.2.4 | Calendário: animações ao interagir, hover nos quadradinhos | `frontend-specialist` | pending | Animações suaves |
| 4.2.5 | Implementar: manter seleção ao mudar capítulos/dia (recalcular sem perder data) | `feature-developer` | pending | Recálculo inteligente |
| 4.2.6 | Implementar: selecionar data anterior → recalcular como nova data de início | `feature-developer` | pending | Lógica de nova data |
| 4.2.7 | Implementar: integração com horários (pular dias sem horário definido) | `feature-developer` | pending | Pular dias bloqueados |
| 4.2.8 | Implementar: pop-up para definir horário quando clicar em dia bloqueado | `frontend-specialist` | pending | Pop-up funcional |
| 4.2.9 | Implementar: número fixo de dias selecionados (clique após último → avança; remove primeiro) | `feature-developer` | pending | Lógica de rotação |
| 4.2.10 | Barra de busca por livro na lista de planos | `frontend-specialist` | pending | Busca funcional |
| 4.2.11 | Barra de progresso com percentual visual (círculo + "13 de 20 (65%)") | `frontend-specialist` | pending | Progresso visual |
| 4.2.12 | Botão de editar plano (além do excluir): reabre tela de criação | `frontend-specialist` | pending | Botão funcional |
| 4.2.13 | Botão "Criar Plano" com visual melhorado + hover | `frontend-specialist` | pending | Botão estilizado |

---

#### Subetapa 4.3 — Plano de Leitura Redesign (F18) — PARTE 2: Checklist & Retroativo

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 4.3.1 | Criar componente customizado `ChapterChecklist.tsx` (NÃO usar lista padrão) | `frontend-specialist` | pending | Componente custom |
| 4.3.2 | Checkbox esquerda (grande): capítulo lido por completo | `frontend-specialist` | pending | UI funcional |
| 4.3.3 | Checkbox direita (pequeno): leitura parcial com legenda "Leitura Parcial" | `frontend-specialist` | pending | UI funcional |
| 4.3.4 | Regra: marcar direita → automaticamente marca esquerda | `feature-developer` | pending | Lógica implementada |
| 4.3.5 | Regra: capítulo parcial reaparece nos dias seguintes | `feature-developer` | pending | Lógica de reaparecimento |
| 4.3.6 | Regra: ao completar capítulo parcial → bloquear e exibir "{N} sessões" | `frontend-specialist` | pending | Display de sessões |
| 4.3.7 | Implementar `PATCH /api/admin/reading-plans/[id]/days/[dayId]/chapters`: marcar capítulos | `feature-developer` | pending | Endpoint funcional |
| 4.3.8 | Implementar criação retroativa: permitir datas passadas no calendário | `feature-developer` | pending | Retroativo funcional |
| 4.3.9 | Ao criar com datas retroativas: exigir checklist dos dias já realizados | `frontend-specialist` | pending | Modal de checklist |
| 4.3.10 | Recalcular datas futuras baseado nos dias não realizados (avançar N dias) | `feature-developer` | pending | Recálculo correto |
| 4.3.11 | Preenchimento automático via transcrição Zoom (detectar "continua amanhã", "capítulo completo") | `feature-developer` | pending | Auto-preenchimento |
| 4.3.12 | Modal de preenchimento manual: abrir ao clicar no dia, permitir seleção de capítulos | `frontend-specialist` | pending | Modal funcional |

---

#### Subetapa 4.4 — Relatórios Redesign (F11) + Gráfico Pizza (F12)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 4.4.1 | Ano dinâmico: começar 2026, adicionar próximo ano em dezembro | `feature-developer` | pending | Lógica de ano |
| 4.4.2 | Mover filtros para próximo do relatório (não no topo) | `frontend-specialist` | pending | Filtros reposicionados |
| 4.4.3 | Adicionar filtro por subequipe | `frontend-specialist` | pending | Filtro funcional |
| 4.4.4 | Adicionar filtro por livro (apenas livros com devocionais realizados) | `frontend-specialist` | pending | Filtro funcional |
| 4.4.5 | Restrição de acesso: usuário comum vê apenas seus dados | `feature-developer` | pending | Restrição aplicada |
| 4.4.6 | Toggle semanal/mensal no gráfico de barras (canto superior direito) | `frontend-specialist` | pending | Toggle funcional |
| 4.4.7 | Barra = total devocionais, preenchimento = presença, hover com percentual | `frontend-specialist` | pending | Gráfico informativo |
| 4.4.8 | Criar gráfico de linha: evolução de frequência ao longo do tempo | `frontend-specialist` | pending | Gráfico de linha |
| 4.4.9 | Toggle semanal/mensal no gráfico de linha | `frontend-specialist` | pending | Toggle funcional |
| 4.4.10 | Insights: "Horas de Devocional" (baseado no maior tempo por dia) | `feature-developer` | pending | Cálculo correto |
| 4.4.11 | Insights admin: "Média de Participantes" | `feature-developer` | pending | Cálculo correto |
| 4.4.12 | Detalhamento: adicionar "Tempo Médio" com ícone de relógio | `frontend-specialist` | pending | Tempo médio exibido |
| 4.4.13 | Detalhamento: botões semanal/mensal/anual (default: mensal, reset com filtro supremo) | `frontend-specialist` | pending | Toggle funcional |
| 4.4.14 | Criar `GET /api/reports/presence`: dados de presença com filtros | `feature-developer` | pending | Endpoint funcional |
| 4.4.15 | Criar `GET /api/reports/frequency`: frequência semanal/mensal | `feature-developer` | pending | Endpoint funcional |
| 4.4.16 | Criar `GET /api/reports/evolution`: evolução (gráfico de linha) | `feature-developer` | pending | Endpoint funcional |
| 4.4.17 | Criar `GET /api/reports/hours`: horas de devocional | `feature-developer` | pending | Endpoint funcional |
| 4.4.18 | F12: Gráfico de pizza no dashboard: livros que o usuário participou + aproveitamento | `frontend-specialist` | pending | Gráfico pizza |
| 4.4.19 | F12: Criar `GET /api/reports/books-distribution`: distribuição por livro | `feature-developer` | pending | Endpoint funcional |
| 4.4.20 | Avaliar botão "Exportar": dar funcionalidade (PDF/CSV) ou remover | `feature-developer` | pending | Decisão + implementação |

---

#### Subetapa 4.5 — Seção Devocional/Livros (F3)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 4.5.1 | Ao clicar no livro: exibir progresso com percentual, data início/fim | `frontend-specialist` | pending | Progresso visível |
| 4.5.2 | Checklist de capítulos realizados | `frontend-specialist` | pending | Checklist funcional |
| 4.5.3 | Roadmap/trilha: dias realizados com participantes por dia | `frontend-specialist` | pending | Trilha visual |
| 4.5.4 | Botão atalho "Abrir Bíblia" (integração com bubble F21) | `frontend-specialist` | pending | Atalho funcional |
| 4.5.5 | Menu lateral de livros: aumentar tamanho, mais elaborado | `frontend-specialist` | pending | Menu redesenhado |

**Commit Checkpoint Etapa 4:**
```
git commit -m "feat(features): cards redesign, plano de leitura completo, relatórios avançados, busca inteligente"
```

---

### ETAPA 5 — Novas Funcionalidades: Bíblia Interativa, Planejamento
> **Duração estimada:** 5-7 dias
> **Paralelismo:** Subetapas 5.1 e 5.2 podem rodar em PARALELO
> **Depende de:** Etapas 1, 2 (permissões, pipeline IA)

**Objetivo:** Implementar as duas funcionalidades completamente novas: Bíblia interativa e módulo de planejamento teológico.

---

#### Subetapa 5.1 — Bíblia Interativa (F21) — Completa

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| **SEÇÃO 9: API Layer** | | | | |
| 5.1.1 | Criar `src/features/bible-reader/lib/bible-api-client.ts`: cliente HTTP para API.Bible | `feature-developer` | pending | Cliente funcional |
| 5.1.2 | Implementar headers: api-key + fums-version=3 | `feature-developer` | pending | Headers corretos |
| 5.1.3 | Implementar funções: getBibles, getBooks, getChapters, getChapterContent, getAudio | `feature-developer` | pending | Funções testadas |
| 5.1.4 | Criar `version-discovery.ts`: descobrir versões PT com áudio, criar allowlist | `feature-developer` | pending | Discovery funcional |
| 5.1.5 | Criar endpoints: `/api/bible/versions`, `/api/bible/books/[vid]`, `/api/bible/chapters/[vid]/[bid]`, `/api/bible/content/[vid]/[cid]`, `/api/bible/audio/[vid]/[cid]` | `feature-developer` | pending | 5 endpoints |
| **SEÇÃO 8: Contexto Devocional** | | | | |
| 5.1.6 | Criar `devocional-context.ts`: resolver livro/capítulo/versão do devocional do dia | `feature-developer` | pending | Resolver funcional |
| 5.1.7 | Implementar fallback: Gênesis 1, versão NVI se contexto não disponível | `feature-developer` | pending | Fallback seguro |
| **SEÇÃO 1: Bubble** | | | | |
| 5.1.8 | Criar `BibleBubble.tsx`: ícone de Bíblia fixo, canto inferior direito, responsivo | `frontend-specialist` | pending | Bubble renderiza |
| 5.1.9 | Posicionamento inteligente: não atrapalhar CTAs, z-index correto | `frontend-specialist` | pending | Posição correta |
| 5.1.10 | Estados: hover, focus, active, animação de click | `frontend-specialist` | pending | Estados visuais |
| **SEÇÃO 2: Container** | | | | |
| 5.1.11 | Criar `BibleModal.tsx`: modal desktop (80vw x 85vh), fullscreen mobile | `frontend-specialist` | pending | Container responsivo |
| 5.1.12 | Animações de entrada/saída suaves (fade + slide) | `frontend-specialist` | pending | Animações |
| 5.1.13 | Fechamento: X (sempre), ESC (desktop), clique fora (desktop) | `frontend-specialist` | pending | Fechamento funcional |
| **SEÇÃO 3: Header** | | | | |
| 5.1.14 | Criar `BibleHeader.tsx`: versão + livro + capítulo + botões | `frontend-specialist` | pending | Header funcional |
| **SEÇÃO 4: Seletores** | | | | |
| 5.1.15 | Criar `VersionSelector.tsx`: lista customizada de versões PT com áudio | `frontend-specialist` | pending | Seletor funcional |
| 5.1.16 | Criar `BookSelector.tsx`: lista de livros com expansão (grid de capítulos) | `frontend-specialist` | pending | Seletor funcional |
| 5.1.17 | Criar `ChapterSelector.tsx`: grid de números de capítulos | `frontend-specialist` | pending | Seletor funcional |
| 5.1.18 | TODOS os seletores: HTML semântico, CSS customizado, aria labels, navegação por teclado | `frontend-specialist` | pending | Acessibilidade |
| **SEÇÃO 5: Leitura** | | | | |
| 5.1.19 | Criar `BibleContent.tsx`: versículos formatados, título destacado, scroll interno | `frontend-specialist` | pending | Leitura formatada |
| 5.1.20 | Implementar FUMS tracking (requisito API.Bible) | `feature-developer` | pending | FUMS funcional |
| **SEÇÃO 6: Navegação** | | | | |
| 5.1.21 | Criar `BibleNavigation.tsx`: botões anterior/próximo | `frontend-specialist` | pending | Navegação |
| 5.1.22 | Implementar navegação contínua entre livros (último cap livro A → primeiro cap livro B) | `feature-developer` | pending | Transição entre livros |
| 5.1.23 | Sincronizar navegação com player de áudio | `feature-developer` | pending | Sincronização |
| **SEÇÃO 7: Player** | | | | |
| 5.1.24 | Criar `AudioPlayer.tsx`: play/pause, progresso, controles | `frontend-specialist` | pending | Player visual |
| 5.1.25 | Criar `SpeedControl.tsx`: 1x, 1.25x, 1.5x, 1.75x, 2x | `frontend-specialist` | pending | Velocidade |
| 5.1.26 | Criar `audio-manager.ts`: gerenciamento de áudio, autoplay entre capítulos | `feature-developer` | pending | Autoplay funcional |
| 5.1.27 | Implementar reprodução em segundo plano (mobile): background audio | `feature-developer` | pending | Áudio background |
| 5.1.28 | Parar apenas em: pause manual, fechar modal, sair da página | `feature-developer` | pending | Regras de parada |
| **Integração final** | | | | |
| 5.1.29 | Integrar bubble no layout principal (`src/app/(dashboard)/layout.tsx`) | `frontend-specialist` | pending | Bubble global |
| 5.1.30 | Integrar com botão "Abrir Bíblia" da seção devocional (F3) | `frontend-specialist` | pending | Atalho funcional |

---

#### Subetapa 5.2 — Módulo Planejamento (F20)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 5.2.1 | Criar rota `/planning` e página `src/app/(dashboard)/planning/page.tsx` | `frontend-specialist` | pending | Rota funcional |
| 5.2.2 | Adicionar "Planejamento" no menu lateral da sidebar (com controle de permissão) | `frontend-specialist` | pending | Menu visível |
| 5.2.3 | Criar `GET /api/planning/current`: buscar plano ativo com cards | `feature-developer` | pending | Endpoint funcional |
| 5.2.4 | Criar `GET /api/planning/cards/[planId]`: listar cards de um plano | `feature-developer` | pending | Endpoint funcional |
| 5.2.5 | Criar `POST /api/planning/generate/[planId]`: gerar cards via IA | `feature-developer` | pending | Endpoint funcional |
| 5.2.6 | Criar `planning-generator.ts`: orquestração de geração de cards | `feature-developer` | pending | Gerador funcional |
| 5.2.7 | Implementar análise por capítulo: como abordar, segmentação por temas | `feature-developer` | pending | Análise completa |
| 5.2.8 | Implementar agrupamento temático (quando houver tema comum entre capítulos) | `feature-developer` | pending | Agrupamento funcional |
| 5.2.9 | Criar `reference-fetcher.ts`: buscar textos de referências bíblicas com texto completo | `feature-developer` | pending | Referências com texto |
| 5.2.10 | Implementar busca de links de estudo (pelo menos 5 por card) | `feature-developer` | pending | Links de estudo |
| 5.2.11 | **PONTO DE DECISÃO:** Geração de imagens — Sonnet pode não gerar. Comunicar ao usuário para decidir. NÃO usar API paga sem autorização | `architect-specialist` | pending | Decisão documentada |
| 5.2.12 | Implementar cron job: gerar cards à meia-noite do dia de início do plano | `feature-developer` | pending | Cron funcional |
| 5.2.13 | Criar UI de cards de planejamento: análise, referências, links, imagens | `frontend-specialist` | pending | UI completa |
| 5.2.14 | Adicionar "Planejamento" na configuração de permissões do admin | `frontend-specialist` | pending | Permissão configurável |

**Commit Checkpoint Etapa 5:**
```
git commit -m "feat(new): Bíblia interativa com player de áudio + módulo de planejamento teológico"
```

---

### ETAPA 6 — Polimento: Responsividade, Dark Mode, Performance
> **Duração estimada:** 2-3 dias
> **Paralelismo:** Subetapas 6.1, 6.2, 6.3 podem rodar em PARALELO
> **Depende de:** Etapas 3, 4, 5 (todas as features visuais implementadas)

**Objetivo:** Garantir que tudo funciona perfeitamente em mobile, dark mode, e com boa performance.

---

#### Subetapa 6.1 — Responsividade Total (F22)

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 6.1.1 | Auditar TODAS as páginas em viewport mobile (375px, 390px, 414px) | `frontend-specialist` | pending | Relatório de issues |
| 6.1.2 | Fix: elementos fora das margens em mobile | `frontend-specialist` | pending | Margens corrigidas |
| 6.1.3 | Fix: textos cortados em mobile | `frontend-specialist` | pending | Textos visíveis |
| 6.1.4 | Fix: tabelas sem scroll horizontal em mobile | `frontend-specialist` | pending | Tabelas scrolláveis |
| 6.1.5 | Bíblia interativa: bubble fullscreen em mobile, X para fechar | `frontend-specialist` | pending | Mobile corrigido |
| 6.1.6 | Todos os modais: fullscreen em mobile com X | `frontend-specialist` | pending | Modais responsivos |
| 6.1.7 | Sidebar mobile: hamburger menu, overlay, slide-in, close via X e clique fora | `frontend-specialist` | pending | Sidebar mobile |
| 6.1.8 | Testar em: iPhone SE (375px), iPhone 14 (390px), iPad (768px), Desktop (1440px) | `frontend-specialist` | pending | Testes completos |

---

#### Subetapa 6.2 — Dark Mode & Visual Polish

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 6.2.1 | Auditar TODOS os componentes novos no modo escuro | `frontend-specialist` | pending | Relatório de issues |
| 6.2.2 | Fix: ícones invisíveis no dark mode (usar var(--text)) | `frontend-specialist` | pending | Ícones corrigidos |
| 6.2.3 | Fix: contornos brancos indesejados no dark mode | `frontend-specialist` | pending | Contornos corrigidos |
| 6.2.4 | Verificar paleta de cores: todos os componentes usam CSS variables | `frontend-specialist` | pending | Cores consistentes |
| 6.2.5 | Componentes customizados (selects, checkboxes, modais): visual premium | `frontend-specialist` | pending | Visual premium |

---

#### Subetapa 6.3 — Performance & Segurança

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 6.3.1 | Lazy loading da Bíblia Interativa (code splitting) | `performance-optimizer` | pending | Bundle otimizado |
| 6.3.2 | Skeleton loading para cards, gráficos, e listas | `frontend-specialist` | pending | Skeletons |
| 6.3.3 | Cache de versões da Bíblia (memória, muda raramente) | `performance-optimizer` | pending | Cache implementado |
| 6.3.4 | Cache de conteúdo bíblico (servidor, 24h TTL) | `performance-optimizer` | pending | Cache implementado |
| 6.3.5 | Debounce na busca inteligente (300ms) | `performance-optimizer` | pending | Debounce |
| 6.3.6 | Auditar TODOS os endpoints: verificação de role aplicada | `security-auditor` | pending | Auditoria completa |
| 6.3.7 | Validar uploads: MIME type, tamanho, sanitização de nomes | `security-auditor` | pending | Validação robusta |
| 6.3.8 | Verificar LGPD: soft delete correto, dados mínimos retidos | `security-auditor` | pending | LGPD conforme |

**Commit Checkpoint Etapa 6:**
```
git commit -m "fix(polish): responsividade total, dark mode fixes, performance otimizada, segurança auditada"
```

---

### ETAPA 7 — Validação & Deploy
> **Duração estimada:** 1-2 dias
> **Paralelismo:** Subetapas 7.1 e 7.2 podem rodar em PARALELO
> **Depende de:** Todas as etapas anteriores

**Objetivo:** Testar, documentar e fazer deploy em produção.

---

#### Subetapa 7.1 — Testes & Documentação

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 7.1.1 | Testes de integração: fluxo de email (convite + redefinição) | `code-reviewer` | pending | Testes passando |
| 7.1.2 | Testes: deduplicação de participantes (cenários edge case) | `code-reviewer` | pending | Testes passando |
| 7.1.3 | Testes: hierarquia de permissões (todos os níveis) | `code-reviewer` | pending | Testes passando |
| 7.1.4 | Testes: recálculo de plano de leitura (retroativo, parcial) | `code-reviewer` | pending | Testes passando |
| 7.1.5 | Testes: API.Bible (versões, conteúdo, áudio) | `code-reviewer` | pending | Testes passando |
| 7.1.6 | Atualizar CLAUDE.md com novas rotas, models, e convenções | `documentation-writer` | pending | CLAUDE.md atualizado |
| 7.1.7 | Documentar novos endpoints de API | `documentation-writer` | pending | Docs de API |
| 7.1.8 | Documentar schema atualizado do Prisma | `documentation-writer` | pending | Schema documentado |

---

#### Subetapa 7.2 — Deploy

| # | Task | Agent | Status | Entregável |
|---|------|-------|--------|------------|
| 7.2.1 | Atualizar portainer-stack.yml: variáveis para BIBLE_API_KEY, ANTHROPIC_API_KEY (se aplicável) | `devops-specialist` | pending | Stack atualizado |
| 7.2.2 | Verificar volumes Docker persistentes para /data/user-photos/ | `devops-specialist` | pending | Volume persistente |
| 7.2.3 | Build + push para GHCR | `devops-specialist` | pending | Image publicada |
| 7.2.4 | Deploy via Portainer | `devops-specialist` | pending | Deploy concluído |
| 7.2.5 | Validar deploy: curl em endpoints críticos | `devops-specialist` | pending | Validação OK |
| 7.2.6 | Validar email: enviar convite de teste | `devops-specialist` | pending | Email chegando |
| 7.2.7 | Validar responsividade: acessar pelo celular | `devops-specialist` | pending | Mobile OK |

**Commit Checkpoint Etapa 7:**
```
git commit -m "chore(deploy): documentação atualizada, testes validados, deploy em produção"
```

---

## Diagrama de Dependências entre Etapas

```
ETAPA 1 (Fundação)
    │
    ├──→ ETAPA 2 (Backend)  ──┐
    │                          │
    ├──→ ETAPA 3 (Frontend)  ──┤──→ ETAPA 4 (Features Complexas)
    │                          │         │
    └──→ ETAPA 5 (Novas) ─────┘         │
                                          │
                               ETAPA 6 (Polimento) ←──┘
                                          │
                               ETAPA 7 (Deploy)
```

**Execução paralela possível:**
- Etapas 2 + 3 → PARALELO (após Etapa 1)
- Etapa 5 → pode iniciar após Etapas 1+2 (parcialmente paralelo com 3+4)
- Etapa 4 → pode iniciar após Etapa 1+2 (parcialmente paralelo com 3)
- Etapa 6 → após todas as features visuais (3+4+5)
- Etapa 7 → após tudo

---

## Rollback Plan

### Rollback Triggers
- Bugs críticos afetando funcionalidades existentes
- Migração de banco com perda de dados
- Emails enviados para usuários errados
- Permissões permitindo acesso indevido

### Rollback Procedures

#### Etapa 1 (Schema)
- Reverter migração Prisma
- Restaurar backup do banco
- **Impacto:** Nenhum (pré-produção)

#### Etapas 2-5 (Features)
- `git revert` dos commits de feature
- Restaurar schema anterior
- **Impacto:** Perda de features novas, dados existentes preservados

#### Etapa 7 (Deploy)
- Rollback via Portainer para versão anterior
- `DEPLOY_SHA` com commit anterior
- **Impacto:** Volta para versão pré-update, dados novos podem precisar de cleanup

### Post-Rollback
1. Documentar razão do rollback
2. Notificar stakeholders
3. Corrigir issue antes de nova tentativa
4. Testar exaustivamente antes de novo deploy

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Features totais** | 22 |
| **Tracks de desenvolvimento** | 8 |
| **Etapas de execução** | 7 |
| **Total de tasks** | ~180 |
| **Novos models no banco** | 5 (Permission, PasswordResetToken, ParticipantEntry, ChapterReading, PlanningCard) |
| **Novos endpoints de API** | ~15 |
| **Novos componentes React** | ~20 |
| **Agentes envolvidos** | 8 |
| **Estimativa total** | 20-30 dias (com paralelismo: 12-18 dias) |
| **Pontos de decisão** | 2 (Claude Code Max, Geração de Imagens) |

---

## Execution History

> Last updated: 2026-03-21T00:34:30.473Z | Progress: 100%

### etapa-1 [DONE]
- Started: 2026-03-21T00:34:24.006Z
- Completed: 2026-03-21T00:34:30.473Z

- [x] Step 1: Step 1 *(2026-03-21T00:34:24.006Z)*
  - Notes: Schema Prisma atualizado com 5 novos models (Permission, PasswordResetToken, ParticipantEntry, ChapterReading, PlanningCard), enum UserRole expandido (5 níveis), novos campos em User/Session/Participant/ReadingPlanDay/Document. Prisma generate OK.
- [x] Step 2: Step 2 *(2026-03-21T00:34:26.608Z)*
  - Notes: Sistema de permissões completo: role-hierarchy.ts (hierarquia numérica), permission-guard.ts (middleware requireRole/requirePermission), endpoints GET/PATCH /api/admin/permissions, seed com 6 permissões padrão, migração ADMIN→SUPER_ADMIN no seed.
- [x] Step 3: Step 3 *(2026-03-21T00:34:30.473Z)*
  - Notes: Sharp instalado, image-utils.ts criado (processAndSavePhoto com resize/compress para profile 300x300 e thumbnail 64x64), auth.ts atualizado (bloquear deleted/inactive), email.ts reescrito com templates profissionais (convite + reset), endpoints criados: forgot-password, reset-password, profile/password, profile/account (soft delete LGPD), middleware atualizado.
