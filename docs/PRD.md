# PRD — DevocionalHub

> **Versao:** 2.0
> **Data:** 2026-03-22
> **Autor:** Joao Vitor Zanini
> **Status:** Em Producao (v2 + Hotfix v2.1 + Bible Bubble v5)

---

## Indice

1. [Visao Geral](#1-visao-geral)
2. [Publico-Alvo e Personas](#2-publico-alvo-e-personas)
3. [Stack Tecnica](#3-stack-tecnica)
4. [Arquitetura do Sistema](#4-arquitetura-do-sistema)
5. [Funcionalidades](#5-funcionalidades)
6. [Pipeline de Processamento](#6-pipeline-de-processamento)
7. [Bible Bubble v5](#7-bible-bubble-v5)
8. [Integracoes Externas](#8-integracoes-externas)
9. [Seguranca e Conformidade](#9-seguranca-e-conformidade)
10. [Infraestrutura e Deploy](#10-infraestrutura-e-deploy)
11. [Modelo de Dados](#11-modelo-de-dados)
12. [Endpoints de API](#12-endpoints-de-api)
13. [Design System](#13-design-system)
14. [Historico de Versoes](#14-historico-de-versoes)

---

## 1. Visao Geral

### 1.1 O que e o DevocionalHub

O **DevocionalHub** e uma plataforma web de devocionais inteligentes que automatiza todo o fluxo de processamento de reunioes de estudo biblico realizadas via Zoom. Desde a captura da gravacao ate a geracao de materiais de estudo enriquecidos por inteligencia artificial — transcricao, resumo, texto biblico, slides, infografico e video resumo via NotebookLM.

A plataforma atende lideres e membros de grupos devocionais, oferecendo:
- **Automacao completa**: Zoom -> IA -> conteudo rico -> dashboard
- **Controle de presenca**: Sincronizacao automatica com participantes do Zoom
- **Planos de leitura biblica**: Acompanhamento diario por usuario
- **Gestao de usuarios**: Convites por email, hierarquia de 5 niveis de acesso
- **Biblia interativa**: Leitura com audio, busca, formatacao YouVersion e player integrado
- **Planejamento teologico**: Cards de estudo gerados por IA para cada capitulo

### 1.2 Problema Resolvido

Grupos de estudo biblico perdem conteudo valioso das discussoes porque nao ha registro estruturado. O DevocionalHub resolve isso automatizando a captura, processamento e organizacao de todo o conteudo gerado nas reunioes, transformando gravacoes brutas em materiais de estudo ricos e acessiveis.

### 1.3 Proposta de Valor

- **Zero esforco manual**: O pipeline processa tudo automaticamente apos o fim da reuniao Zoom
- **Conteudo enriquecido por IA**: Resumos, pesquisa teologica, slides, infograficos e videos resumo
- **Acompanhamento de leitura**: Planos de leitura com checklist diario e progresso visual
- **Acesso protegido**: Conteudo sensivel protegido por senha extraida automaticamente da transcricao

### 1.4 Referencias

- **Repositorio**: [github.com/jvzanini/Devocional-Hub](https://github.com/jvzanini/Devocional-Hub)
- **Dominio**: [devocional.nexusai360.com](https://devocional.nexusai360.com)
- **Portainer**: [painel.nexusai360.com](https://painel.nexusai360.com) (Stack ID: 86)
- **n8n**: [n8napp.nexusai360.com](https://n8napp.nexusai360.com)

---

## 2. Publico-Alvo e Personas

| Persona | Role | Nivel | Descricao | Necessidades |
|---------|------|-------|-----------|-------------|
| **Super Admin** | `SUPER_ADMIN` | 100 | Lider/criador da plataforma | Controle total, analytics, configuracoes, pipeline, planejamento, gerenciamento de IA |
| **Admin** | `ADMIN` | 80 | Equipe de manutencao | Gerenciamento de usuarios, conteudo, relatorios, webhooks |
| **Assinante VIP** | `SUBSCRIBER_VIP` | 60 | Membro premium (futuro) | Acesso a conteudo exclusivo, funcionalidades avancadas |
| **Assinante** | `SUBSCRIBER` | 40 | Membro pagante (futuro) | Acesso a conteudo protegido |
| **Membro** | `MEMBER` | 20 | Participante regular | Dashboard, presenca, leitura, perfil, biblia interativa |

A hierarquia de permissoes e implementada em `src/features/permissions/lib/role-hierarchy.ts` com guards em `permission-guard.ts`. O painel admin permite configurar o nivel minimo de acesso para cada recurso (arquivos do card devocional e menus).

---

## 3. Stack Tecnica

### 3.1 Runtime e Framework

| Tecnologia | Versao | Uso |
|-----------|--------|-----|
| **Node.js** | 20 | Runtime (imagem base: `node:20-bookworm-slim`) |
| **Next.js** | 16 | Framework full-stack (App Router, SSR, API Routes) |
| **React** | 19 | Biblioteca de UI |
| **TypeScript** | 5 | Linguagem principal (strict mode) |

### 3.2 Frontend

| Tecnologia | Uso |
|-----------|-----|
| **Tailwind CSS 4** | Utilitarios de estilo (sem `@theme inline` — incompativel com Docker) |
| **CSS Custom Properties** | Design System v3 em `globals.css` (dark/light mode via `var()`) |
| **Recharts** | Graficos interativos (pizza, barras, linha) |
| **Inline Styles** | Layout — mais confiavel que Tailwind em producao |

### 3.3 Backend e Dados

| Tecnologia | Uso |
|-----------|-----|
| **Prisma** | 5 — ORM (15 models, schema em `prisma/schema.prisma`) |
| **PostgreSQL** | 16 — Banco de dados relacional (via Docker Swarm, host: `postgres`) |
| **NextAuth** | v5 beta — Autenticacao (Credentials provider, JWT strategy, `trustHost: true`) |
| **bcryptjs** | Hashing de senhas |
| **Nodemailer** | Envio de emails (Gmail SMTP) |
| **sharp** | v0.34.5 — Compressao de imagens de perfil |

### 3.4 IA e Automacao

| Tecnologia | Uso |
|-----------|-----|
| **OpenAI API** | Provedor primario de IA (modelo configuravel via admin, padrao: `gpt-4.1-mini`) |
| **OpenRouter API** | Fallback gratuito (Nemotron 120B, Step 3.5 Flash, Nemotron 30B) |
| **Google Gemini API** | Fallback gratuito (Gemini 2.5 Flash) |
| **Playwright** | 1.58 — Automacao headless do NotebookLM (Chromium bundled, Debian Bookworm) |

### 3.5 Infraestrutura

| Tecnologia | Uso |
|-----------|-----|
| **Docker Swarm** | Orquestracao de containers |
| **Portainer** | Gerenciamento visual de stacks/containers |
| **GitHub Actions** | CI/CD (build Docker + deploy no Portainer) |
| **GHCR** | GitHub Container Registry (`ghcr.io/jvzanini/devocional-hub:latest`) |
| **Traefik** | Reverse proxy + SSL automatico (Let's Encrypt) + HSTS |
| **Cloudflare** | DNS (modo "DNS only", sem proxy) |

---

## 4. Arquitetura do Sistema

### 4.1 Estilo Arquitetural

**Monolito Modular** com arquitetura baseada em features (feature-based architecture). Cada dominio de negocio e isolado dentro de `src/features/`, promovendo alta coesao e baixo acoplamento.

### 4.2 Estrutura de Diretorios

```
src/
├── app/                          # Camada de roteamento (Next.js App Router)
│   ├── (auth)/                   # Paginas publicas (login, convite) — sem sidebar
│   ├── (dashboard)/              # Paginas autenticadas — com sidebar
│   │   ├── layout.tsx            # Layout compartilhado: Sidebar + auth check
│   │   ├── page.tsx              # Dashboard (stats, hero, insights IA, calendario)
│   │   ├── books/page.tsx        # Devocional (lista lateral + grid de cards)
│   │   ├── planning/page.tsx     # Planejamento teologico
│   │   ├── reports/page.tsx      # Relatorios (filtros, graficos, tabela)
│   │   ├── admin/page.tsx        # Painel admin (7 abas com icones)
│   │   ├── profile/page.tsx      # Perfil do usuario
│   │   └── session/[id]/page.tsx # Detalhe da sessao
│   ├── api/                      # 52 endpoints REST
│   ├── layout.tsx                # Root layout (fontes, tema, providers)
│   └── globals.css               # Design System v3 (CSS custom properties + dark mode)
├── features/                     # Dominios de negocio isolados
│   ├── auth/lib/                 # Autenticacao (NextAuth v5 config)
│   ├── sessions/                 # Sessoes e controle de presenca
│   ├── dashboard/components/     # Dashboard (calendario, stats, hero, insights IA)
│   ├── admin/components/         # Painel administrativo
│   ├── search/                   # Busca inteligente
│   ├── bible/                    # Textos biblicos (componentes e libs)
│   ├── bible-reader/             # Biblia interativa (bubble + player + seletores)
│   ├── permissions/lib/          # Sistema de permissoes multi-nivel
│   ├── planning/                 # Modulo de planejamento teologico
│   ├── pipeline/lib/             # Orquestracao: ai.ts, pipeline.ts, notebooklm.ts
│   ├── zoom/lib/                 # Integracao Zoom (OAuth, recordings, participants)
│   └── email/lib/                # Envio de emails (Gmail SMTP)
├── shared/                       # Codigo compartilhado entre features
│   ├── components/               # Sidebar, Badge, componentes de UI
│   └── lib/                      # db.ts (Prisma singleton), storage.ts, utils.ts, image-utils.ts
└── middleware.ts                 # Middleware de autenticacao
```

### 4.3 Padroes de Design

| Padrao | Localizacao | Descricao |
|--------|-------------|-----------|
| Feature-Based Architecture | `src/features/` | Cada dominio isolado com componentes + libs proprios |
| Cascata/Fallback | `pipeline/lib/ai.ts` | Cadeia de provedores de IA com fallback automatico |
| Pipeline Webhook-Driven | `pipeline/lib/pipeline.ts` | Zoom `meeting.ended` dispara processamento completo |
| Singleton | `shared/lib/db.ts` | Prisma Client singleton via `globalThis` |
| JWT Authentication | `features/auth/` | NextAuth v5 com estrategia JWT |
| Route Groups | `app/(auth)`, `app/(dashboard)` | Isolamento de layouts via agrupamento de rotas |
| RBAC | `features/permissions/` | Controle de acesso baseado em roles com 5 niveis |

### 4.4 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                    │
│                                                                     │
│   Zoom Cloud ──webhook──►  Cloudflare DNS ──►  Traefik (SSL)       │
│                                                      │              │
│                                              ┌───────▼────────┐     │
│                                              │  Next.js App   │     │
│                                              │  (App Router)  │     │
│                                              └───────┬────────┘     │
│                                                      │              │
│                    ┌─────────────┬───────────────┬────┴──────┐      │
│                    │             │               │           │      │
│              ┌─────▼────┐ ┌─────▼────┐ ┌───────▼───┐ ┌────▼────┐  │
│              │ Pipeline │ │ Auth/    │ │  Bible    │ │ Admin  │  │
│              │ (IA +    │ │ Perms   │ │  Reader   │ │ Panel  │  │
│              │ NotebookLM│ │         │ │           │ │        │  │
│              └─────┬────┘ └─────────┘ └───────────┘ └────────┘  │
│                    │                                              │
│         ┌──────────┼──────────┐                                  │
│         │          │          │                                    │
│   ┌─────▼──┐ ┌────▼───┐ ┌──▼──────┐                             │
│   │ OpenAI │ │OpenRou-│ │ Gemini  │         ┌────────────┐       │
│   │  API   │ │  ter   │ │  API    │         │ PostgreSQL │       │
│   └────────┘ └────────┘ └────────┘          │    16      │       │
│                                              └────────────┘       │
│         ┌────────────┐  ┌──────────────┐                          │
│         │ NotebookLM │  │  Bible APIs  │                          │
│         │(Playwright)│  │ Holy Bible + │                          │
│         │            │  │ Bible.is +   │                          │
│         │            │  │ YouVersion   │                          │
│         └────────────┘  └──────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Funcionalidades

### 5.1 Dashboard (`/`)

Pagina inicial autenticada com visao geral do devocional.

**Componentes:**
- **Hero Section**: Mensagem de boas-vindas com insights gerados por IA
- **Cards de Estatisticas**: Total de sessoes, participacoes, horas de devocional, frequencia media
- **Calendario Interativo**: Visualizacao mensal do plano de leitura
  - Dias passados: cor amber escura
  - Dias futuros: cor vibrante
  - Dia atual: bolinha branca indicativa
  - Abreviacoes de livros com case correto (Rm, Gn, Mt)
- **Grafico de Distribuicao**: Pizza com distribuicao por livro biblico (total no centro, legendas integradas)

### 5.2 Devocional / Books (`/books`)

Listagem e visualizacao das sessoes devocionais.

**Componentes:**
- **Lista Lateral**: Menu com livros e contagem de sessoes
- **Grid de Cards**: Cards de sessao com layout vertical
  - Referencia biblica, data, participantes (deduplicados por email/nome)
  - Badge de tempo verde, check verde para sessoes concluidas
  - AI Summary (resumo gerado por IA)
  - Trilha com expand/collapse, horarios de inicio/fim e ano completo
- **Navegacao**: Setas para sessoes adjacentes (filtra sessoes com erro), botao Voltar -> `/books`
- **Busca Inteligente**: Filtro por termo em sessoes, livros e participantes

### 5.3 Detalhe da Sessao (`/session/[id]`)

Pagina completa de uma sessao devocional.

**Componentes:**
- **Informacoes**: Data, horario, referencia biblica, resumo IA
- **Participantes**: Lista deduplicada com log de entradas/saidas (ParticipantEntry)
- **Documentos Protegidos**: Modal de senha para SLIDES, INFOGRAPHIC, AUDIO_OVERVIEW
  - PDF visualizado via iframe, video via player nativo
  - Desbloqueio persistido via `sessionStorage`
  - Label "Video Resumo (PT-BR)" para Audio Overview
- **Bible Bubble**: Acesso direto a Biblia interativa no capitulo da sessao

### 5.4 Biblia Interativa — Bible Bubble (`/books`, flutuante)

Componente flutuante para leitura biblica integrada ao contexto do devocional. Detalhado na [Secao 7](#7-bible-bubble-v5).

### 5.5 Planejamento Teologico (`/planning`)

Modulo de cards de estudo gerados por IA para cada capitulo do plano de leitura.

**Componentes:**
- **Organizacao por Livros**: Pastas colapsaveis com expand/collapse por livro e capitulo
- **Cards de Planejamento**: Analise teologica, referencias biblicas cruzadas, links de estudo, imagens
- **Geracao por IA**: Botao para gerar cards via `callAI` com analise profunda do capitulo
- **Renderizacao Markdown**: Textos com formatacao rica (nao asteriscos crus)

### 5.6 Relatorios (`/reports`)

Dashboard analitico com metricas de presenca e engajamento.

**Componentes:**
- **4 Cards Principais**: Total de Presencas, Membros Unicos, Frequencia Media, Duracao Media
- **Filtros em Linha Horizontal**: Livro, Igreja, Equipe, SubEquipe, Usuario (filtros por role — nao-admin ve apenas filtro de Livro)
- **Graficos**: Barras (frequencia semanal/mensal), linha (evolucao), pizza (distribuicao por livro)
- **Tabela por Usuario**: Detalhamento individual com presencas e horas
- **Toggle**: Visualizacao semanal/mensal/anual
- **Exportacao**: Download em CSV

### 5.7 Painel Admin (`/admin`)

Centro de controle para administradores com 7 abas.

**Abas:**
1. **Usuarios**: CRUD, convites por email, edicao de roles, ZoomIdentifiers
2. **Webhooks**: Gerenciamento de webhooks Zoom (nome, slug, ativo/inativo)
3. **Configuracoes**: AppSettings (mainSpeakerName, zoomMeetingId), horarios agendados
4. **Pipeline**: Execucao manual, status, cleanup do banco (SUPER_ADMIN)
5. **IA**: Selecao de modelo OpenAI (gpt-4.1-mini, gpt-4.1, gpt-4.1-nano, gpt-4o, etc.) — alteravel sem deploy
6. **NotebookLM**: Setup e sessao Google para automacao Playwright
7. **Permissoes**: Configuracao de nivel minimo de acesso por recurso (arquivos e menus)

### 5.8 Perfil do Usuario (`/profile`)

**Acesso**: Clique no nome do usuario no rodape da sidebar.

**Funcionalidades:**
- Foto de perfil com upload (ate 5MB, compressao automatica via sharp), persistencia em volume Docker (`/app/data/user-photos/`)
- Edicao de nome, WhatsApp (obrigatorio), nivel de acesso (somente visualizacao)
- Redefinir senha (modal)
- Apagar conta (soft delete com conformidade LGPD — mantem email, nome, igreja, WhatsApp; remove senha, foto, dados vinculados)
- Feedback via toast (position fixed, sem empurrar layout)

### 5.9 Login (`/login`)

- Frase: "Sua plataforma de devocionais inteligentes"
- Logo e fonte grandes
- Esqueci senha: formulario inline (sem modal/popup sobreposto)
- Fluxo: email -> link de redefinicao -> nova senha + confirmar WhatsApp

### 5.10 Sidebar

- **Menu**: Inicio (/), Devocional (/books), Planejamento (/planning), Relatorios (/reports)
- **Admin**: Painel Admin (/admin) — visivel apenas para ADMIN+
- **Perfil**: Clique no nome do usuario no rodape
- **Logo**: DevocionalHub com tamanho grande
- **Responsivo**: Hamburger menu no mobile

---

## 6. Pipeline de Processamento

### 6.1 Fluxo Completo

```
Webhook Zoom (meeting.ended)
        │
        ▼
1. Validacao do webhook secret
2. Aguarda 5 minutos (VTT ficar disponivel)
3. Busca VTT via GET /meetings/{uuid}/recordings (file_type=TRANSCRIPT)
   └── Fallback: Meeting Summary AI Companion
4. Salva transcript-raw
5. Busca lista de participantes do Zoom
6. Triagem teologica da transcricao:
   └── Remove nomes pessoais, musica, comentarios irrelevantes
   └── Corrige fatos biblicos comprovanamente errados
   └── Mantem interpretacoes do palestrante
7. Detecta multi-sessao (capitulo ja tem sessao anterior?)
8. Meeting Summary → usa direto | VTT → callAI (cascata)
9. Salva transcript-clean + busca texto biblico NVI (Holy Bible API)
10. Gera pesquisa teologica (callAI)
    └── Hebraico/grego, contexto historico, aplicacao pratica
11. Constroi Knowledge Base unificada
12. Extrai senha da transcricao (se mencionada)
13. Deduplicacao de participantes (agrupa por email, multiplas entradas/saidas)
14. NotebookLM (Playwright stealth):
    └── Login Google (sessao importada via export-google-session.mjs)
    └── Cria notebook com KB rica (nome padronizado: "{Livro} {Capitulo}")
    └── Gera: Slides PDF, Infografico PDF, Video Resumo
15. Sync presencas + lock ZoomIdentifier
16. Auto-ajuste plano de leitura
17. Status → COMPLETED
```

### 6.2 Cascata de IA (`callAI`)

A funcao `callAI` implementa uma cadeia de fallback entre provedores de IA, garantindo que o sistema nunca pare:

| Prioridade | Provedor | Modelo | Tipo |
|-----------|----------|--------|------|
| 1 | **OpenAI** | Configuravel via admin (padrao: `gpt-4.1-mini`) | Pago (primario) |
| 2 | **OpenRouter** | `nvidia/nemotron-3-super-120b-a12b:free` | Gratuito (fallback) |
| 3 | **OpenRouter** | `stepfun/step-3.5-flash:free` | Gratuito (fallback) |
| 4 | **OpenRouter** | `nvidia/nemotron-3-nano-30b-a3b:free` | Gratuito (fallback) |
| 5 | **Google** | Gemini 2.5 Flash (API direta) | Gratuito (fallback) |
| 6 | — | Erro com log de todas as falhas | — |

O modelo OpenAI pode ser alterado no painel admin (aba "IA") sem necessidade de deploy. Modelos disponiveis: gpt-4.1-mini, gpt-4.1, gpt-4.1-nano, gpt-4o, gpt-4o-mini, o4-mini, o3, o3-mini.

### 6.3 Funcoes de IA Especializadas

| Funcao | Descricao |
|--------|-----------|
| `callAI()` | Funcao principal com cascata de fallback |
| `generateTheologicalResearch()` | Pesquisa teologica rica (hebraico/grego, contexto historico, aplicacao) |
| `buildNotebookKnowledgeBase()` | KB unificada otimizada para NotebookLM |
| `extractSessionPassword()` | Extrai senha mencionada na transcricao |

### 6.4 Documentos Gerados

| DocType | Descricao | Protegido |
|---------|-----------|-----------|
| `TRANSCRIPT_RAW` | Transcricao bruta do VTT | Nao |
| `TRANSCRIPT_CLEAN` | Transcricao processada pela IA | Nao |
| `BIBLE_TEXT` | Texto biblico NVI do capitulo | Nao |
| `AI_SUMMARY` | Resumo gerado pela IA | Nao |
| `SLIDES` | Apresentacao em PDF (NotebookLM) | Sim |
| `INFOGRAPHIC` | Infografico em PDF (NotebookLM) | Sim |
| `AUDIO_OVERVIEW` | Video resumo em PT-BR (NotebookLM) | Sim |
| `PLANNING` | Card de planejamento teologico | Nao |

---

## 7. Bible Bubble v5

### 7.1 Visao Geral

A Biblia Interativa e implementada como um componente flutuante (bubble) que permite leitura no contexto do devocional. Na versao 5, a formatacao de texto vem diretamente do YouVersion (bible.com), eliminando a dependencia de IA para formatacao.

### 7.2 Fontes de Dados

```
Frontend → /api/bible/versions → version-discovery.ts → 12 versoes PT (4 com audio)
Frontend → /api/bible/content  → holy-bible-client.ts → holy-bible-api.com (texto)
                                → youversion-client.ts → bible.com (formatacao: titulos, paragrafos, poesia)
Frontend → /api/bible/audio    → bible-is-audio.ts → live.bible.is (NVI/NAA/NTLH/NVT)
Frontend → /api/bible/context  → devocional-context.ts → Prisma (plano de leitura ativo)
```

### 7.3 Formatacao YouVersion (sem IA)

- **Titulos de secao**: Extraidos via `__NEXT_DATA__` JSON do HTML do bible.com
- **Paragrafos e poesia**: Classes `s1`, `p`, `q1`, `q2`, `m` transformadas em classes CSS proprias
- **Cache 24h** em memoria (Map no servidor)
- **Fallback**: Holy Bible API (texto sem titulos de secao)

**Mapeamento de versoes (Holy Bible API -> YouVersion):**

| Holy Bible API | YouVersion | Versao |
|---------------|-----------|--------|
| 644 | 129 | NVI |
| 635 | 1608 | ARA |
| 637 | 212 | ARC |
| 641 | 1840 | NAA |
| 645 | 1930 | NVT |
| 643 | 211 | NTLH |

**Classes CSS:**
- `.bible-section-title` — Titulos de secao
- `.bible-paragraph` — Paragrafos
- `.bible-poetry-1` — Poesia nivel 1 (identacao simples)
- `.bible-poetry-2` — Poesia nivel 2 (identacao dupla)

### 7.4 Audio Player

**Versoes com audio versao-especifico (Bible.is/FCBH):**

| Versao | NT Fileset | OT Fileset |
|--------|-----------|-----------|
| NVI | PORNVIN1DA | PORNVIO1DA |
| NAA | PORBBSN1DA | PORBBSO1DA |
| NTLH | PO1NLHN1DA | PO1NLHO1DA |
| NVT | PORTHFN1DA | PORTHFO1DA |

**Funcionalidades do player:**
- Inicia colapsado e pausado (sem autoplay)
- Drag-to-seek (mouse + touch)
- Controle de velocidade (0.5x a 2x) com fix para mobile (pause -> alterar rate -> seek posicao exata -> requestAnimationFrame -> resume)
- Navegacao prev/next entre capitulos (flutuante)
- Cache de posicao via `localStorage` (24h)
- Labels de capitulo quando colapsado (ex: "← Romanos 9 [Play] Romanos 11 →")
- Seta expandir/recolher

### 7.5 Controle de Tamanho da Fonte

- Botao "Aa" no header da Biblia (a direita da lupa)
- Ciclo: normal (17px) -> medio (20px) -> grande (24px)
- Persistencia via `localStorage` (`devhub-bible-fontsize`)

### 7.6 UX da Bubble

- 15% maior que versoes anteriores, com label "Abrir Biblia"
- Cursor mao (pointer) ao passar sobre + tooltip
- Esconde automaticamente quando modal esta aberto
- Subida 20px para nao sobrepor conteudo
- Anti-zoom iOS no input de busca
- Scroll lock total no mobile quando modal aberto
- Busca client-side no capitulo com highlight (ignora acentos/pontuacao)
- Seletores com transicoes suaves, separacao AT/NT com fonte maior

---

## 8. Integracoes Externas

### 8.1 Zoom

| Recurso | Descricao |
|---------|-----------|
| **OAuth** | Server-to-Server (Client ID + Secret + Account ID) |
| **Webhook** | `meeting.ended` — dispara pipeline automaticamente |
| **Recordings** | `GET /meetings/{uuid}/recordings` — download VTT |
| **Participants** | Lista de participantes com horarios de entrada/saida |
| **UUID Encoding** | `/` e `+` precisam duplo URL-encode (`%252F`, `%252B`) |

### 8.2 OpenAI

| Recurso | Descricao |
|---------|-----------|
| **Endpoint** | API REST padrao |
| **Modelo** | Configuravel via admin (padrao: `gpt-4.1-mini`) |
| **Uso** | Provedor primario para todas as funcoes de IA |
| **Chave** | `OPENAI_API_KEY` (Portainer + GitHub Secrets) |

### 8.3 OpenRouter

| Recurso | Descricao |
|---------|-----------|
| **Endpoint** | `https://openrouter.ai/api/v1/chat/completions` |
| **Modelos** | Nemotron 120B, Step 3.5 Flash, Nemotron 30B (todos gratuitos) |
| **Uso** | Fallback automatico quando OpenAI falha |
| **Chave** | `OPENROUTER_API_KEY` |

### 8.4 Google Gemini

| Recurso | Descricao |
|---------|-----------|
| **Modelo** | Gemini 2.5 Flash |
| **Uso** | Ultimo fallback na cascata de IA |
| **Chave** | `GEMINI_API_KEY` |

### 8.5 Holy Bible API

| Recurso | Descricao |
|---------|-----------|
| **URL** | `https://holy-bible-api.com/bibles/{id}/books/{book}/chapters/{ch}/verses` |
| **Versoes** | 12 versoes PT (NVI, ARA, ARC, NAA, NVT, NTLH, Almeida, NBV, OL, TB, CAP, BPT) |
| **Uso** | Texto biblico para exibicao na Biblia interativa |
| **Chave** | Nao requer API key (gratuita) |

### 8.6 Bible.is (FCBH)

| Recurso | Descricao |
|---------|-----------|
| **URL** | `https://live.bible.is/api/bibles/filesets/{FILESET}/{BOOK_CODE}/{CH}?v=4` |
| **Versoes com audio** | NVI, NAA, NTLH, NVT |
| **Uso** | Audio versao-especifico para o player da Biblia |

### 8.7 YouVersion (bible.com)

| Recurso | Descricao |
|---------|-----------|
| **URL** | `https://www.bible.com/bible/{versionId}/{bookCode}.{chapter}.{abbr}` |
| **Metodo** | Scraping de `__NEXT_DATA__` JSON do HTML |
| **Uso** | Formatacao de texto (titulos de secao, paragrafos, poesia) |
| **Cache** | 24h em memoria (Map no servidor) |

### 8.8 NotebookLM (Google)

| Recurso | Descricao |
|---------|-----------|
| **Automacao** | Playwright stealth com Chromium bundled |
| **Login** | Sessao Google importada (`scripts/export-google-session.mjs`) |
| **Outputs** | Slides PDF, Infografico PDF, Video Resumo |
| **Naming** | Padrao "{Livro} {Capitulo}" (ex: "Romanos 10") |
| **Fonte** | KB unificada (1 fonte unica ao inves de 2 separadas) |

### 8.9 Gmail SMTP

| Recurso | Descricao |
|---------|-----------|
| **Uso** | Envio de emails (convites, redefinicao de senha) |
| **Templates** | HTML profissional com branding DevocionalHub |
| **Variaveis** | `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT` |

---

## 9. Seguranca e Conformidade

### 9.1 Autenticacao

- **Mecanismo**: NextAuth v5 (Credentials Provider) com estrategia JWT
- **Hashing**: bcryptjs para senhas
- **Configuracao**: `trustHost: true` (necessario para Traefik como reverse proxy)
- **Middleware**: `src/middleware.ts` intercepta todas as rotas e redireciona para `/login` se JWT invalido

### 9.2 Autorizacao (RBAC)

**5 niveis hierarquicos** com controle configuravel no admin:

| Role | Nivel | Acesso |
|------|-------|--------|
| `SUPER_ADMIN` | 100 | Controle total, cleanup, pipeline, todas configuracoes |
| `ADMIN` | 80 | Gerenciamento de usuarios, conteudo, relatorios, webhooks |
| `SUBSCRIBER_VIP` | 60 | Acesso a conteudo exclusivo (futuro) |
| `SUBSCRIBER` | 40 | Acesso a conteudo protegido (futuro) |
| `MEMBER` | 20 | Dashboard, sessoes, perfil, biblia, plano de leitura |

- Guards implementados em `requireRole()` e `requirePermission()` (`permission-guard.ts`)
- 29+ endpoints protegidos com `requireRole`
- Painel de permissoes no admin: configuracao do nivel minimo por recurso
- Sidebar renderiza apenas links permitidos para o role do usuario

### 9.3 Protecao de Conteudo

- Campo `contentPassword` na Session — extrai senha automaticamente da transcricao
- Modal de senha no frontend (`ProtectedDocuments.tsx`)
- API `POST /api/sessions/[id]/verify-password`
- Desbloqueio persistido via `sessionStorage`
- Documentos protegidos: SLIDES, INFOGRAPHIC, AUDIO_OVERVIEW

### 9.4 Gerenciamento de Credenciais

**Regra critica**: NUNCA commitar senhas, API keys, tokens ou emails reais no Git.

- Todas as credenciais configuradas via variaveis de ambiente no Portainer
- `.env` no `.gitignore` — nunca commitado
- `.env.example` com valores placeholder (`YOUR_*`, `changeme`)
- Arquivos de infra (`portainer-stack.yml`, `docker-compose*.yml`) sempre com placeholders no repositorio

**Variaveis de ambiente utilizadas:**
`DATABASE_URL`, `NEXTAUTH_SECRET`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_ACCOUNT_ID`, `ZOOM_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `BIBLE_API_KEY`, `GOOGLE_EMAIL`, `GOOGLE_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`

### 9.5 Criptografia em Transito

- **TLS**: Automatico via Traefik + Let's Encrypt (certificados renovados automaticamente)
- **HSTS**: `Strict-Transport-Security` habilitado
- **Headers de seguranca**: `X-Frame-Options`, `X-Content-Type-Options` configurados em `next.config.ts`
- **Cloudflare**: Modo "DNS only" (SSL gerenciado pelo Traefik)

### 9.6 Seguranca de Webhooks

- Zoom webhooks validados com `ZOOM_WEBHOOK_SECRET`
- Cada webhook customizado possui seu proprio secret independente
- Filtragem por `zoomMeetingId` configurado no admin (evita processamento de reunioes nao-relacionadas)

### 9.7 Isolamento de Rede

- Docker Swarm com rede overlay isolada: `rede_nexusAI`
- Servicos (app, PostgreSQL, Traefik) comunicam-se apenas dentro da rede interna
- Apenas Traefik expoe portas 80/443 ao publico
- PostgreSQL com senha forte (caracter `@` usa URL encoding `%40`)

### 9.8 Conformidade LGPD

- Soft delete de contas: mantem dados minimos (email, nome, igreja), remove dados sensiveis (senha, foto)
- Possibilidade de reativacao futura pelo admin
- Confirmacao em duas etapas para exclusao de conta
- Endpoint dedicado: `DELETE /api/profile/account`

### 9.9 Convites e Tokens

- Token de convite com randomizacao segura
- Expiracao automatica em 7 dias
- Token invalidado imediatamente apos aceite (uso unico)
- Tokens de redefinicao de senha com expiracao e `usedAt` para auditoria

---

## 10. Infraestrutura e Deploy

### 10.1 Arquitetura de Infraestrutura

```
GitHub (push main)
     │
     ▼
GitHub Actions (CI/CD)
     │
     ├── Build: Docker image (node:20-bookworm-slim)
     ├── Push: ghcr.io/jvzanini/devocional-hub:latest
     └── Deploy: Portainer API (Stack ID: 86)
              │
              ▼
     Docker Swarm (VPS)
     ├── devocional-hub (Next.js app)
     ├── postgres (PostgreSQL 16)
     └── traefik (Reverse proxy + SSL)
         │
         ▼
     rede_nexusAI (overlay network)
```

### 10.2 CI/CD (GitHub Actions)

**Workflow**: `.github/workflows/deploy.yml`

1. Push para `main` dispara o workflow
2. Build da imagem Docker
3. Push para GHCR (`ghcr.io/jvzanini/devocional-hub:latest`)
4. Deploy no Portainer via API
5. `DEPLOY_SHA` (hash do commit) injetado no stack YAML para forcar redeploy

**Por que `DEPLOY_SHA`**: O Docker Swarm nao recria o container se a config do stack permanece identica. Injetar o hash do commit como variavel de ambiente garante que cada deploy tenha config diferente.

### 10.3 Docker

- **Imagem base**: `node:20-bookworm-slim` (Debian Bookworm — necessario para Playwright/Chromium)
- **Output**: `standalone` do Next.js (imagem otimizada)
- **Entrypoint**: `docker-entrypoint.sh` — executa `prisma db push --skip-generate` antes de iniciar
- **Volume persistente**: `/app/data/user-photos/` para fotos de perfil
- **npm install**: `--legacy-peer-deps` (conflito de peer deps com next-auth beta)

### 10.4 Traefik

- Reverse proxy com SSL automatico (Let's Encrypt)
- Roteamento baseado em labels Docker
- Redirecionamento automatico HTTP -> HTTPS
- HSTS habilitado

### 10.5 Comandos de Desenvolvimento

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de producao (APENAS na VPS/Docker) |
| `npm install --legacy-peer-deps` | Instalar dependencias |
| `npx prisma generate` | Gerar cliente Prisma |
| `npx prisma db push` | Sincronizar schema com o banco (APENAS na VPS) |
| `npx tsc --noEmit` | Validar tipos localmente |
| `npx playwright test` | Rodar testes E2E |
| `npx playwright install` | Instalar browsers do Playwright |

**Atencao**: `npm run build` trava localmente porque tenta conectar ao PostgreSQL. PostgreSQL roda APENAS na VPS. Para validacao local: `npx prisma generate` + `npx tsc --noEmit`.

---

## 11. Modelo de Dados

### 11.1 Diagrama de Entidades

```
User ──< ZoomIdentifier
  │  ──< Attendance >── Session
  │  ──< PasswordResetToken
  │
Session ──< Participant ──< ParticipantEntry
  │     ──< Document
  │     ──< Attendance
  │
ReadingPlan ──< ReadingPlanDay ──< ChapterReading
  │         ──< PlanningCard
  │
Permission (standalone)
Webhook (standalone)
AppSetting (standalone, key-value)
```

### 11.2 Models Prisma

| Model | Campos Principais | Descricao |
|-------|-------------------|-----------|
| **User** | email, password?, name, role, church, team, subTeam, photoUrl, whatsapp?, deletedAt? | Usuarios da plataforma |
| **ZoomIdentifier** | userId, value, type (EMAIL/USERNAME), locked | Mapeamento Zoom -> usuario |
| **PasswordResetToken** | userId, token, expiresAt, usedAt? | Tokens de redefinicao de senha |
| **Permission** | resource (unique), minRole | Controle de acesso configuravel |
| **Session** | date, startTime?, zoomMeetingId, zoomUuid, chapterRef, summary, contentPassword?, status | Sessoes devocionais |
| **Participant** | sessionId, name, email?, joinTime, leaveTime, duration, totalDuration | Participantes do Zoom |
| **ParticipantEntry** | participantId, joinTime, leaveTime, duration | Log de cada entrada/saida |
| **Document** | sessionId, type (DocType), fileName, storagePath, fileSize? | Documentos gerados |
| **Attendance** | userId, sessionId, joinTime, leaveTime, duration | Presenca vinculada |
| **ReadingPlan** | bookName, bookCode, bookOrder, chaptersPerDay, totalChapters, startDate, endDate, status | Planos de leitura |
| **ReadingPlanDay** | planId, date, chapters, completed, logNote?, actualChapters? | Dias do plano |
| **ChapterReading** | dayId, chapter, isComplete, isPartial, sessions, completedAt? | Leitura por capitulo |
| **PlanningCard** | planId, bookName, bookCode, chapter, analysis, references, studyLinks[], imageUrls[], themeGroup? | Cards de planejamento |
| **Webhook** | name, slug, secret?, active | Webhooks configurados |
| **AppSetting** | key, value | Configuracoes chave-valor |

### 11.3 Enums

| Enum | Valores |
|------|---------|
| `UserRole` | SUPER_ADMIN, ADMIN, SUBSCRIBER_VIP, SUBSCRIBER, MEMBER |
| `ZoomIdType` | EMAIL, USERNAME |
| `DocType` | TRANSCRIPT_RAW, TRANSCRIPT_CLEAN, BIBLE_TEXT, INFOGRAPHIC, SLIDES, AUDIO_OVERVIEW, AI_SUMMARY, PLANNING |
| `PipelineStatus` | PENDING, RUNNING, COMPLETED, ERROR |
| `ReadingPlanStatus` | UPCOMING, IN_PROGRESS, COMPLETED |

---

## 12. Endpoints de API

### 12.1 Autenticacao

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| — | `/api/auth/[...nextauth]` | NextAuth (login/session) |
| POST | `/api/auth/forgot-password` | Enviar email de redefinicao |
| POST | `/api/auth/reset-password` | Redefinir senha com token |
| GET | `/api/auth/validate-reset-token` | Validar token de redefinicao |

### 12.2 Perfil

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| PATCH | `/api/profile/password` | Alterar senha (logado) |
| DELETE | `/api/profile/account` | Soft delete (LGPD) |
| GET/POST | `/api/profile/photo/[userId]` | Foto de perfil |

### 12.3 Admin

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET/PATCH | `/api/admin/permissions` | Gerenciar permissoes |
| PATCH/DELETE | `/api/admin/users/[id]` | Editar/desativar usuario |
| GET/POST | `/api/admin/users/[id]/zoom-identifiers` | Zoom IDs do usuario |
| GET/POST/DELETE | `/api/admin/webhooks` | CRUD webhooks |
| GET/POST | `/api/admin/settings/schedules` | Horarios agendados |
| POST | `/api/admin/reading-plans/[id]/retroactive` | Processamento retroativo |
| PATCH | `/api/admin/reading-plans/[id]/days/[dayId]/chapters` | Marcar capitulos |
| GET/POST | `/api/admin/notebooklm-session` | Sessao NotebookLM |
| POST | `/api/admin/notebooklm-setup` | Setup NotebookLM |
| POST | `/api/admin/cleanup` | Limpar banco (SUPER_ADMIN) |

### 12.4 Biblia

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/bible/versions` | 12 versoes PT (Holy Bible API) |
| GET | `/api/bible/content/[versionId]/[chapterId]` | Texto do capitulo |
| GET | `/api/bible/audio/[versionId]/[chapterId]` | URL audio MP3 PT-BR |
| GET | `/api/bible/context` | Contexto devocional (plano ativo) |

### 12.5 Planejamento

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/planning/current` | Plano ativo com cards |
| GET | `/api/planning/cards/[planId]` | Cards de um plano |
| GET | `/api/planning/card/[cardId]` | Detalhe de um card |
| POST | `/api/planning/generate/[planId]` | Gerar cards via IA |

### 12.6 Relatorios

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/reports/presence` | Dados de presenca |
| GET | `/api/reports/frequency` | Frequencia semanal/mensal |
| GET | `/api/reports/evolution` | Evolucao (grafico linha) |
| GET | `/api/reports/hours` | Horas de devocional |
| GET | `/api/reports/books-distribution` | Distribuicao por livro |

### 12.7 Sessoes e Outros

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/sessions/[id]` | Detalhe da sessao |
| GET | `/api/sessions/[id]/adjacent` | Sessoes adjacentes |
| POST | `/api/sessions/[id]/verify-password` | Verificar senha de conteudo |
| GET | `/api/dashboard/day-summary` | Resumo do dia |
| GET | `/api/attendance/user/[id]` | Presenca por usuario |
| POST | `/api/pipeline/run` | Executar pipeline manualmente |
| GET | `/api/cron/check` | Health check |
| GET | `/api/files/[id]` | Servir arquivos |
| GET | `/api/search` | Busca inteligente |
| POST | `/api/invite/[token]` | Aceitar convite |
| POST | `/api/webhook/[slug]` | Webhooks Zoom |

---

## 13. Design System

### 13.1 Design System v3

Definido em `src/app/globals.css` com CSS custom properties (`:root` + `[data-theme="dark"]`).

**Dark Mode (tema principal):**
- Background: `#0c0c0e`
- Surface: `#141416`
- Accent: `#f5a623` (goldenrod)

**Light Mode:**
- Background: `#f5f5f7`
- Surface: `#ffffff`
- Accent: `#d97706` (amber)

**Regras criticas:**
- Cores SEMPRE via `var()` — ex: `var(--text)`, `var(--accent)`, `var(--surface)`
- NUNCA usar cores hardcoded (#hex) em componentes
- NUNCA usar `@theme inline` do Tailwind v4 (incompativel com Docker em producao)
- Usar CSS classes hardcoded em `globals.css` para design visual (cards, buttons, inputs, badges)
- Inline styles para layout (`style={{ }}`) — mais confiavel que Tailwind em producao

### 13.2 Classes de Layout

- `.dashboard-two-col` — Layout de 2 colunas do dashboard
- `.books-layout` — Layout da pagina de livros
- `.reports-top-grid` — Grid superior dos relatorios
- `.session-detail-grid` — Grid da pagina de detalhe da sessao

### 13.3 Classes de Relatorios

- `.reports-stat-card` — Cards de estatisticas
- `.reports-chart-card` — Cards de graficos
- `.reports-table-card` — Card da tabela
- `.reports-table` — Estilo da tabela

### 13.4 Responsividade

| Breakpoint | Largura |
|-----------|---------|
| Mobile | < 768px |
| Small Tablet | 480-767px |
| Tablet | 768-1023px |
| Desktop | 1024-1279px |
| Large | >= 1440px |

Features responsivas: fullscreen mobile, sidebar hamburger, grid adaptativo.

### 13.5 Tema

- Dark mode via `data-theme="dark"` no `<html>`
- Persistencia via `localStorage` (`devhub-theme`)
- Script de tema no root layout para evitar flash

---

## 14. Historico de Versoes

### v2.0 — Master Update v2 (2026-03-21)

Transformacao de ferramenta funcional em plataforma profissional completa.
- 22 features implementadas em 7 etapas e 8 tracks
- 110 arquivos alterados, 14.311 insercoes de codigo
- 15 models Prisma, 51+ endpoints API, 61 arquivos TypeScript
- Sistema de permissoes multi-nivel (5 roles)
- Bíblia interativa (Bubble v4)
- Modulo de planejamento teologico
- Relatorios com graficos e exportacao CSV
- Painel admin com 7 abas
- Pipeline com cascata de IA (OpenAI + fallbacks gratuitos)
- Automacao NotebookLM (slides, infografico, video resumo)
- Dark mode completo (2042 linhas CSS)
- Responsividade total (4+ breakpoints)

### v2.1 — Hotfix pos-deploy (2026-03-21)

Correcao de ~30 bugs e ajustes de UI/UX identificados em review de producao.
- Bible Bubble: z-index, pointer-events, cursor pointer
- Participantes deduplicados por email/nome
- Foto de perfil persistente (volume Docker)
- Calendario: cores corrigidas, bolinha do hoje
- Cards: check verde, trilha com expand/collapse
- Relatorios: filtros em linha, card Duracao Media
- Login: esqueci senha inline, logo maior
- Cores accent: goldenrod (#daa520 dark, #c7910a light)
- Sidebar: Progresso -> Relatorios, logo maior

### Bible Bubble v4 (2026-03-21)

Audio versao-especifico via Bible.is + overhaul completo de UX.
- 12 versoes PT com texto (Holy Bible API)
- 4 versoes com audio proprio (NVI, NAA, NTLH, NVT via Bible.is)
- Player colapsavel, drag-to-seek, busca no capitulo

### Bible Bubble v4.1 (2026-03-21)

Refinamentos de UX + cache.
- Player inicia colapsado/pausado, cache de posicao
- Busca com filtro de versiculos (ignora acentos)
- Anti-zoom iOS, labels de capitulo colapsado

### Bible Bubble v5 — YouVersion + AA + Audio Fix (2026-03-23)

Formatacao de texto direto do YouVersion, controle de tamanho de fonte e fix de audio.
- Titulos de secao, paragrafos e poesia do YouVersion (sem IA)
- Botao "Aa" para controle de tamanho da fonte (3 niveis)
- Fix de audio speed no mobile (pause -> rate -> seek -> resume)
- Testes Playwright (Desktop Chrome + Mobile Chrome Pixel 7)

---

## Gotchas Criticos

Licoes aprendidas ao longo do desenvolvimento que devem ser respeitadas em qualquer alteracao futura:

1. **Tailwind v4**: NUNCA usar `@theme inline` — CSS variables nao existem em runtime no Docker
2. **Build local**: `npm run build` trava localmente (precisa de PostgreSQL). Validar com `npx prisma generate` + `npx tsc --noEmit`
3. **npm install**: Sempre usar `--legacy-peer-deps` (conflito com next-auth beta)
4. **prisma db push**: No entrypoint Docker, usar `--skip-generate` (EACCES no /app)
5. **PostgreSQL**: Senha com `@` exige `%40` na DATABASE_URL
6. **Docker**: Usar Debian bookworm (Alpine incompativel com Playwright/Chromium)
7. **Playwright**: NAO usar `executablePath` — deixar auto-discovery do Chromium
8. **Portainer redeploy**: Injetar `DEPLOY_SHA` no stack YAML para forcar atualizacao do container
9. **Credenciais**: NUNCA commitar no Git — apenas no Portainer (variaveis de ambiente)
10. **CSS**: Cores via `var()`, nunca hardcoded — usar globals.css para design visual
11. **NotebookLM**: Audio Overview gera VIDEO resumo, nao audio — label "Video Resumo (PT-BR)"
12. **Sessao Google**: Se expirar, rodar `node scripts/export-google-session.mjs` na VPS
