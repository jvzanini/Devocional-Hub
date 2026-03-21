# ETAPA 5 — Novas Funcionalidades: Bíblia Interativa + Planejamento

> **Terminal dedicado para esta etapa**
> **Duração estimada:** 5-7 dias
> **Depende de:** Etapa 1 (CONCLUÍDA)

## Contexto

A Etapa 1 já foi concluída. O schema Prisma tem o model `PlanningCard` e o enum `DocType` inclui `PLANNING`. O sistema de permissões está implementado.

**Referências obrigatórias antes de começar:**
- PRD: `.context/workflow/docs/prd-devocional-hub-master-update-v2.md` (F20 e F21)
- Tech Spec: `.context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md` (seção 5: Arquitetura Bíblia)
- Plano completo: `.context/plans/devocional-hub-master-update-v2.md` (Subetapas 5.1 e 5.2)
- CLAUDE.md na raiz do projeto (convenções obrigatórias)
- Imagens de referência da Bíblia interativa no prompt original do usuário

## Regras Gerais

- Responder SEMPRE em português brasileiro
- NUNCA commitar credenciais reais
- CSS via CSS variables: `var(--text)`, `var(--accent)`, `var(--surface)`, `var(--bg)`
- NUNCA usar `@theme` inline do Tailwind v4
- NUNCA usar `<select>` padrão do navegador — SEMPRE componentes customizados
- Dark mode: `[data-theme="dark"]` — TESTAR SEMPRE em ambos os temas
- Responsividade é REGRA ABSOLUTA — testar mobile (375px) e desktop (1440px)
- Imports: `@/features/<feature>/lib/<module>`, `@/shared/lib/<module>`
- O banco roda na VPS, NUNCA localmente
- API.Bible key em dev: usar a que está no `.env` (`BIBLE_API_KEY`)
- Em produção: OBRIGATÓRIO usar variável de ambiente (nunca expor no client-side)

---

## Subetapa 5.1 — Bíblia Interativa (F21)

### Objetivo
Criar uma bubble flutuante com ícone de Bíblia que abre um leitor completo com seletores customizados, player de áudio, e navegação canônica.

### Referência Visual
O usuário enviou 4 screenshots de referência de um app de Bíblia. Seguir esse padrão:
- Interface escura, tipografia grande e legível
- Cabeçalho enxuto: `[Romanos 11] [NVI] [som] [busca] [menu]`
- Área de leitura limpa com versículos numerados
- Player embutido: play/pause, velocidade (2x), barra de progresso
- Seletor de livros: lista expandível com grid de capítulos
- Seletor de versões: bottom sheet com versões (NVI, NAA, A21, ARC, TB)
- **RESPEITAR as cores da plataforma DevocionalHub (não copiar cores de outro app)**

### Estrutura de Diretórios

```
src/features/bible-reader/
├── components/
│   ├── BibleBubble.tsx          # Bubble flutuante (canto inferior direito)
│   ├── BibleModal.tsx           # Container: modal desktop / fullscreen mobile
│   ├── BibleHeader.tsx          # Cabeçalho: versão + livro + capítulo + botões
│   ├── VersionSelector.tsx      # Seletor customizado de versão
│   ├── BookSelector.tsx         # Seletor customizado de livro (com grid de caps)
│   ├── ChapterSelector.tsx      # Grid de números de capítulos
│   ├── BibleContent.tsx         # Área de leitura (versículos formatados)
│   ├── BibleNavigation.tsx      # Botões anterior/próximo
│   ├── AudioPlayer.tsx          # Player completo com controles
│   └── SpeedControl.tsx         # Seletor de velocidade (1x-2x)
└── lib/
    ├── bible-api-client.ts      # Cliente HTTP para API.Bible
    ├── version-discovery.ts     # Descoberta de versões PT + áudio
    ├── audio-manager.ts         # Gerenciamento de áudio, autoplay
    └── devocional-context.ts    # Resolver de contexto devocional
```

### Tasks — SEÇÃO 9: Camada de API

1. **Criar `bible-api-client.ts`**
   - Base URL: `https://api.scripture.api.bible/v1`
   - Headers: `api-key` (de env var) + `fums-version: 3`
   - Funções:
     - `getBibles(language?: string)` — listar versões
     - `getBooks(bibleId: string)` — listar livros
     - `getChapters(bibleId: string, bookId: string)` — listar capítulos
     - `getChapterContent(bibleId: string, chapterId: string)` — conteúdo
     - `getAudioUrl(bibleId: string, chapterId: string)` — URL do áudio (se disponível)
   - Tratamento de erros robusto (rate limit, indisponibilidade)

2. **Criar `version-discovery.ts`**
   - Descobrir programaticamente versões em português
   - Filtrar: idioma português → preferencialmente PT-BR → com áudio disponível
   - Se API não tiver flag explícita para áudio: documentar heurística
   - Manter allowlist configurável como fallback
   - Shape final: `{ id, abbreviation, name, language, audioAvailable }`

3. **Criar endpoints server-side** (proxy para não expor API key no client)
   ```
   GET /api/bible/versions             → versões filtradas
   GET /api/bible/books/[versionId]    → livros da versão
   GET /api/bible/chapters/[vid]/[bid] → capítulos do livro
   GET /api/bible/content/[vid]/[cid]  → conteúdo do capítulo
   GET /api/bible/audio/[vid]/[cid]    → URL do áudio
   ```

### Tasks — SEÇÃO 8: Contexto Devocional

4. **Criar `devocional-context.ts`**
   - Resolver livro/capítulo/versão do plano de leitura ativo
   - Buscar `ReadingPlan` com status `IN_PROGRESS`
   - Encontrar o dia atual no plano
   - Retornar: `{ bookId, chapterNumber, bookName, referenceLabel, preferredBibleVersionId }`
   - Fallback: Gênesis 1, versão NVI

### Tasks — SEÇÃO 1-3: Bubble + Container + Header

5. **Criar `BibleBubble.tsx`**
   - Ícone de Bíblia (📖) fixo, canto inferior direito
   - `position: fixed`, `z-index: 50`
   - Não atrapalhar CTAs do site
   - Estados: hover (scale up), active (press), animação de click
   - Responsivo: posição se adapta ao viewport

6. **Criar `BibleModal.tsx`**
   - Desktop/Tablet: modal centralizado (~80vw x 85vh), backdrop, border-radius
   - Mobile: fullscreen, botão X visível no topo
   - Animações: fade in/out + slide up
   - Fechamento: X (sempre), ESC (desktop), clique fora (desktop)

7. **Criar `BibleHeader.tsx`**
   - Exibir: `[Livro + Cap] [Versão]` à esquerda
   - Botões à direita: som, fechar
   - Ao clicar em "Livro + Cap" → abrir BookSelector
   - Ao clicar em "Versão" → abrir VersionSelector

### Tasks — SEÇÃO 4: Seletores Customizados

8. **Criar `VersionSelector.tsx`**
   - NÃO usar `<select>` padrão
   - Bottom sheet (mobile) ou dropdown overlay (desktop)
   - Lista de versões: sigla em destaque (NVI, NAA...) + nome completo + editora
   - Estado selecionado visível
   - Navegação por teclado (Arrow keys, Enter, Escape)
   - Aria labels para acessibilidade

9. **Criar `BookSelector.tsx`**
   - Lista de livros (Gênesis → Apocalipse)
   - Separação: Antigo Testamento / Novo Testamento
   - Ao clicar num livro: expandir grid de capítulos (como no screenshot de referência)
   - Ícone de áudio disponível ao lado do livro
   - Estado selecionado em negrito

10. **Criar `ChapterSelector.tsx`**
    - Grid de números (4-5 por linha)
    - Quadrados com hover effect
    - Capítulo atual destacado

### Tasks — SEÇÃO 5-6: Leitura + Navegação

11. **Criar `BibleContent.tsx`**
    - Título do capítulo/seção em destaque
    - Versículos numerados (número em superscript ou destaque)
    - Tipografia grande e legível (mínimo 16px no mobile)
    - Scroll interno suave
    - Loading skeleton enquanto carrega
    - Estado de erro com mensagem amigável

12. **Criar `BibleNavigation.tsx`**
    - Botões `◀ Anterior` e `Próximo ▶`
    - Navegação contínua entre livros (último cap Romanos → primeiro cap 1 Coríntios)
    - Desabilitar "Anterior" em Gênesis 1, "Próximo" em Apocalipse 22
    - Sincronizado com player de áudio

### Tasks — SEÇÃO 7: Player de Áudio

13. **Criar `AudioPlayer.tsx`**
    - Controles: ⏮ (anterior), ▶/⏸ (play/pause), ⏭ (próximo)
    - Barra de progresso (seek funcional)
    - Tempo: atual / total
    - Versão e copyright abaixo

14. **Criar `SpeedControl.tsx`**
    - Velocidades: 1x, 1.25x, 1.5x, 1.75x, 2x
    - Botão que cicla entre velocidades
    - Exibir velocidade atual

15. **Criar `audio-manager.ts`**
    - Usar `HTMLAudioElement` nativo
    - Gerenciar estado de reprodução
    - Autoplay: ao terminar capítulo → carregar e tocar próximo
    - Continuidade entre livros
    - Parar APENAS em: pause manual, fechar modal, sair da página, erro
    - Reprodução em segundo plano (mobile): explorar `MediaSession API`
    - Implementar FUMS tracking (requisito API.Bible)

### Tasks — Integração Final

16. **Integrar bubble no layout principal**
    - Adicionar `<BibleBubble />` em `src/app/(dashboard)/layout.tsx`
    - Deve aparecer em TODAS as páginas autenticadas

17. **Integrar com contexto devocional**
    - Ao abrir: carregar livro/capítulo do plano de leitura ativo
    - Permitir troca livre depois

---

## Subetapa 5.2 — Módulo Planejamento (F20)

### Objetivo
Criar um módulo que gera cards de planejamento teológico por capítulo para auxiliar na preparação dos devocionais.

### Estrutura de Diretórios

```
src/features/planning/
├── components/
│   ├── PlanningPage.tsx         # Página principal
│   ├── PlanningCard.tsx         # Card por capítulo
│   ├── ThemeGroup.tsx           # Agrupamento temático
│   └── StudyResources.tsx       # Links + imagens
└── lib/
    ├── planning-generator.ts    # Geração via IA
    ├── reference-fetcher.ts     # Buscar textos de referência
    └── cron-scheduler.ts        # Agendamento meia-noite
```

### Tasks

1. **Criar rota e página**
   - Rota: `/planning` → `src/app/(dashboard)/planning/page.tsx`
   - Verificar permissão de acesso (usar `checkPermission("menu:planning", userRole)`)

2. **Adicionar "Planejamento" na sidebar**
   - Novo item de menu (com ícone adequado)
   - Visibilidade controlada por permissão (default: ADMIN)
   - Verificar em `src/shared/components/Sidebar.tsx`

3. **Criar endpoints**
   ```
   GET  /api/planning/current           → plano ativo com cards
   GET  /api/planning/cards/[planId]    → listar cards
   GET  /api/planning/card/[cardId]     → detalhe de um card
   POST /api/planning/generate/[planId] → gerar cards via IA
   ```

4. **Criar `planning-generator.ts`**
   - Para cada capítulo do plano:
     - Buscar texto bíblico NVI completo (via API)
     - Gerar pesquisa teológica via IA
     - Analisar: como abordar, segmentação por temas, aplicações
     - Identificar agrupamentos temáticos naturais (NÃO forçar)
     - Buscar referências bíblicas complementares COM texto completo
       - Ex: "Filipenses 2:3 — 'Nada façam por ambição egoísta...'"
     - Buscar links de estudo (pelo menos 5 por card)
   - Gerar UM card por vez (para qualidade)
   - Salvar `PlanningCard` no banco

5. **Criar `reference-fetcher.ts`**
   - Receber lista de referências (ex: ["Fp 2:3", "Jo 3:16"])
   - Buscar texto completo de cada referência via API.Bible ou bolls.life
   - Retornar referência + texto formatado

6. **PONTO DE DECISÃO: Geração de imagens**
   - Sonnet/Opus NÃO geram imagens nativamente
   - NÃO usar API paga (DALL-E, Midjourney) sem autorização do usuário
   - Documentar a limitação em `.context/workflow/docs/image-generation-decision.md`
   - Sugestão: usar imagens de referência de domínio público (Unsplash, Wikimedia)
   - **COMUNICAR AO USUÁRIO E AGUARDAR DECISÃO**

7. **Cron job: gerar cards à meia-noite**
   - Na zero hora do dia de início de um ReadingPlan:
     - Verificar se há plano com `startDate === hoje`
     - Se sim: disparar `POST /api/planning/generate/[planId]`
   - Implementar via: Next.js API route chamada por cron externo (n8n ou GitHub Actions)
   - OU: verificação na carga da página de planejamento

8. **Criar UI de cards**
   - `PlanningCard.tsx`: análise do capítulo, referências com texto, links
   - `ThemeGroup.tsx`: visual de agrupamento quando capítulos compartilham tema
   - `StudyResources.tsx`: links clicáveis + placeholder para imagens
   - Layout limpo, legível, com seções bem definidas

9. **Permissões**
   - Adicionar "Planejamento" na tela de permissões do admin (Etapa 3)
   - Default: visível para ADMIN

---

## Checklist de Conclusão

### Bíblia Interativa (F21)
- [ ] Bubble aparece em todas as páginas autenticadas
- [ ] Desktop: modal amplo e elegante
- [ ] Mobile: fullscreen com X para fechar
- [ ] 3 seletores customizados (versão, livro, capítulo)
- [ ] Versões filtradas: português + áudio disponível
- [ ] Leitura: versículos formatados, título destacado, scroll suave
- [ ] Navegação: anterior/próximo funciona entre livros
- [ ] Player: play/pause, velocidade 1x-2x, progresso, autoplay
- [ ] Contexto devocional: abre no livro/capítulo do plano ativo
- [ ] FUMS implementado (requisito API.Bible)
- [ ] API key NÃO exposta no client-side
- [ ] Dark mode e light mode corretos
- [ ] Responsivo: testado em 375px e 1440px

### Planejamento (F20)
- [ ] Menu "Planejamento" na sidebar (com controle de permissão)
- [ ] Cards por capítulo com análise teológica
- [ ] Referências bíblicas com texto completo
- [ ] Links de estudo (5+ por card)
- [ ] Agrupamento temático quando natural
- [ ] Questão de imagens comunicada ao usuário
- [ ] Endpoints funcionais
