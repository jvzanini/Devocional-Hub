# Terminal B — Etapas 2 + 3: Dashboard + Devocional/Cards/Navegação

> **Escopo:** `src/app/(dashboard)/page.tsx`, `src/app/(dashboard)/books/page.tsx` (BooksPageClient), `src/app/(dashboard)/session/[id]/page.tsx` (layout do card), `src/features/dashboard/`, `src/features/sessions/components/`
> **NÃO TOCAR:** globals.css (cores/accent), Sidebar.tsx, login, profile, planning, reports, bible-reader/, API routes

## Referências
- Plano Hotfix: `.context/plans/devocional-hub-v2-hotfix.md`
- CLAUDE.md na raiz do projeto
- Prints do usuário mostrando os problemas visuais

## Regras
- Responder SEMPRE em português brasileiro
- NUNCA commitar credenciais reais
- Validar com `npx tsc --noEmit` antes de commitar
- NÃO fazer push (quem faz push é o Terminal D)
- Usar inline styles ou classes existentes do globals.css — NÃO criar novas classes no globals.css

---

## Etapa 2 — Dashboard & Calendário

### 2.1 — Gráfico de pizza (distribuição por livro)
**Arquivo:** `src/app/(dashboard)/page.tsx` ou `src/features/dashboard/components/BooksDistributionChart.tsx`
- Os percentuais ficam muito distantes da legenda. Redesenhar.
- Opção: usar Recharts com layout de legenda integrada (não separada)
- Manter gráfico donut com legendas ao lado, percentuais juntos

### 2.2 — Calendário
**Arquivo:** `src/features/dashboard/components/DashboardCalendar.tsx`

**Cores (INVERSÃO):**
- Dias com devocional REALIZADO (passado) = cor ESCURA (amarelo escuro/âmbar escuro)
- Dias com devocional AGENDADO (futuro) = cor VIVA/VIBRANTE (amarelo forte)
- Dias SEM devocional = sem cor (neutro)

**Dia atual:**
- REMOVER contorno verde — substituir por bolinha branca pequena embaixo do número

**Abreviações:**
- Livros devem usar primeira letra maiúscula e demais minúsculas: "Rom" não "ROM", "Gn" não "GN"
- Verificar `src/features/bible/lib/bible-abbreviations.ts`

### 2.3 — Card "Devocional mais recente"
**Arquivo:** `src/app/(dashboard)/page.tsx`
- Filtrar sessões com status "PIPELINE_ERROR" ou chapterRef "Não identificado"
- Mostrar apenas devocionais válidos (com chapterRef identificado e sem erro)

---

## Etapa 3 — Devocional, Cards & Navegação

### 3.1 — Menu lateral de livros
**Arquivo:** `src/features/bible/components/BooksPageClient.tsx`
- O bloco "Romanos / 20 sessões / 13%" está muito pequeno
- Aumentar: fonte do nome do livro, espaçamento, mini gráfico circular maior
- A busca NÃO FUNCIONA — implementar filtro real (filtrar livros conforme digitação)

### 3.2 — Cards de sessão
**Arquivo:** `src/features/bible/components/BooksPageClient.tsx` (grid de cards)
- Tag "Concluído" quase invisível — substituir por ícone check verde (SVG checkmark circular verde)
- REMOVER botão "Abrir Bíblia" (já existe a bubble flutuante)
- Botão "Trilha":
  - Mostrar preview recolhida (primeiros 3-4 itens) com botão "Ver mais"
  - Na trilha: incluir horário de início e fim do devocional
  - Data com ano completo: "19 de mar. de 2026" (não "26")

### 3.3 — Navegação
**Arquivo:** `src/features/bible/components/BooksPageClient.tsx` e `src/app/(dashboard)/session/[id]/page.tsx`
- Botão "Voltar" dentro do card: deve usar `router.back()` ou navegar para `/books` (NÃO para `/`)
- Navegação por setas (anterior/próximo): filtrar/pular sessões com status "PIPELINE_ERROR"

### 3.4 — Dentro do card (detalhe da sessão)
**Arquivo:** `src/app/(dashboard)/session/[id]/page.tsx`
- Participantes duplicados no frontend — agrupar por nome/email e somar tempos
- Mostrar horário de entrada e saída
- Tag de tempo: trocar cor do fundo (amarelo com branco = péssimo contraste no dark mode)

---

## Commit ao finalizar
```
git add "src/app/(dashboard)/page.tsx" "src/app/(dashboard)/books/page.tsx" "src/app/(dashboard)/session/" src/features/dashboard/ src/features/bible/components/ src/features/sessions/components/
git commit -m "fix(hotfix-B): redesenhar dashboard, calendário, cards e navegação

- Pizza: percentuais junto das legendas
- Calendário: cores invertidas, bolinha branca hoje, abreviações corretas
- Cards: check verde, remover Abrir Bíblia, trilha com expand e horários
- Navegação: Voltar para /books, pular sessões com erro
- Participantes: deduplicar no frontend, melhor contraste tags

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
