# ETAPA 2 — Core Backend: Pipeline IA, Email, Deduplicação

> **Terminal dedicado para esta etapa**
> **Duração estimada:** 3-4 dias
> **Depende de:** Etapa 1 (CONCLUÍDA)

## Contexto

A Etapa 1 já foi concluída. O schema Prisma foi atualizado com 5 novos models, enum UserRole expandido para 5 níveis, e o sistema de permissões está implementado. Rode `npx prisma generate` antes de começar para garantir que o Prisma Client está atualizado.

**Referências obrigatórias antes de começar:**
- PRD: `.context/workflow/docs/prd-devocional-hub-master-update-v2.md`
- Tech Spec: `.context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md`
- Plano completo: `.context/plans/devocional-hub-master-update-v2.md`
- CLAUDE.md na raiz do projeto (convenções obrigatórias)

## Regras Gerais

- Responder SEMPRE em português brasileiro
- NUNCA commitar credenciais reais
- CSS via CSS variables (var(--text), var(--accent), etc.)
- Imports: `@/features/<feature>/lib/<module>`, `@/shared/lib/<module>`
- O banco roda na VPS, NUNCA localmente. Para testar, use `npx prisma generate` (não `db push`)
- Usar `npm install --legacy-peer-deps` para qualquer instalação

---

## Subetapa 2.1 — Triagem Inteligente de Transcrições (F6)

### Objetivo
Criar um módulo que processa a transcrição bruta do Zoom e gera uma síntese limpa, validada teologicamente.

### Tasks

1. **Criar `src/features/pipeline/lib/transcription-triage.ts`**
   - Função `triageTranscription(rawTranscript, bibleText, theologicalBase): Promise<string>`
   - Usar IA (via `callAI` existente em `ai.ts`) para:
     - REMOVER nomes pessoais (ex: "João Vitor Zanini mencionou...")
     - REMOVER referências a áudio compartilhado, música, outros idiomas
     - REMOVER comentários irrelevantes ao texto bíblico
     - CORRIGIR fatos bíblicos comprovadamente errados (com referência)
     - REMOVER informações grotescamente falsas sem base bíblica
     - MANTER interpretações espirituais, experiências pessoais, dons espirituais
     - MANTER tudo que não se pode comprovar como errado
   - Saída: síntese organizada focando na essência do que foi discutido

2. **Atualizar `src/features/pipeline/lib/pipeline.ts`**
   - Integrar `triageTranscription()` ANTES da geração da base de conhecimento
   - A transcrição triada substitui a transcrição bruta na base de conhecimento
   - Adicionar instruções de prioridade para NotebookLM:
     1o: Transcrição do Zoom (norte principal)
     2o: Texto bíblico NVI
     3o: Base teológica
   - Instruções para dar evidência ao resumo do devocional na geração de slides/infográfico/vídeo

3. **Atualizar geração da base de conhecimento**
   - O arquivo de base de conhecimento (para NotebookLM) deve ter 3 seções claras:
     - Seção 1: Texto Bíblico (NVI) — já existe
     - Seção 2: Resumo teológico — já existe
     - Seção 3: Síntese do devocional (transcrição triada) — NOVO

---

## Subetapa 2.2 — Deduplicação de Participantes + Multi-Sessão (F7, F8)

### Objetivo
Eliminar duplicatas de participantes Zoom, criar log de entradas/saídas, e detectar quando um capítulo é discutido em múltiplas sessões.

### Tasks

1. **Atualizar `src/features/sessions/lib/attendance-sync.ts`**
   - Implementar deduplicação por email (email é o identificador único, username pode mudar)
   - Para cada participante único: criar múltiplos `ParticipantEntry` (um por entrada/saída)
   - Calcular `totalDuration` como soma de todas as entries
   - Manter o nome mais completo quando houver variações

2. **Criar função `detectMultiSession()` em `pipeline.ts`**
   - Antes de criar uma nova Session: verificar se já existe card para aquele `chapterRef`
   - Analisar transcrição para sinais de continuidade:
     - Padrões: "continua(mos) amanhã", "próxima sessão", "não termina(mos)", "parte 2"
   - Retornar: `{ isMultiSession: boolean; existingSessionId?: string }`

3. **Implementar merge de transcrições**
   - Quando detectar continuidade:
     - Buscar transcrição anterior do mesmo capítulo no banco
     - Mesclar transcrições (Parte 1 + Parte 2)
     - Reaproveitar texto bíblico e teológico já gerados (economizar tokens IA)
     - Regenerar apenas a seção de síntese do devocional
   - Nomenclatura de arquivos:
     - Parcial: `{Livro} {Cap} - Parte {N} - Slides.pdf`
     - Completo: `{Livro} {Cap} - Cap Completo - Slides.pdf`
   - Ao completar: fazer upload dos novos arquivos SEM excluir os parciais

4. **Implementar update de card existente**
   - Quando `isMultiSession === true` e `existingSessionId` existe:
     - NÃO criar nova Session
     - Adicionar `relatedSessionIds` ao Session existente
     - Update do `summary` com conteúdo completo
     - Adicionar novos Documents (mantendo anteriores)
     - Recalcular participantes (merge de todas as sessões)

---

## Subetapa 2.3 — Sistema de Email Completo (F16, F17)

### Objetivo
Fazer os emails de convite funcionarem e implementar fluxo de redefinição de senha.

### O que já foi feito na Etapa 1:
- `src/features/email/lib/email.ts` — Templates profissionais (convite + reset) PRONTOS
- `src/app/api/auth/forgot-password/route.ts` — Endpoint PRONTO
- `src/app/api/auth/reset-password/route.ts` — Endpoint PRONTO
- `src/app/api/profile/password/route.ts` — Alterar senha (logado) PRONTO
- `src/app/api/profile/account/route.ts` — Soft delete LGPD PRONTO

### Tasks restantes (FRONTEND — mas se tiver tempo, pode fazer aqui)

1. **Diagnosticar envio de email**
   - Verificar configuração SMTP no código existente
   - Testar com `nodemailer` diretamente (script de teste)
   - Verificar se Gmail precisa de "App Password" ou OAuth
   - Documentar solução

2. **Criar página `/reset-password/[token]`**
   - Campos: Nova Senha, Confirmar Senha, Confirmar WhatsApp (pré-preenchido)
   - Chamar `POST /api/auth/reset-password`
   - Após sucesso: redirecionar para `/login`

3. **Atualizar tela de login** (`src/app/(auth)/login/page.tsx`)
   - Botão "Esqueci minha senha" → abre modal
   - Modal: campo de email + botão "Redefinir Senha"
   - Chamar `POST /api/auth/forgot-password`

4. **Atualizar tela de convite** (`src/app/(auth)/invite/[token]/page.tsx`)
   - Adicionar campo WhatsApp (obrigatório)

5. **Atualizar `POST /api/admin/users`**
   - Suportar criação com senha (sem envio de convite)
   - Se campos `password` + `confirmPassword` preenchidos: criar usuário direto
   - Se não: enviar convite (comportamento atual)
   - Adicionar campo `role` obrigatório
   - Adicionar campo `whatsapp` opcional

---

## Subetapa 2.4 — Integração Claude Code Max (F19)

### Objetivo
Investigar se é possível usar a assinatura Claude Code Max como provider de IA e integrar.

### Tasks

1. **Pesquisa de viabilidade**
   - A assinatura Claude Code Max é para a CLI Claude Code, não para a Anthropic API
   - Verificar: é possível usar a Anthropic API com uma API key separada?
   - Verificar: qual o custo da Anthropic API vs OpenAI?
   - Documentar findings em `.context/workflow/docs/claude-max-research.md`

2. **PONTO DE DECISÃO — PARAR E COMUNICAR AO USUÁRIO**
   - NÃO implementar nada sem aprovação
   - Apresentar opções e custos ao usuário

3. **Se aprovado: criar provider Claude em `src/features/pipeline/lib/ai.ts`**
   - Instalar `@anthropic-ai/sdk`
   - Adicionar Claude como primeiro provider na cascata
   - Modelos: `claude-sonnet-4-6` (padrão), `claude-opus-4-6`, `claude-haiku-4-5`

4. **Remover GPT-3.5-Turbo da lista de modelos**
   - No admin UI: remover da lista de seleção
   - No backend: remover da cascata

---

## Checklist de Conclusão

- [ ] Transcrição triada antes da base de conhecimento
- [ ] Participantes deduplicados por email com log de entradas/saídas
- [ ] Multi-sessão detecta continuidade e faz merge
- [ ] Nomenclatura de arquivos: Parte N / Cap Completo
- [ ] Email de convite chegando (diagnosticado e corrigido)
- [ ] Fluxo de redefinição de senha funcional
- [ ] Pesquisa Claude Max documentada
- [ ] GPT-3.5-Turbo removido
