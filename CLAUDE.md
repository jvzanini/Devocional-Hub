# Devocional Hub — Diretrizes do Projeto

## Bible Bubble v5.11 — Busca integrada + UX polish (CONCLUIDO — 2026-03-29)

### Busca integrada com audio
- **Abrir busca pausa audio:** ao clicar na lupa, audio e pausado automaticamente. Ao fechar (X), audio retoma se estava tocando
- **Play durante busca fecha busca:** clicar play no player colapsado fecha busca (salva query em memoria), retoma audio
- **Query preservada:** query salva quando busca fecha por play. Reabrir lupa restaura a query. So limpa no X ou deletando manual
- **Controles de audio nao tiram foco:** `onMouseDown preventDefault` no footer impede perda de foco do input
- **Scroll para cima ao buscar:** `scrollTo({ top: 0 })` no modal body quando resultados mudam

### Busca — hifens
- **Hifens normalizados:** `normalizeForSearch` converte hifens Unicode (U+2010-2015) para ASCII antes de comparar
- **Highlight flexivel:** regex de highlight aceita qualquer tipo de hifen (`[-\u2010-\u2015]`), "use-" destaca "use‑o"

### Guia de leitura
- **Escondida durante busca:** prop `isSearchActive` controla opacidade do indicador (nao faz sentido durante busca)

### Tooltips mobile
- **Fix flash no tap:** `mouseover`/`mouseout` ignoram eventos sinteticos gerados por touch (500ms cooldown apos touchstart)

## Bible Bubble v5.10 — Fix audio, guia, tooltips e busca (CONCLUIDO — 2026-03-29)

### Audio (v5.9)
- **Subscribe sincronizado:** `AudioManager.subscribe()` emite estado atual imediatamente ao se inscrever
- **Pausa ao navegar capitulos:** `AudioPlayer` pausa audio antigo quando `audioUrl` fica null (troca de capitulo)
- **isLoading preciso:** Flag `hasSrc` para que `isLoading` so seja true quando ha fonte carregando
- **Speed fluido:** `setSpeed()` seta `playbackRate` direto (sem pause/resume que causava engasgada)
- **Player colapsado com loading correto:** Spinner quando `audioUrl` e null, clique desabilitado

### Guia de leitura (v5.10)
- **Altura correta em versiculos com poesia:** Calculo mede do versiculo atual ate o PROXIMO versiculo, cobrindo blocos intermediarios (poesia q1/q2, quebras de linha). Antes `getClientRects()` so media o span do versiculo, ignorando divs irmas de poesia.
- **Ultimo versiculo:** Mede ate o fim do container de conteudo

### Tooltips/Insights (v5.10)
- **Posicionamento 100% via JS:** Removido CSS `:hover` display. Hover e click usam mesma logica JS com `position: fixed`
- **maxWidth restrito ao modal:** `modalRect.width - 24px` garante que tooltip nunca ultrapassa bordas
- **Medicao apos reflow:** `offsetWidth`/`offsetHeight` medidos depois de aplicar maxWidth
- **Clamp horizontal e vertical:** Tooltip sempre dentro dos limites do modal (12px margem)

### Busca (v5.10)
- **Texto orfao do YouVersion:** YouVersion coloca texto apos footnotes FORA do span do versiculo (`</span>NOTE<span class="content">text</span>`). Busca agora percorre siblings ate o proximo versiculo para coletar texto completo
- **Footnotes visiveis nos resultados:** Footnotes que sao siblings (nao filhos) do versiculo sao associados ao versiculo anterior na hora de mostrar/esconder
- **Tela limpa sem resultados:** Quando nenhum versiculo encontra, `container.style.display = "none"` esconde tudo (fix texto orfao visivel)
- **Highlight nos resultados:** `highlightTextInElement` aplicado nos versiculos que correspondem a busca

## Bible Bubble v5.7 — Leitura Acompanhada + Player Melhorado (CONCLUIDO — 2026-03-23)

O Bible Bubble e o modulo de leitura biblica interativa do DevocionalHub. Todas as versoes anteriores (v4, v4.1, v5, v5.1, v5.2, v5.3, v5.4-v5.6) foram consolidadas aqui.

### Fontes de dados
- **Texto:** Holy Bible API (holy-bible-api.com) — 12 versoes PT, gratuita, sem API key
- **Formatacao:** YouVersion (bible.com) — titulos de secao, paragrafos, poesia via scraping de `__NEXT_DATA__`
- **Audio:** Bible.is (live.bible.is) — 4 versoes com audio versao-especifico (NVI, NAA, NTLH, NVT)

### Formatacao YouVersion (sem IA)
- Titulos de secao, paragrafos e poesia vem **direto do YouVersion (bible.com)**
- Eliminada dependencia de IA (GPT) para formatacao de texto biblico
- Modulo: `youversion-client.ts` — fetch + parse + transform + cache 24h em memoria
- Modulo: `bible-formatter.ts` — orquestra YouVersion com fallback para texto puro
- Classes CSS: `.bible-section-title`, `.bible-paragraph`, `.bible-poetry-1`, `.bible-poetry-2`
- Fallback: se YouVersion falhar, usa Holy Bible API (texto sem titulos de secao)

### Mapeamento de versoes (Holy Bible API → YouVersion)
| Holy Bible ID | YouVersion ID | Abreviacao |
|---------------|---------------|------------|
| 644 | 129 | NVI |
| 635 | 1608 | ARA |
| 637 | 212 | ARC |
| 641 | 1840 | NAA |
| 645 | 1930 | NVT |
| 643 | 211 | NTLH |

### Versoes PT com audio versao-especifico (Bible.is)
| Versao | ID | NT Fileset | OT Fileset |
|--------|----|-----------|-----------|
| NVI | 644 | PORNVIN1DA | PORNVIO1DA |
| NAA | 641 | PORBBSN1DA | PORBBSO1DA |
| NTLH | 643 | PO1NLHN1DA | PO1NLHO1DA |
| NVT | 645 | PORTHFN1DA | PORTHFO1DA |

### Versoes PT (texto apenas)
ARC (637), Almeida (636), ARA (635), NBV (642), OL (646), TB (647), CAP (640), BPT (639)

### Features UX
- **Guia de leitura (v5.7):** barra lateral esquerda (4px, border-radius 3px) acompanha o versiculo sendo lido no audio. Posicao: left 6px (desktop) / 8px (mobile). Calculo de altura via `getClientRects()` (fix versiculos inline multi-linha). Reagrupavel: recalcula ao mudar fontSize. Branco em dark mode, preto em light mode. Transicoes cubic-bezier.
- **Auto-scroll inteligente (v5.7):** puxa versiculo para o topo quando sai da tela visivel. Considera altura do footer/player expandido para nao esconder texto. Pausa 4s se usuario rolar manualmente (detecta wheel/touchmove). Usa getClientRects para precisao.
- **Timestamps Bible.is:** API `live.bible.is/api/timestamps/{fileset}/{book}/{ch}?v=4` — disponivel para NVI, NTLH, NVT (NT apenas). Fallback proporcional para NAA e AT (8% offset intro + divisao igual). Timestamps sao tempo-arquivo (independe de playbackRate).
- **Progress ring (v5.7):** barra circular no botao play colapsado, estilo relogio (topo→sentido horario), branca, stroke-width 2px, track opacity 0.15. SVG viewBox 48x48, radius 22. Atualiza via DOM direto (sem re-render).
- **Player colapsado (v5.7):** botao play 48x48 (igual ao expandido), botoes nav maiores (font 13px, padding 6px 10px), icones 24px/16px, gap 14px
- **Player expandido (v5.7):** botao play 48x48 (igual ao colapsado), icones 24px
- **Speed button:** min-width 46px para nao empurrar outros botoes ao alternar velocidade (1x→2x). Posicao fixa no layout.
- **Bubble:** 15% maior que padrao, label "Abrir Biblia", esconde quando modal aberto, z-index 9999, subido 20px, anti-zoom iOS
- **Player:** inicia colapsado/pausado, sem autoplay, drag-to-seek (mouse+touch), cache de posicao (localStorage 24h)
- **Audio speed:** `setSpeed()` seta playbackRate direto no HTMLAudioElement (fluido, sem pause/resume)
- **Busca:** lupa no header, client-side no capitulo com highlight, filtra versiculos, ignora acentos/pontuacao, remove footnotes antes do matching. Esconde titulos/breaks/containers sem versiculos visiveis. Coleta texto orfao de siblings (fix YouVersion footnotes). Container inteiro escondido quando sem resultados.
- **Footnotes:** icone 18x18 com margin-left 4px, tooltip posicionado via JS (position: fixed), maxWidth restrito ao modal, hover+click usam mesma logica de posicionamento
- **Botao AA:** ciclo normal (17px) → medio (20px) → grande (24px), persistencia via localStorage. Guia de leitura recalcula ao mudar.
- **Navegacao lateral:** botoes flutuantes prev/next capitulo nos lados do modal (escondidos em mobile < 768px)
- **Seletores:** centralizados em mobile, bordas, transicoes suaves, separacao AT/NT
- **NVT fix:** class="s" (sem numero) tratado como section title alem de class="s1"
- **Modal:** scroll lock total no mobile, pinch-to-zoom desabilitado (touch-action: pan-y), body padding removido em mobile
- **Padding texto:** desktop 20px, mobile 24px (libera espaco para guia de leitura)

### Componentes
`BibleBubble`, `BibleBubbleWrapper`, `BibleModal`, `BibleContent`, `BibleHeader`, `BibleNavigation`, `AudioPlayer`, `SpeedControl`, `BookSelector`, `ChapterSelector`, `VersionSelector`

### Lib
`youversion-client.ts`, `bible-formatter.ts`, `holy-bible-client.ts`, `bible-is-audio.ts`, `audio-manager.ts`, `version-discovery.ts`, `devocional-context.ts`

## Arquitetura da Biblia

```
Frontend → /api/bible/versions           → version-discovery.ts → 12 versoes PT (4 com audio)
Frontend → /api/bible/content/[v]/[ch]   → holy-bible-client.ts → holy-bible-api.com (texto)
                                          → bible-formatter.ts  → youversion-client.ts (formatacao)
Frontend → /api/bible/audio/[v]/[ch]     → bible-is-audio.ts    → live.bible.is (audio + timestamps)
Frontend → /api/bible/context            → devocional-context.ts → Prisma (plano de leitura ativo)
```

### URLs de APIs externas
- Texto: `https://holy-bible-api.com/bibles/{id}/books/{book}/chapters/{ch}/verses`
- Formatacao: `https://www.bible.com/bible/{youVersionId}/{BOOK}.{CH}.{ABBR}` (scraping __NEXT_DATA__)
- Audio Bible.is: `https://live.bible.is/api/bibles/filesets/{FILESET}/{BOOK_CODE}/{CH}?v=4`
- Timestamps Bible.is: `https://live.bible.is/api/timestamps/{FILESET}/{BOOK_CODE}/{CH}?v=4` (NVI/NTLH/NVT NT apenas)

## Hotfix v2.1 — Correcoes pos-deploy (CONCLUIDO — 2026-03-21)

~30 bugs e ajustes de UI/UX corrigidos apos review em producao: z-index do Bubble, deduplicacao de participantes, foto perfil em volume Docker, error handling da Biblia, layout do pizza chart, calendario com cores invertidas, abreviacoes corretas, sidebar renomeada, login com esqueci senha inline, perfil com toast feedback, cores accent goldenrod.

## Master Update v2 — CONCLUIDO (2026-03-21)

Atualizacao master com 22 features em 8 tracks, 7 etapas concluidas. Incluiu: schema Prisma expandido (5 novos models, UserRole com 5 niveis), sistema de permissoes, autenticacao completa, sidebar redesenhada, admin panel, perfil com foto, modulo de planejamento teologico, cards redesenhados, busca inteligente, plano de leitura, relatorios com graficos, dark mode (2042 linhas CSS), responsividade total, seguranca (29 endpoints com requireRole).

Documentacao completa em: `docs/PRD.md`

## Processo de Desenvolvimento (OBRIGATORIO)

### Fluxo padrao
1. Receber demanda → Planejar (Etapa → Sub-etapa → Tasks)
2. Implementar tasks de uma sub-etapa
3. **Testar com Playwright** ao final de cada etapa:
   - Login na plataforma com credenciais do .env (ADMIN_EMAIL/ADMIN_PASSWORD)
   - Navegar ate a feature implementada
   - Verificar visualmente (screenshots) se esta conforme solicitado
   - Testar interacoes (cliques, hover, scroll)
4. Se testes falharem → corrigir antes de avancar
5. **Commit por etapa** (nao por task individual)
6. **Deploy SOMENTE ao final de TODAS as etapas**
7. Deploy assistido: acompanhar CI/CD, verificar HTTP 200, so chamar o usuario quando tudo estiver OK

### Estrutura de toda demanda
```
Etapa (agrupamento macro)
  └── Sub-etapa (agrupamento funcional)
       └── Tasks (tarefas individuais implementaveis)
```

### Testes com Playwright
- Configuracao: `playwright.config.ts` + `tests/e2e/`
- Projetos: Desktop Chrome + Mobile Chrome (Pixel 7)
- Base URL: `https://devocional.nexusai360.com` (ou `PLAYWRIGHT_BASE_URL`)
- Login com credenciais do .env (ADMIN_EMAIL/ADMIN_PASSWORD)
- Screenshots para validacao visual
- Rodar: `npx playwright install` + `npx playwright test`

## Build & Deploy

- Build: `npm run build` (APENAS na VPS/Docker — ver nota abaixo)
- Dev: `npm run dev`
- Prisma: `npx prisma generate` apos alterar schema
- DB sync: `npx prisma db push` (APENAS na VPS — requer PostgreSQL)
- Install: `npm install --legacy-peer-deps` (conflito de peer deps com next-auth beta)
- Deploy: push para `main` → GitHub Actions builda Docker image → faz deploy no Portainer
- IMPORTANTE: Apos deploy, o container leva ~30s para reiniciar. Aguardar antes de validar.
- IMPORTANTE: O Portainer so atualiza o container se o stack YAML mudar. O CI/CD injeta `DEPLOY_SHA` para forcar redeploy.

### Build Local — ATENCAO
- O `npm run build` TRAVA localmente porque tenta conectar ao PostgreSQL durante a compilacao de server components
- PostgreSQL roda APENAS na VPS (Docker Swarm), NUNCA localmente
- Para validar codigo localmente: usar `npx prisma generate` (valida schema) + `npx tsc --noEmit` (valida tipos)
- O build real acontece no CI/CD (GitHub Actions → Docker)

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS 4** — ATENCAO: NAO usar @theme inline (CSS variables nao funcionam em producao)
- **CSS:** classes hardcoded em `globals.css` (`.card`, `.btn-primary`, `.input-field`, etc.) + inline styles
- **Prisma 5** + PostgreSQL (via Docker Swarm, host: `postgres`)
- **NextAuth v5 beta** (credentials provider, JWT strategy, `trustHost: true`)
- **React 19** (19.2.3)
- **Nodemailer** para emails (Gmail SMTP)
- **Playwright** para testes E2E e automacao NotebookLM
- **sharp** (v0.34.5) para compressao de imagens de perfil
- **Recharts** para graficos (pizza, barras, linha)
- **OpenAI API** (primario) — gpt-4.1-mini, modelo configuravel via admin
- **OpenRouter API** (fallback gratuito) — Nemotron 120B
- **Google Gemini API** (fallback gratuito) — Gemini 2.5 Flash

## Arquitetura (Feature-Based)

```
src/
├── app/                          # Routing layer (pages + API routes)
│   ├── (auth)/                   # Login, Invite (sem sidebar)
│   ├── (dashboard)/              # Paginas autenticadas (com sidebar)
│   │   ├── layout.tsx            # Layout compartilhado: Sidebar + auth check
│   │   ├── page.tsx              # Dashboard (home) — stats, hero, insights IA, calendario
│   │   ├── books/page.tsx        # Devocional (lista + grid de cards)
│   │   ├── planning/page.tsx     # Planejamento teologico
│   │   ├── reports/page.tsx      # Relatorios (filtros, graficos, tabela)
│   │   ├── admin/page.tsx        # Painel admin (7 abas com icones)
│   │   ├── profile/page.tsx      # Perfil do usuario
│   │   └── session/[id]/page.tsx # Detalhe da sessao
│   ├── api/                      # API endpoints
│   ├── layout.tsx                # Root layout (font, theme script)
│   └── globals.css               # Design system v3 com CSS variables + dark mode
├── features/                     # Dominios de negocio
│   ├── auth/lib/                 # Autenticacao (NextAuth config)
│   ├── sessions/                 # Sessoes e presenca
│   │   ├── components/           # ProtectedDocuments, SessionNavigation, ParticipantLog
│   │   └── lib/                  # attendance-sync.ts
│   ├── dashboard/components/     # DashboardCalendar, BooksDistributionChart
│   ├── admin/components/         # Componentes do painel admin
│   ├── search/                   # Busca inteligente
│   ├── bible/                    # Textos biblicos (books list, abbreviations)
│   │   ├── components/           # BooksPageClient
│   │   └── lib/                  # bible.ts, bible-books.ts, bible-abbreviations.ts
│   ├── bible-reader/             # Biblia interativa (bubble + player + YouVersion)
│   │   ├── components/           # BibleBubble, BibleModal, AudioPlayer, Seletores, etc.
│   │   └── lib/                  # youversion-client, bible-formatter, holy-bible-client, bible-is-audio, audio-manager, version-discovery, devocional-context
│   ├── permissions/lib/          # Sistema de permissoes multi-nivel
│   ├── planning/                 # Modulo de planejamento teologico
│   │   ├── components/           # PlanningPage, PlanningCard, ThemeGroup
│   │   └── lib/                  # planning-generator, reference-fetcher
│   ├── pipeline/lib/             # Orquestracao: ai.ts, pipeline.ts, notebooklm.ts, reading-plan-sync.ts, transcription-triage.ts
│   ├── zoom/lib/                 # Integracao Zoom (OAuth, recordings, participants)
│   └── email/lib/                # Envio de emails (Gmail SMTP)
├── shared/                       # Codigo compartilhado entre features
│   ├── components/               # Sidebar e componentes compartilhados
│   │   ├── Sidebar.tsx           # Sidebar: Inicio, Devocional, Planejamento, Relatorios, Admin
│   │   └── ui/                   # Badge e componentes de UI
│   └── lib/                      # db.ts, storage.ts, utils.ts, image-utils.ts
└── middleware.ts                 # Middleware de autenticacao
```

## Rotas

| Rota | Arquivo | Descricao |
|------|---------|-----------|
| `/` | `(dashboard)/page.tsx` | Dashboard com stats, hero, insights IA, calendario |
| `/books` | `(dashboard)/books/page.tsx` | Devocional (lista lateral + grid responsivo de cards) |
| `/planning` | `(dashboard)/planning/page.tsx` | Planejamento teologico |
| `/reports` | `(dashboard)/reports/page.tsx` | Relatorios (filtros, graficos, tabela por usuario) |
| `/profile` | `(dashboard)/profile/page.tsx` | Perfil do usuario |
| `/admin` | `(dashboard)/admin/page.tsx` | Painel admin (7 abas) |
| `/session/[id]` | `(dashboard)/session/[id]/page.tsx` | Detalhe da sessao |
| `/login` | `(auth)/login/page.tsx` | Login |
| `/invite/[token]` | `(auth)/invite/[token]/page.tsx` | Aceitar convite |
| `/reset-password/[token]` | `(auth)/reset-password/[token]/page.tsx` | Redefinir senha |

## Endpoints de API

| Grupo | Endpoint | Descricao |
|-------|----------|-----------|
| Auth | `/api/auth/[...nextauth]` | NextAuth (login/session) |
| Auth | `/api/auth/forgot-password` | Enviar email de redefinicao |
| Auth | `/api/auth/reset-password` | Redefinir senha com token |
| Auth | `/api/auth/validate-reset-token` | Validar token de redefinicao |
| Profile | `/api/profile/password` | Alterar senha (logado) |
| Profile | `/api/profile/account` | Soft delete (LGPD) |
| Profile | `/api/profile/photo/[userId]` | Foto de perfil |
| Admin | `/api/admin/permissions` | GET/PATCH permissoes |
| Admin | `/api/admin/users/[id]` | Editar/desativar usuario |
| Admin | `/api/admin/users/[id]/zoom-identifiers` | Zoom IDs do usuario |
| Admin | `/api/admin/webhooks` | CRUD webhooks |
| Admin | `/api/admin/settings/schedules` | Horarios agendados |
| Admin | `/api/admin/reading-plans/[id]/retroactive` | Processamento retroativo |
| Admin | `/api/admin/reading-plans/[id]/days/[dayId]/chapters` | Marcar capitulos |
| Admin | `/api/admin/notebooklm-session` | Sessao NotebookLM |
| Admin | `/api/admin/notebooklm-setup` | Setup NotebookLM |
| Admin | `/api/admin/cleanup` | Limpar banco (SUPER_ADMIN) |
| Bible | `/api/bible/versions` | Listar versoes PT (Holy Bible API) |
| Bible | `/api/bible/content/[versionId]/[chapterId]` | Texto do capitulo (Holy Bible API + YouVersion) |
| Bible | `/api/bible/audio/[versionId]/[chapterId]` | URL audio MP3 + timestamps por versiculo (Bible.is) |
| Bible | `/api/bible/context` | Contexto devocional (plano ativo) |
| Planning | `/api/planning/current` | Plano ativo com cards |
| Planning | `/api/planning/cards/[planId]` | Cards de um plano |
| Planning | `/api/planning/card/[cardId]` | Detalhe de um card |
| Planning | `/api/planning/generate/[planId]` | Gerar cards via IA |
| Search | `/api/search` | Busca inteligente |
| Reports | `/api/reports/presence` | Dados de presenca |
| Reports | `/api/reports/frequency` | Frequencia semanal/mensal |
| Reports | `/api/reports/evolution` | Evolucao (grafico linha) |
| Reports | `/api/reports/hours` | Horas de devocional |
| Reports | `/api/reports/books-distribution` | Distribuicao por livro |
| Sessions | `/api/sessions/[id]` | Detalhe da sessao |
| Sessions | `/api/sessions/[id]/adjacent` | Sessoes adjacentes |
| Sessions | `/api/sessions/[id]/verify-password` | Verificar senha |
| Dashboard | `/api/dashboard/day-summary` | Resumo do dia |
| Attendance | `/api/attendance/user/[id]` | Presenca por usuario |
| Pipeline | `/api/pipeline/run` | Executar pipeline |
| Cron | `/api/cron/check` | Health check |
| Files | `/api/files/[id]` | Servir arquivos |
| Invite | `/api/invite/[token]` | Aceitar convite |
| Webhook | `/api/webhook/[slug]` | Webhooks Zoom |

## Design System v3 (`globals.css`)

- CSS em `src/app/globals.css` — Design system v3 com CSS custom properties (:root + [data-theme="dark"])
- ATENCAO: NAO usar `@theme` inline do Tailwind v4 — apenas CSS custom properties padrao
- Dark mode (tema principal): bg `#0c0c0e`, surface `#141416`, accent `#f5a623`
- Light mode: bg `#f5f5f7`, surface `#ffffff`, accent `#c7910a`
- Cores SEMPRE via `var()`: `var(--text)`, `var(--accent)`, `var(--surface)`, etc.
- NUNCA usar cores hardcoded (#hex) em componentes — sempre CSS variables
- Classes de layout: `.dashboard-two-col`, `.books-layout`, `.reports-top-grid`, `.session-detail-grid`
- Classes de reports: `.reports-stat-card`, `.reports-chart-card`, `.reports-table-card`, `.reports-table`
- Dark mode: `data-theme="dark"` no `<html>`, salvo em localStorage como `devhub-theme`
- Responsive breakpoints: Mobile (<768px), Small tablet (480-767px), Tablet (768-1023px), Desktop (1024-1279px), Large (>=1440px)

### Navegacao (Sidebar)
- Menu principal: Inicio (/), Devocional (/books), Planejamento (/planning), Progresso (/reports)
- Admin: Painel Admin (/admin)
- "Meu Perfil" acessivel pelo clique no nome do usuario (rodape sidebar)

## Modelos do Banco (Prisma)

- **User:** email, password?, name, role (SUPER_ADMIN/ADMIN/SUBSCRIBER_VIP/SUBSCRIBER/MEMBER), church, team, subTeam, photoUrl, whatsapp?, deletedAt?, deletedBy?, inviteToken
- **Session:** date, startTime?, zoomMeetingId, zoomUuid, chapterRef, summary, contentPassword?, status, relatedSessionIds[], documents[], participants[]
- **Participant:** name, email, joinTime, leaveTime, duration, totalDuration, entries[]
- **ParticipantEntry:** joinTime, leaveTime, duration (log de cada entrada/saida)
- **Document:** type (TRANSCRIPT_RAW/CLEAN, BIBLE_TEXT, INFOGRAPHIC, SLIDES, AUDIO_OVERVIEW, AI_SUMMARY, PLANNING), fileName, storagePath
- **Permission:** resource (unique), minRole (controle de acesso configuravel)
- **PasswordResetToken:** userId, token, expiresAt, usedAt?
- **ChapterReading:** dayId, chapter, isComplete, isPartial, sessions, completedAt?
- **PlanningCard:** planId, bookName, bookCode, chapter, analysis, references, studyLinks[], imageUrls[], themeGroup?
- **ReadingPlanDay:** planId, date, chapters, completed, logNote?, actualChapters?, chapterReadings[]
- **Webhook:** name, slug, active
- **AppSetting:** key-value (mainSpeakerName, zoomMeetingId, aiModel)

### Enum UserRole
```
SUPER_ADMIN (100) — Controle total
ADMIN (80) — Equipe de manutencao
SUBSCRIBER_VIP (60) — Assinante VIP (futuro)
SUBSCRIBER (40) — Assinante (futuro)
MEMBER (20) — Participante regular
```

## Pipeline de Processamento

1. Webhook Zoom (`meeting.ended`) → recebe meeting_id + uuid
2. Aguarda 5min para VTT ficar pronto
3. Baixa VTT via `GET /meetings/{uuid}/recordings` (file_type=TRANSCRIPT)
4. UUID com `/` ou `+` precisa de duplo URL-encode (%252F, %252B)
5. Deduplicacao de participantes (agrupa por email, multiplas entradas/saidas → ParticipantEntry)
6. Triagem teologica da transcricao (remove nomes, corrige fatos biblicos, mantem interpretacoes)
7. Deteccao de multi-sessao (verifica se capitulo ja tem sessao anterior, sinais de continuidade)
8. Processa transcricao com IA (cascata de fallbacks)
9. Busca texto biblico NVI via Holy Bible API (gratuita, sem chave)
10. Gera pesquisa teologica + Knowledge Base unificada
11. Extrai senha da transcricao (se mencionada)
12. NotebookLM: cria notebook com KB rica, gera slides + infografico + video resumo
13. Salva tudo no banco + storage local

## Cascata de IA (callAI)

OpenAI como primario (modelo configuravel via admin), fallback automatico para gratuitos:

1. **OpenAI** — Modelo selecionado no admin (padrao: `gpt-4.1-mini`) — `OPENAI_API_KEY`
2. Nemotron 120B (`nvidia/nemotron-3-super-120b-a12b:free`) — OpenRouter (fallback gratuito)
3. Step 3.5 Flash (`stepfun/step-3.5-flash:free`) — OpenRouter (fallback gratuito)
4. Nemotron 30B (`nvidia/nemotron-3-nano-30b-a3b:free`) — OpenRouter (fallback gratuito)
5. Gemini 2.5 Flash — Google API direta (fallback gratuito)
6. Erro com log de todas as falhas

O modelo OpenAI pode ser alterado no painel admin (aba "IA") sem necessidade de deploy.
Modelos disponiveis: gpt-4.1-mini, gpt-4.1, gpt-4.1-nano, gpt-4o, gpt-4o-mini, o4-mini, o3, o3-mini

## Infraestrutura

- Dominio: devocional.nexusai360.com (Cloudflare DNS)
- Docker Swarm via Portainer (painel.nexusai360.com, Stack ID: 86)
- Rede: rede_nexusAI (overlay)
- Traefik: reverse proxy + Let's Encrypt SSL + HSTS
- GHCR: ghcr.io/jvzanini/devocional-hub:latest
- GitHub: github.com/jvzanini/Devocional-Hub

## Credenciais (definidas APENAS no Portainer, NUNCA no codigo)

- Todas as credenciais sao configuradas via variaveis de ambiente no Portainer
- No repositorio, usar SEMPRE valores genericos (YOUR_*, changeme, etc.)
- NUNCA commitar senhas, API keys, tokens ou emails reais no Git
- Variaveis usadas: ADMIN_EMAIL, ADMIN_PASSWORD, SMTP_USER, SMTP_PASS, ZOOM_*, OPENAI_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, GOOGLE_EMAIL, GOOGLE_PASSWORD

## Seguranca — REGRAS OBRIGATORIAS

- NUNCA commitar credenciais, senhas, API keys, tokens ou emails reais no Git
- Arquivos com credenciais (portainer-stack.yml, docker-compose.yml) devem ter SEMPRE valores genericos no repositorio
- As credenciais reais ficam APENAS no Portainer (variaveis de ambiente da stack)
- Antes de cada commit, verificar se nao ha dados sensiveis nos arquivos alterados
- O .env esta no .gitignore e NUNCA deve ser commitado

## Gotchas Criticos

- NUNCA usar `@theme inline` do Tailwind v4 — as CSS variables nao existem em runtime no Docker
- SEMPRE usar CSS hardcoded em globals.css ou inline styles para estilos visuais
- O `npm ci` no Dockerfile PRECISA de `--legacy-peer-deps`
- O `prisma db push` no entrypoint PRECISA de `--skip-generate` (EACCES no /app)
- A senha do PostgreSQL tem `@` — usar `%40` na DATABASE_URL
- Cloudflare esta em modo "DNS only" (sem proxy) — SSL e pelo Traefik/Let's Encrypt
- O browser do usuario pode cachear versao HTTP — HSTS esta configurado mas pode precisar de hard refresh
- PostgreSQL roda APENAS na VPS (Docker Swarm), NUNCA localmente — `npm run build` trava local
- NVT usa class="s" (sem numero) alem de class="s1" para headings — regex precisa aceitar ambos

## Git

- Branch: main
- Commit messages em portugues, descritivos
- Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
- CI/CD: .github/workflows/deploy.yml (build Docker + deploy Portainer)

## Convencoes de Codigo

- Responder SEMPRE em portugues brasileiro
- Usar acentos corretos (UTF-8 direto, NUNCA unicode escapes \u00XX)
- camelCase para variaveis/funcoes, PascalCase para componentes
- Inline styles para layout (style={{ }}) — mais confiavel que Tailwind em producao
- CSS classes hardcoded em globals.css para design visual (cards, buttons, inputs, badges)
- Imports: `@/features/<feature>/lib/<module>`, `@/features/<feature>/components/<Component>`, `@/shared/lib/<module>`
