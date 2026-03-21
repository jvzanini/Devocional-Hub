# ETAPA 6 — Polimento: Responsividade, Dark Mode, Performance, Correções

> **Terminal dedicado para esta etapa**
> **Depende de:** Etapas 1-5 (TODAS CONCLUÍDAS)

## Contexto

Todas as features foram implementadas. Esta etapa foca em:
1. Corrigir itens pendentes da Etapa 4
2. Garantir responsividade total (REGRA ABSOLUTA)
3. Corrigir dark mode em todos os componentes novos
4. Otimizar performance
5. Auditoria de segurança

**Referências obrigatórias antes de começar:**
- PRD: `.context/workflow/docs/prd-devocional-hub-master-update-v2.md`
- Tech Spec: `.context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md`
- CLAUDE.md na raiz do projeto

## Regras Gerais

- Responder SEMPRE em português brasileiro
- CSS via CSS variables: `var(--text)`, `var(--accent)`, `var(--surface)`, `var(--bg)`
- NUNCA usar `@theme` inline do Tailwind v4
- Dark mode: `[data-theme="dark"]` — TESTAR SEMPRE
- O banco roda na VPS, NUNCA localmente. Validar com `npx prisma generate` + `npx tsc --noEmit`

---

## Subetapa 6.0 — Correções Pendentes da Etapa 4

### Objetivo
Corrigir os 3 itens que ficaram pendentes da implementação frontend.

### Tasks

1. **Modal obrigatório para criação retroativa (F18)**
   - Arquivo: `src/app/(dashboard)/admin/page.tsx` (seção reading plans)
   - Após criar plano com datas passadas (startDate <= hoje):
     - Detectar: `selectedDates.some(d => d <= todayStr)`
     - Abrir modal automaticamente listando todos os dias retroativos
     - Para cada dia: exibir `ChapterChecklist` (já existe o componente)
     - Botão "Salvar": chamar `POST /api/admin/reading-plans/[id]/retroactive` (endpoint já existe)
     - Recalcular datas futuras baseado nos dias não realizados
   - Modal não pode ser fechado sem salvar (é obrigatório)

2. **Pop-up para definir horário de dia bloqueado (F18)**
   - Arquivo: `src/app/(dashboard)/admin/page.tsx` (calendário do reading plan)
   - Ao clicar em um dia que está bloqueado (sem horário definido):
     - Abrir pop-up pequeno: "Defina o horário para {dia da semana}"
     - Campo de horário (input type="time")
     - Botão "Salvar" → salvar em AppSetting via `POST /api/admin/settings`
     - Após salvar: desbloquear o dia e permitir seleção
   - Buscar dias bloqueados via `GET /api/admin/settings/schedules` (endpoint já existe)

3. **Rotação de dias selecionados (F18)**
   - Arquivo: `src/app/(dashboard)/admin/page.tsx` (calendário do reading plan)
   - Total de dias necessários = `ceil(totalChapters / chaptersPerDay)`
   - Se o usuário clicar em um dia APÓS o último dia selecionado quando já atingiu o máximo:
     - Remover o PRIMEIRO dia selecionado
     - Adicionar o novo dia no final
     - Manter sempre o número exato de dias
   - Se clicar em dia já selecionado: remover da seleção (toggle)

---

## Subetapa 6.1 — Responsividade Total (F22)

### Objetivo
Auditar TODAS as páginas e garantir funcionamento perfeito em mobile.

### Tasks

1. **Auditar dashboard (`/`)**
   - Testar em 375px, 390px, 414px, 768px
   - Verificar: stats cards, banner de leitura, gráfico de pizza, calendário
   - Corrigir elementos fora das margens
   - Textos cortados → wrap ou truncate

2. **Auditar sessão detail (`/session/[id]`)**
   - Layout vertical deve funcionar em mobile
   - ParticipantLog: scroll horizontal se necessário
   - Navegação anterior/próximo: botões lado a lado em mobile
   - Arquivos: nome truncado com ellipsis

3. **Auditar devocional (`/books`)**
   - Sidebar de livros: em mobile, virar dropdown ou accordion
   - Cards de sessão: stack vertical em mobile
   - Barra de busca: full width
   - Roadmap/trilha: scroll horizontal ou vertical

4. **Auditar relatórios (`/reports`)**
   - Gráficos (barras, linha): ResponsiveContainer funcional
   - Filtros: stack vertical em mobile
   - Tabela: scroll horizontal (`overflow-x: auto`)
   - Toggle semanal/mensal/anual: botões menores em mobile

5. **Auditar admin (`/admin`)**
   - Abas: scroll horizontal se necessário em mobile
   - Formulários: inputs full width
   - Calendário do reading plan: fontes ajustadas
   - Tabela de usuários: scroll horizontal
   - Seção de permissões: dropdowns full width

6. **Auditar perfil (`/profile`)**
   - Foto: centralizada em mobile
   - Campos: stack vertical
   - Botões: full width em mobile

7. **Auditar planejamento (`/planning`)**
   - Cards de planejamento: full width em mobile
   - Links de estudo: quebrar linhas longas
   - Imagens: max-width 100%

8. **Bíblia interativa (bubble)**
   - Mobile: fullscreen com X para fechar (verificar se funciona)
   - Seletores: touch-friendly (min 44px height)
   - Player: botões grandes o suficiente para toque
   - Texto: font-size >= 16px em mobile

9. **Sidebar mobile**
   - Hamburger menu funcional
   - Overlay scrim ao abrir
   - Slide-in suave
   - Fechar via X E clique fora
   - Fontes e espaçamento adequados

10. **Modais responsivos**
    - TODOS os modais: fullscreen em mobile (<768px)
    - Botão X visível para fechar
    - Scroll interno quando conteúdo excede tela
    - ChapterChecklist modal: funcional em mobile

---

## Subetapa 6.2 — Dark Mode & Visual Polish

### Tasks

1. **Auditar componentes novos no dark mode**
   - BibleBubble + BibleModal + seletores + player
   - PlanningCard + PlanningPage
   - ChapterChecklist
   - ParticipantLog
   - SessionNavigation
   - BooksDistributionChart (pizza)
   - Gráfico de linha nos relatórios
   - Novos modais (retroativo, horário, senha)

2. **Verificar contrastes**
   - Texto sobre fundos: mínimo 4.5:1 (WCAG AA)
   - Botões: texto legível sobre accent
   - Badges: texto legível sobre background

3. **Componentes customizados**
   - ChapterChecklist: visual premium em ambos os temas
   - Seletores da Bíblia: consistência com paleta
   - Modais: backdrop correto em dark mode

4. **Animações**
   - Hover effects suaves em botões e cards
   - Transições ao abrir/fechar modais
   - Loading skeletons com animação pulse

---

## Subetapa 6.3 — Performance

### Tasks

1. **Lazy loading da Bíblia interativa**
   - `BibleBubble` → `dynamic(() => import(...), { ssr: false })`
   - Não carregar código da Bíblia se o usuário nunca abrir

2. **Skeleton loading**
   - Cards de sessão: skeleton enquanto carrega
   - Gráficos de relatório: skeleton
   - Conteúdo bíblico: skeleton (já implementado na Etapa 5)
   - Cards de planejamento: skeleton

3. **Cache**
   - Versões da Bíblia: cache em memória (já implementado - 24h TTL)
   - Conteúdo bíblico: verificar se cache server-side funciona
   - Dados de relatório: SWR ou cache por sessão

4. **Debounce**
   - Busca inteligente: 300ms (já implementado)
   - Filtros de relatório: 200ms ao digitar

5. **Compressão de imagens**
   - Verificar se fotos de perfil são comprimidas corretamente (sharp)
   - Thumbnails 64x64 para listas

---

## Subetapa 6.4 — Segurança

### Tasks

1. **Auditar TODOS os endpoints**
   - Verificar que cada endpoint usa `requireRole()` ou `requirePermission()`
   - Endpoints admin: requerem ADMIN+
   - Endpoints de perfil: verificam que userId === session.userId
   - Endpoints de relatório: filtram dados por role

2. **Validar uploads**
   - Fotos de perfil: MIME type, tamanho max 5MB
   - Sanitização de nomes de arquivo
   - Não permitir extensões perigosas (.exe, .sh, etc.)

3. **LGPD**
   - Soft delete correto: manter apenas dados mínimos
   - Verificar que `deleteUserPhotos()` é chamado no soft delete
   - Dados de backup: apenas email, nome, igreja, WhatsApp

4. **Token de redefinição**
   - Verificar expiração (1h)
   - Verificar uso único (usedAt)
   - Invalidar tokens anteriores ao criar novo

5. **API.Bible key**
   - Verificar que NÃO está exposta no client-side
   - Todas as chamadas passam pelo servidor (proxy endpoints)

---

## Subetapa 6.5 — CSS Classes em globals.css

### Tasks

1. **Verificar classes faltantes**
   - `.chapter-checklist-*` — adicionar se ChapterChecklist usa inline styles
   - `.reading-plan-*` — adicionar se necessário
   - `.participant-log-*` — adicionar se necessário
   - `.session-nav-*` — adicionar se necessário

2. **Padronizar**
   - Todos os novos componentes devem usar CSS variables
   - Cores NUNCA hardcoded (exceto em `globals.css`)
   - Verificar que nenhum componente usa cores hexadecimais diretas

---

## Checklist de Conclusão

### Correções Etapa 4
- [ ] Modal retroativo obrigatório funcional
- [ ] Pop-up de horário para dia bloqueado funcional
- [ ] Rotação de dias selecionados funcional

### Responsividade
- [ ] Dashboard responsivo (375px-1440px)
- [ ] Sessão detail responsivo
- [ ] Devocional/livros responsivo
- [ ] Relatórios responsivo
- [ ] Admin panel responsivo
- [ ] Perfil responsivo
- [ ] Planejamento responsivo
- [ ] Bíblia interativa: fullscreen mobile com X
- [ ] Sidebar mobile funcional
- [ ] TODOS os modais fullscreen em mobile

### Dark Mode
- [ ] Todos os componentes novos testados em dark mode
- [ ] Contrastes WCAG AA
- [ ] Nenhum ícone invisível

### Performance
- [ ] Bíblia lazy loaded
- [ ] Skeletons nos carregamentos principais
- [ ] Cache funcional

### Segurança
- [ ] Todos os endpoints com verificação de role
- [ ] Uploads validados
- [ ] LGPD soft delete correto
- [ ] Tokens de reset com expiração
- [ ] API.Bible key não exposta no client
