# ETAPA 4 — Features Complexas: BACKEND

> **Terminal dedicado para o backend da Etapa 4**
> **Depende de:** Etapas 1, 2, 3 (TODAS CONCLUÍDAS)

## Contexto

As Etapas 1, 2, 3 e 5 foram concluídas. O schema Prisma está atualizado, o sistema de permissões está implementado, a triagem de transcrições funciona, a deduplicação de participantes está ativa, e o email funciona.

**Referências obrigatórias antes de começar:**
- PRD: `.context/workflow/docs/prd-devocional-hub-master-update-v2.md`
- Tech Spec: `.context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md`
- Plano completo: `.context/plans/devocional-hub-master-update-v2.md`
- CLAUDE.md na raiz do projeto

## Regras Gerais

- Responder SEMPRE em português brasileiro
- NUNCA commitar credenciais reais
- Imports: `@/features/<feature>/lib/<module>`, `@/shared/lib/<module>`
- O banco roda na VPS, NUNCA localmente. Validar com `npx prisma generate` + `npx tsc --noEmit`
- Usar `npm install --legacy-peer-deps` para qualquer instalação
- Sistema de permissões: usar `requireRole()` e `requirePermission()` de `@/features/permissions/lib/permission-guard`
- Hierarquia de roles: `@/features/permissions/lib/role-hierarchy` (hasAccess, isAdmin, ALL_ROLES)

---

## Subetapa 4.1 — Backend do Card de Capítulo (F5) + Busca Inteligente (F4)

### Objetivo
Criar os endpoints e lógica de negócio para o card redesenhado e a busca inteligente.

### Tasks

1. **Atualizar `GET /api/sessions/[id]`**
   - Incluir `startTime` na resposta
   - Incluir `participants` com suas `entries` (ParticipantEntry) para log de entradas/saídas
   - Incluir `totalDuration` de cada participante
   - Verificar permissão para documentos:
     - Tipo `AUDIO_OVERVIEW` (vídeo): visível apenas para ADMIN+ (usar `checkPermission("document:video", userRole)`)
     - Meet ID processado: retornar apenas para ADMIN+
   - Filtrar documentos `TRANSCRIPT_RAW` e `TRANSCRIPT_CLEAN` da resposta (não exibir para o usuário)

2. **Criar `GET /api/sessions/[id]/adjacent`**
   - Retornar IDs do card anterior e próximo do MESMO livro
   - Query: buscar Sessions com mesmo prefixo de `chapterRef` (ex: "Romanos"), ordenar por `date`
   - Resposta: `{ previousId: string | null, nextId: string | null }`

3. **Gerar resumo IA baseado no arquivo de contexto (3 seções)**
   - No pipeline, após a triagem: gerar um `AI_SUMMARY` (novo DocType)
   - Usar IA para criar resumo a partir das 3 seções (bíblico, teológico, síntese do zoom)
   - Salvar como documento tipo `AI_SUMMARY` no banco
   - O card frontend vai exibir este resumo em vez do `summary` atual

4. **Criar `GET /api/search?q=keyword` — Busca inteligente (F4)**
   - Buscar em múltiplas fontes:
     - `Session.summary` — resumo da sessão
     - `Session.chapterRef` — referência do capítulo
     - `Document` (tipo `AI_SUMMARY`) — conteúdo do resumo IA
   - Usar `ILIKE` do PostgreSQL para busca case-insensitive
   - Retornar: `{ sessions: [{ id, date, chapterRef, summary, matchType }] }`
   - Limitar a 20 resultados
   - Debounce no frontend (300ms)

5. **Criar índices no banco para performance de busca**
   - Índice em `Session.chapterRef`
   - Índice em `Session.summary` (GIN para full-text se possível)
   - Adicionar no schema Prisma: `@@index([chapterRef])` e `@@index([summary])` no model Session

---

## Subetapa 4.2 — Backend do Plano de Leitura (F18)

### Objetivo
Implementar toda a lógica complexa do plano de leitura: recálculo inteligente, leitura parcial/completa, retroativo.

### Tasks

1. **Atualizar `POST /api/admin/reading-plans`**
   - Aceitar campo `skipWeekendDays` (array de números: 0=domingo, 6=sábado)
   - Verificar horários configurados (AppSetting) para cada dia da semana
   - Pular dias sem horário definido
   - Permitir criação com `startDate` no passado (retroativo)

2. **Criar `POST /api/admin/reading-plans/[id]/retroactive`**
   - Receber: `{ completedDays: [{ date: string, chapters: number[] }] }`
   - Para cada dia recebido: marcar `ReadingPlanDay.completed = true`
   - Criar `ChapterReading` para cada capítulo marcado
   - Contar dias NÃO realizados (que tinham devocionais mas não foram marcados)
   - Recalcular: avançar `endDate` pela quantidade de dias não realizados
   - Criar novos `ReadingPlanDay` para os dias adicionais
   - Retornar: `{ adjustedEndDate, skippedDays, newDaysCreated }`

3. **Criar `PATCH /api/admin/reading-plans/[id]/days/[dayId]/chapters`**
   - Receber: `{ readings: [{ chapter: number, isComplete: boolean, isPartial: boolean }] }`
   - Criar/atualizar `ChapterReading` para cada item
   - Regras de negócio:
     - Se `isPartial=true` → automaticamente `isComplete=true` (checkbox esquerda marcada)
     - Se capítulo marcado como parcial: deve reaparecer nos dias seguintes
     - Se capítulo completado (era parcial antes): incrementar `sessions` count, setar `completedAt`
     - Se todos os capítulos do dia foram completados: marcar `ReadingPlanDay.completed = true`
   - Lógica de reaparecimento de capítulo parcial:
     - Buscar o próximo `ReadingPlanDay` não completado
     - Adicionar o capítulo parcial ao campo `chapters` desse dia (se não estiver lá)

4. **Atualizar `PATCH /api/admin/reading-plans/[id]`**
   - Aceitar: `chaptersPerDay`, `startDate` (para recálculo)
   - Se `startDate` mudar: recalcular TODOS os `ReadingPlanDay`
   - Manter dias já completados (não resetar progresso)
   - Recalcular apenas dias futuros

5. **Criar lógica de preenchimento automático via transcrição**
   - No `reading-plan-sync.ts`: usar sinais de continuidade da transcrição
   - Se detectar "capítulo completo" → marcar ChapterReading como `isComplete=true, isPartial=false`
   - Se detectar "continua amanhã" → marcar ChapterReading como `isComplete=true, isPartial=true`

6. **Endpoint de horários configurados**
   - Criar `GET /api/admin/settings/schedules`
   - Retornar horários configurados para cada dia da semana (do AppSetting)
   - Para ser usado pelo frontend do calendário (saber quais dias pular)

---

## Subetapa 4.3 — Backend dos Relatórios (F11) + Pizza (F12)

### Objetivo
Criar os endpoints para os novos relatórios com filtros avançados.

### Tasks

1. **Criar `GET /api/reports/presence`**
   - Filtros: `year`, `month`, `userId`, `church`, `team`, `subTeam`, `bookCode`
   - Restrição: se usuário não é ADMIN → retornar apenas dados do próprio usuário
   - Filtro por livro: apenas livros com devocionais realizados (JOIN Session por chapterRef)
   - Resposta: `{ users: [{ id, name, photoUrl, presences, frequency, lastPresence, avgDuration }] }`

2. **Criar `GET /api/reports/frequency`**
   - Filtros: `year`, `month`, `userId`, `period` (weekly | monthly)
   - Calcular para cada período:
     - `totalDevocionais`: quantos devocionais aconteceram
     - `userPresences`: quantas vezes o usuário esteve presente
     - `frequency`: percentual (userPresences / totalDevocionais * 100)
   - Lógica para "total de devocionais":
     - Contar Sessions COMPLETED no período
   - Resposta: `{ periods: [{ label, totalDevocionais, userPresences, frequency }] }`

3. **Criar `GET /api/reports/evolution`**
   - Filtros: `year`, `userId`, `period` (weekly | monthly)
   - Retornar evolução da frequência ao longo do tempo
   - Resposta: `{ points: [{ label, frequency }] }` (para gráfico de linha)

4. **Criar `GET /api/reports/hours`**
   - Filtros: `year`, `month`, `userId`
   - Para admin: somar usando o maior tempo de permanência de cada sessão (não somar todos os usuários)
   - Para usuário: somar suas próprias durações
   - Resposta: `{ totalHours, totalMinutes, formattedTotal }`

5. **Criar `GET /api/reports/books-distribution`**
   - Filtros: `userId`
   - Retornar distribuição de participação por livro
   - Resposta: `{ books: [{ bookName, sessions, totalSessions, percentage }] }`
   - Para gráfico de pizza

6. **Lógica de ano dinâmico**
   - No endpoint de filtros: retornar anos disponíveis
   - Se mês atual >= 12: incluir próximo ano
   - Início: 2026

7. **Atualizar `GET /api/admin/users`**
   - Incluir `photoUrl` na resposta para exibir fotos na lista
   - Incluir `whatsapp` na resposta

---

## Subetapa 4.4 — Backend da Seção Devocional/Livros (F3)

### Objetivo
Endpoints para a seção de devocional com progresso por livro.

### Tasks

1. **Atualizar `GET /api/sessions` (ou criar endpoint dedicado)**
   - Quando filtrado por livro: retornar dados de progresso:
     - `totalChapters`: total de capítulos do livro
     - `completedChapters`: capítulos já feitos (Sessions COMPLETED com esse livro)
     - `percentage`: progresso em percentual
     - `startDate`: data da primeira sessão desse livro
     - `endDate`: data da última sessão (ou estimada)
   - Roadmap/trilha: para cada sessão do livro, retornar:
     - `date`, `chapterRef`, `participantCount`, `completed`

---

## Checklist de Conclusão

### Card (F5)
- [ ] Endpoint `/api/sessions/[id]` atualizado com entries, permissões, filtros
- [ ] Endpoint `/api/sessions/[id]/adjacent` funcional
- [ ] Resumo AI_SUMMARY sendo gerado no pipeline
- [ ] Documentos TRANSCRIPT_RAW/CLEAN filtrados da resposta

### Busca (F4)
- [ ] Endpoint `/api/search` funcional com ILIKE
- [ ] Índices criados no banco

### Plano de Leitura (F18)
- [ ] Criação com dias bloqueados (sem horário)
- [ ] Criação retroativa com recálculo
- [ ] ChapterReading com parcial/completo
- [ ] Reaparecimento de capítulo parcial
- [ ] Preenchimento automático via transcrição

### Relatórios (F11, F12)
- [ ] 5 novos endpoints de relatórios
- [ ] Filtro por livro funcional
- [ ] Restrição de acesso (usuário vê apenas seus dados)
- [ ] Ano dinâmico
- [ ] Distribuição por livro (pizza)

### Devocional (F3)
- [ ] Progresso por livro com percentual
- [ ] Roadmap com dados por sessão
