# ETAPA 4 — Features Complexas: FRONTEND

> **Terminal dedicado para o frontend da Etapa 4**
> **Depende de:** Etapas 1, 2, 3 (TODAS CONCLUÍDAS)

## Contexto

As Etapas 1, 2, 3 e 5 foram concluídas. A sidebar está redesenhada, o calendário tem legendas, o admin panel está atualizado, o perfil funciona com foto e WhatsApp, a Bíblia interativa está implementada, e o módulo de planejamento está pronto.

**Referências obrigatórias antes de começar:**
- PRD: `.context/workflow/docs/prd-devocional-hub-master-update-v2.md`
- Tech Spec: `.context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md`
- Plano completo: `.context/plans/devocional-hub-master-update-v2.md`
- CLAUDE.md na raiz do projeto

## Regras Gerais

- Responder SEMPRE em português brasileiro
- CSS via CSS variables: `var(--text)`, `var(--accent)`, `var(--surface)`, `var(--bg)`
- NUNCA usar `@theme` inline do Tailwind v4
- NUNCA usar `<select>` padrão do navegador — SEMPRE componentes customizados
- Dark mode: `[data-theme="dark"]` — TESTAR SEMPRE em ambos os temas
- Fontes GRANDES e legíveis (o usuário insiste nisso)
- Responsividade é REGRA ABSOLUTA — testar mobile (375px) e desktop (1440px)
- Classes: usar classes de `globals.css` (`.card`, `.btn-primary`, `.input-field`, etc.)
- Imports: `@/features/<feature>/components/<Component>`, `@/shared/components/<Component>`
- Permissões: usar `isAdmin()` e `hasAccess()` de `@/features/permissions/lib/role-hierarchy`

**IMPORTANTE:** O terminal de backend (ETAPA-4-BACKEND) está rodando em paralelo criando os endpoints. Se um endpoint ainda não existir quando você precisar, crie a chamada ao endpoint com os tipos esperados e continue. O backend vai criá-lo.

---

## Subetapa 4.1 — Card de Capítulo Redesign (F5) + Busca (F4)

### Arquivo principal: `src/app/(dashboard)/session/[id]/page.tsx`

### Tasks

1. **Adicionar horário na data do card**
   - Exibir: "20 de março de 2026, 07:00" (não apenas a data)
   - Usar `startTime` da Session (se disponível) ou `date` como fallback
   - Formato: `dd de MMMM de yyyy, HH:mm`

2. **Redesign do layout para vertical**
   - Ordem de cima para baixo:
     1. Data + Horário
     2. Título (Livro + Capítulo)
     3. Resumo gerado por IA (`AI_SUMMARY`)
     4. Arquivos da Sessão (PDFs)
     5. Participantes (com log de entradas/saídas)
   - NÃO ter layout lado a lado (arquivos | participantes)
   - Tudo em coluna única

3. **Resumo gerado por IA**
   - Buscar documento tipo `AI_SUMMARY` da sessão
   - Se existir: renderizar seu conteúdo
   - Se não: usar `session.summary` como fallback
   - Card com visual destacado (borda accent, ícone de IA)

4. **Seção de arquivos redesenhada**
   - Exibir apenas: Texto Bíblico (NVI), Slides, Mapa Mental
   - Renomear "Infográfico" → "Mapa Mental" no display
   - Vídeo: visível APENAS se usuário é ADMIN+ (verificar role no frontend)
   - Remover transcrição bruta e limpa da lista visível
   - Formato: ícone PDF + nome do arquivo + tamanho + botão download
   - Nomenclatura exibida: `{Livro} {Cap} (NVI).pdf`, `{Livro} {Cap} - Slides.pdf`, etc.

5. **Componente `ParticipantLog.tsx`**
   - Criar em `src/features/sessions/components/ParticipantLog.tsx`
   - Para cada participante:
     - Foto (thumbnail) + Nome
     - Para cada `ParticipantEntry`:
       - Linha: `Entrada: HH:mm | Saída: HH:mm | Duração: XXmin`
     - Separador visual entre entries
     - **Somatório total em destaque:** `Total: XX minutos`
   - Se apenas 1 entry: não mostrar o sublinhado, apenas a linha única + total

6. **"Meet ID processado em..."**
   - Exibir APENAS se o usuário é ADMIN+
   - Ocultar para outros perfis

7. **Navegação entre cards (anterior/próximo)**
   - Botões `◀ Anterior` e `Próximo ▶` no topo do card
   - Chamar: `GET /api/sessions/[id]/adjacent`
   - Se `previousId === null`: desabilitar botão anterior
   - Se `nextId === null`: desabilitar botão próximo
   - Ao clicar: navegar via `router.push(`/session/${id}`)`

8. **Busca inteligente na seção Devocional (F4)**
   - No arquivo `src/app/(dashboard)/books/page.tsx`:
   - Adicionar barra de busca funcional no topo
   - Debounce 300ms
   - Chamar: `GET /api/search?q=keyword`
   - Exibir resultados com destaque do termo buscado
   - Clicar no resultado: navegar para `/session/{id}`

---

## Subetapa 4.2 — Plano de Leitura Redesign (F18) — Layout & Calendário

### Arquivo principal: seção de planos de leitura no admin (`src/app/(dashboard)/admin/page.tsx`)

### Tasks

1. **Layout de criação em 3 seções**
   - Seção 1: Seleção do livro (dropdown customizado)
   - Seção 2: Capítulos por dia + insights automáticos:
     - "Total de capítulos: X"
     - "Dias necessários: Y"
     - "Previsão de término: DD/MM/YYYY"
   - Seção 3: Calendário interativo (maior e mais bonito)

2. **Calendário melhorado**
   - Fontes MUITO maiores: dias da semana, mês, números dos dias
   - Cores consistentes com a paleta da plataforma (accent, surface)
   - Animações ao interagir: hover suave nos quadradinhos
   - Efeitos de seleção: borda accent, preenchimento suave
   - Dias BLOQUEADOS (sem horário): visual cinza, não clicável
   - Ao clicar em dia bloqueado: pop-up para definir horário daquele dia

3. **Recálculo inteligente ao mudar capítulos/dia**
   - Manter a data de início já selecionada
   - Recalcular a distribuição dos capítulos sem perder seleção
   - Não zerar tudo quando mudar o número

4. **Selecionar data anterior = nova data de início**
   - Se o usuário clicar em um dia ANTES da data de início atual:
   - Recalcular tudo com a nova data de início

5. **Número fixo de dias selecionados**
   - Total de dias = ceil(totalChapters / chaptersPerDay)
   - Ao clicar após o último dia: avançar último, remover primeiro (rotação)
   - NUNCA ter mais dias selecionados do que o necessário

6. **Barra de progresso com percentual**
   - Círculo visual com percentual dentro
   - Formato textual: "13 de 20 capítulos (65%)"
   - Na lista de planos e no detalhe

7. **Botão editar plano**
   - Ícone de lápis ao lado do botão de excluir
   - Ao clicar: reabre a tela de criação com dados preenchidos
   - Permite alterar: capítulos/dia, datas

8. **Barra de busca na lista de planos**
   - Filtrar planos pelo nome do livro
   - Acima da lista

9. **Botão "Criar Plano" com visual melhorado**
   - Gradiente accent
   - Hover com scale sutil
   - Texto claro: "Criar Plano — X dias"

---

## Subetapa 4.3 — Plano de Leitura Redesign (F18) — Checklist & Retroativo

### Tasks

1. **Componente customizado `ChapterChecklist.tsx`**
   - Criar em `src/features/admin/components/ChapterChecklist.tsx`
   - NÃO usar checkbox/lista padrão do navegador
   - HTML semântico + CSS customizado
   - Layout por linha de capítulo:
     ```
     [■ checkbox grande] Cap 1  [□ pequeno] Leitura Parcial
     [■ checkbox grande] Cap 2  [□ pequeno] Leitura Parcial
     [✓ bloqueado] Cap 3  → "2 sessões"
     ```

2. **Checkbox esquerda (grande): lido por completo**
   - Clicar: marca o capítulo como lido
   - Visual grande e claro

3. **Checkbox direita (pequeno): leitura parcial**
   - Legenda: "Leitura Parcial" ao lado
   - Ao marcar: automaticamente marca checkbox esquerda também
   - Ao marcar: o capítulo reaparece no próximo dia

4. **Capítulo parcial completado**
   - Quando um capítulo que era parcial é marcado como completo (apenas checkbox esquerda):
   - Bloquear ambos os checkboxes
   - Substituir checkbox direita por texto: "{N} sessões" (ex: "2 sessões")

5. **Modal de preenchimento manual**
   - Ao clicar em um dia na lista de planos: abrir modal
   - Modal contém o `ChapterChecklist` para aquele dia
   - Botão "Salvar" chama `PATCH /api/admin/reading-plans/[id]/days/[dayId]/chapters`

6. **Criação retroativa**
   - Permitir selecionar datas passadas no calendário
   - Ao criar plano com datas passadas:
     - Após criação: abrir modal obrigatório
     - Listar todos os dias retroativos (de startDate até hoje)
     - Para cada dia: `ChapterChecklist` para marcar o que foi feito
     - Ao salvar: recalcular dias futuros
     - Chamar `POST /api/admin/reading-plans/[id]/retroactive`

7. **Pop-up de horário para dia bloqueado**
   - Ao clicar em dia sem horário definido:
   - Abrir pop-up pequeno: "Defina o horário para {dia da semana}"
   - Campo de horário (input time)
   - Botão "Salvar" → salva em AppSetting
   - Após salvar: liberar o dia para seleção

---

## Subetapa 4.4 — Relatórios Redesign (F11) + Gráfico Pizza (F12)

### Arquivo principal: `src/app/(dashboard)/reports/page.tsx`

### Tasks

1. **Filtros reorganizados**
   - Mover filtros para PRÓXIMO do relatório (não no topo distante)
   - Layout: filtros em linha ou bloco compacto acima da tabela/gráfico
   - Adicionar filtro por subequipe (dropdown)
   - Adicionar filtro por livro (dropdown — apenas livros com devocionais)
   - Restrição: usuário não-admin NÃO vê filtros de outros usuários

2. **Ano dinâmico**
   - Dropdown de ano: começar com 2026
   - Se mês atual >= dezembro: adicionar próximo ano

3. **Gráfico de barras com toggle semanal/mensal**
   - Canto superior direito do gráfico: 2 botões toggle "Semana" | "Mês"
   - Mesmo espaço, gráfico muda conforme seleção
   - Cada barra:
     - Altura total = número de devocionais no período
     - Preenchimento = número de presenças do usuário
   - Hover: "Semana 3 | Devocionais: 5 | Presença: 4 | Frequência: 80%"
   - Chamar: `GET /api/reports/frequency?period=weekly|monthly`

4. **Gráfico de linha (evolução da frequência)**
   - Abaixo do gráfico de barras
   - Toggle: "Semana" | "Mês"
   - Mostrar evolução do percentual ao longo do tempo
   - Eixo Y: 0% a 100%
   - Chamar: `GET /api/reports/evolution?period=weekly|monthly`
   - Usar Recharts `<LineChart>` com curva suave

5. **Insights atualizados**
   - Para ADMIN:
     - "Média de Participantes" (substituir "Membros Únicos")
     - "Horas de Devocional" (do maior tempo por dia)
   - Para TODOS:
     - "Horas de Devocional" (próprias)
     - "Total de Presenças"
     - "Frequência (%)"
   - Chamar: `GET /api/reports/hours`

6. **Detalhamento por usuário**
   - Adicionar coluna "Tempo Médio" com ícone de relógio
   - Canto superior direito da seção: 3 botões "Semanal" | "Mensal" | "Anual"
   - Default: "Mensal" (botão do meio selecionado)
   - Ao mudar filtro supremo (ano/mês): reset para "Mensal"

7. **Botão exportar**
   - Dar funcionalidade: exportar tabela como CSV
   - Usar `Blob` + `URL.createObjectURL` para download
   - Nome: `relatorio-{ano}-{mes}.csv`

8. **Gráfico de pizza no dashboard (F12)**
   - Em `src/app/(dashboard)/page.tsx`:
   - Substituir onde estava "Insights de IA" (já removido na Etapa 3)
   - Gráfico de pizza com Recharts `<PieChart>`
   - Cada fatia = 1 livro que o usuário participou
   - Hover: nome do livro + "X sessões (Y%)"
   - Cores distintas por livro
   - Chamar: `GET /api/reports/books-distribution`

---

## Subetapa 4.5 — Seção Devocional/Livros Redesign (F3)

### Arquivo principal: `src/app/(dashboard)/books/page.tsx`

### Tasks

1. **Ao clicar no livro: exibir painel de progresso**
   - Barra de progresso com percentual visual
   - Datas: início e término (ou estimativa)
   - Checklist de capítulos realizados (com status parcial/completo)

2. **Roadmap/trilha visual**
   - Timeline vertical ou horizontal dos dias do livro
   - Cada ponto: data + capítulo + participantes
   - Dias realizados: cor sólida
   - Dias futuros: cor clara/outline
   - Dias perdidos: vermelho/warning

3. **Botão "Abrir Bíblia"**
   - Botão que abre a bubble da Bíblia (`BibleBubble`)
   - Passar contexto: livro e capítulo atual
   - Pode disparar via evento customizado ou state management

4. **Menu lateral de livros maior**
   - Aumentar tamanho dos itens
   - Mais informações: número de sessões, status
   - Visual mais elaborado com ícones

---

## Checklist de Conclusão

### Card (F5)
- [ ] Horário exibido junto à data
- [ ] Layout vertical (Resumo → Arquivos → Participantes)
- [ ] Resumo AI_SUMMARY exibido
- [ ] "Mapa Mental" no lugar de "Infográfico"
- [ ] Vídeo oculto para não-admin
- [ ] Transcrições ocultas da lista
- [ ] ParticipantLog com entradas/saídas + total
- [ ] Meet ID apenas para admin
- [ ] Navegação anterior/próximo funcional

### Busca (F4)
- [ ] Barra de busca funcional na seção Devocional
- [ ] Debounce 300ms
- [ ] Resultados com destaque do termo

### Plano de Leitura (F18)
- [ ] 3 seções de criação
- [ ] Calendário com fontes grandes e cores corretas
- [ ] Recálculo inteligente ao mudar capítulos/dia
- [ ] Data anterior = nova data de início
- [ ] Número fixo de dias selecionados
- [ ] Progresso com percentual visual
- [ ] Botão editar funcional
- [ ] ChapterChecklist customizado (parcial/completo)
- [ ] Criação retroativa com modal obrigatório
- [ ] Pop-up de horário para dia bloqueado

### Relatórios (F11, F12)
- [ ] Filtros próximos ao relatório
- [ ] Filtros por subequipe e livro
- [ ] Toggle semanal/mensal no gráfico de barras
- [ ] Gráfico de linha de evolução
- [ ] Insights corretos por perfil
- [ ] Detalhamento com tempo médio e toggle semanal/mensal/anual
- [ ] Exportar CSV funcional
- [ ] Gráfico de pizza no dashboard

### Devocional (F3)
- [ ] Progresso por livro com percentual
- [ ] Roadmap/trilha visual
- [ ] Botão "Abrir Bíblia" funcional
- [ ] Menu lateral maior

### REGRAS ABSOLUTAS
- [ ] TUDO testado em dark mode E light mode
- [ ] TUDO responsivo (mobile 375px + desktop 1440px)
- [ ] Fontes grandes e legíveis
- [ ] Componentes customizados (nunca select/checkbox padrão)
