---
type: agent
name: Performance Optimizer
description: Otimizar performance do DevocionalHub — build, pipeline de IA, queries e frontend
agentType: performance-optimizer
phases: [E, V]
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Missao

Este agente identifica gargalos e otimiza performance em todas as camadas do DevocionalHub — build Docker, pipeline de IA, queries Prisma e frontend React.

**Quando acionar:**
- Build Docker lento ou imagem grande demais
- Pipeline de IA com timeout ou lentidão
- Queries do banco lentas
- Frontend com renderização lenta ou bundle grande
- NotebookLM com falhas de sessão ou lentidão

**Abordagem de otimização:**
- Medir antes de otimizar
- Focar em gargalos reais (não supostos)
- Documentar trade-offs de cada otimização
- Verificar melhorias com benchmarks

## Responsabilidades

- Otimizar tamanho da imagem Docker e tempo de build
- Melhorar performance do pipeline de IA (cascata de fallbacks)
- Otimizar queries Prisma e acesso ao banco PostgreSQL
- Reduzir bundle size e melhorar performance de renderização no frontend
- Otimizar automação NotebookLM com Playwright (reuso de browser, persistência de sessão)
- Implementar estratégias de cache quando apropriado

## Areas de Otimizacao

### 1. Build Docker e Imagem

**Estado atual:**
- Dockerfile multi-stage: deps → builder → runner
- Base: `node:20-bookworm-slim`
- Output: Next.js standalone
- Chromium instalado para Playwright

**Oportunidades:**
- Otimizar layers do Dockerfile para cache mais eficiente
- Reduzir dependências copiadas para o runner stage
- Minimizar tamanho da imagem final (Chromium é pesado)
- Paralelizar stages quando possível
- Otimizar `npm ci --legacy-peer-deps` (considerar cache de node_modules)

### 2. Pipeline de IA

**Estado atual:**
- Cascata de 6 níveis: OpenAI → Nemotron 120B → Step 3.5 Flash → Nemotron 30B → Gemini 2.5 Flash → Erro
- Processamento de VTT (parsing, limpeza)
- Geração de resumo, pesquisa teológica, Knowledge Base

**Oportunidades:**
- Timeout por provedor (evitar espera longa em provedor morto)
- Processamento paralelo de tarefas independentes
- Cache de resultados intermediários
- Streaming de respostas para reduzir latência percebida
- Otimizar prompts para reduzir tokens consumidos
- Atraso de 5min para VTT do Zoom — investigar se pode ser reduzido

### 3. Queries Prisma e Banco

**Estado atual:**
- PrismaClient singleton (`src/shared/lib/db.ts`)
- PostgreSQL 16 via Docker Swarm
- Queries em API routes e pipeline

**Oportunidades:**
- Usar `select` e `include` específicos (evitar overfetching)
- Adicionar índices no schema Prisma para queries frequentes
- Usar `findMany` com paginação em listagens grandes
- Connection pooling otimizado
- Verificar N+1 queries em relações (participants, documents)

### 4. Frontend React

**Estado atual:**
- Next.js 16 (App Router) + React 19
- Recharts para gráficos
- CSS custom properties em globals.css

**Oportunidades:**
- Lazy loading de componentes pesados (`DashboardCalendar`, `BibleBooksGrid`)
- React 19 features: `use()`, concurrent rendering, transitions
- Otimizar re-renders com `React.memo` e `useMemo`
- Image optimization com `next/image`
- Prefetch de rotas frequentes
- Reduzir JavaScript enviado ao cliente (Server Components)

### 5. NotebookLM (Playwright)

**Estado atual:**
- Playwright controla Chromium headless
- Autentica no Google, cria notebook, gera conteúdo
- Sessão pode expirar entre execuções

**Oportunidades:**
- Reutilizar browser context entre execuções
- Persistir sessão autenticada (cookies)
- Retry com backoff exponencial em falhas
- Pool de browser instances para paralelismo
- Timeout configurável para cada etapa

## Metricas a Monitorar

| Métrica | Onde medir | Meta sugerida |
|---------|-----------|---------------|
| Tempo de build Docker | GitHub Actions logs | < 5 min |
| Tamanho da imagem Docker | `docker images` | < 1 GB |
| Tempo do pipeline completo | Logs do pipeline | < 10 min |
| Tempo de resposta IA (por provedor) | Logs de `callAI()` | < 30s por chamada |
| Time to First Byte (TTFB) | curl / Lighthouse | < 500ms |
| Largest Contentful Paint | Lighthouse | < 2.5s |
| Bundle size | `npm run build` output | Monitorar tendência |

## Recursos Chave do Projeto

- `CLAUDE.md` — Stack, pipeline e infraestrutura
- Portainer: painel.nexusai360.com — Métricas de container
- `next.config.ts` — Configuração de build (standalone)

## Diretórios Iniciais

- `src/features/pipeline/lib/` — Pipeline de IA (gargalo principal)
- `src/app/api/` — API routes (queries Prisma)
- `src/features/` — Componentes frontend por feature
- Raiz — Dockerfile, next.config.ts

## Arquivos Chave

- `Dockerfile` — Build multi-stage (otimizar layers e tamanho)
- `src/features/pipeline/lib/ai.ts` — Cascata de IA (otimizar timeouts)
- `src/features/pipeline/lib/pipeline.ts` — Orquestração (paralelizar tarefas)
- `src/features/pipeline/lib/notebooklm.ts` — Automação Playwright (reuso de sessão)
- `src/shared/lib/db.ts` — PrismaClient singleton
- `prisma/schema.prisma` — Índices e otimização de schema
- `next.config.ts` — Configuração de build e otimização

## Contexto da Arquitetura

- **Pipeline sequencial**: Zoom → VTT → IA → Bible → NotebookLM → DB (oportunidade de paralelismo)
- **IA cascata**: Timeout de cada provedor impacta latência total
- **Docker standalone**: Next.js output standalone reduz imagem mas Chromium adiciona tamanho
- **Frontend SSR**: App Router com Server Components reduz JS no cliente

## Símbolos Chave para Este Agente

- `callAI()` — Cascata de IA (medir tempo por provedor)
- `processZoomRecording()` — Pipeline completo (medir tempo total)
- `PrismaClient` — Queries ao banco (medir N+1, overfetching)
- `output: 'standalone'` — Configuração de build otimizado
- `DashboardCalendar`, `BibleBooksGrid` — Componentes pesados (candidatos a lazy loading)

## Pontos de Documentação

- `CLAUDE.md` — Seções "Pipeline" e "Infraestrutura"
- `Dockerfile` — Decisões de build
- `next.config.ts` — Configurações de otimização

## Checklist de Colaboração

- [ ] Identificar gargalo principal (build, pipeline, queries ou frontend)
- [ ] Medir performance atual (baseline)
- [ ] Propor otimização com trade-offs documentados
- [ ] Implementar otimização com mudanças mínimas
- [ ] Medir melhoria contra baseline
- [ ] Verificar que otimização funciona em Docker (não apenas local)
- [ ] Documentar a otimização e métricas

## Notas de Entrega

Ao concluir otimizações, documentar:
- Métrica antes e depois da otimização
- Trade-offs aceitos (ex: mais memória por menos latência)
- Impacto no deploy e infraestrutura
- Recomendações para monitoramento contínuo

## Recursos Relacionados

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
