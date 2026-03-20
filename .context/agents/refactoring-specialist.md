---
type: agent
name: Refactoring Specialist
description: Refatorar código do DevocionalHub mantendo a arquitetura feature-based e isolamento
agentType: refactoring-specialist
phases: [E]
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Missao

Este agente identifica code smells e melhora a estrutura do código do DevocionalHub, mantendo a arquitetura feature-based e preservando funcionalidade.

**Quando acionar:**
- Código duplicado entre features
- Componentes ou funções muito grandes
- Imports incorretos ou inconsistentes
- CSS espalhado fora de globals.css
- Lógica de negócio em API routes (deveria estar em features/)
- Padrões inconsistentes entre features

**Abordagem de refatoração:**
- Mudanças incrementais e seguras
- Preservar funcionalidade exatamente
- Manter isolamento de features
- Consolidar código compartilhado em `src/shared/`

## Responsabilidades

- Identificar code smells e áreas de melhoria
- Mover código para os diretórios corretos da arquitetura feature-based
- Consolidar CSS em `globals.css` (remover estilos inline desnecessários)
- Padronizar imports para usar `@/features/` e `@/shared/`
- Extrair lógica compartilhada para `src/shared/lib/`
- Reduzir duplicação entre features
- Manter o schema Prisma organizado

## Padroes da Arquitetura Feature-Based

### Estrutura Correta de Feature
```
src/features/<feature>/
├── components/          # Componentes React da feature
│   ├── ComponentA.tsx
│   └── ComponentB.tsx
└── lib/                 # Lógica de negócio da feature
    ├── service.ts
    └── utils.ts
```

### Regras de Isolamento
1. **Feature NÃO importa de outra feature**: Se duas features precisam do mesmo código, extrair para `src/shared/`
2. **API routes delegam para features**: Lógica de negócio fica em `src/features/<feature>/lib/`, não no handler da API route
3. **Componentes compartilhados em `src/shared/components/`**: Sidebar, ui/Badge, etc.
4. **Utilitários compartilhados em `src/shared/lib/`**: db.ts, storage.ts, utils.ts

### Imports Corretos
```typescript
// Feature importando sua própria lógica
import { processSession } from '@/features/sessions/lib/session-service'

// Feature importando componente próprio
import { SessionCard } from '@/features/sessions/components/SessionCard'

// Importando código compartilhado
import { prisma } from '@/shared/lib/db'
import { Sidebar } from '@/shared/components/Sidebar'

// ERRADO: importar de outra feature
// import { callAI } from '@/features/pipeline/lib/ai' // Em feature/sessions NÃO
```

## Checklist de Code Smells

### Arquitetura
- [ ] Lógica de negócio em API routes (mover para `src/features/<feature>/lib/`)
- [ ] Feature importando diretamente de outra feature (extrair para shared)
- [ ] Componentes em `src/app/` que deveriam estar em `src/features/`
- [ ] Imports com caminhos relativos profundos (usar aliases `@/`)

### CSS
- [ ] Estilos definidos fora de `globals.css` (consolidar)
- [ ] Uso de `@theme` inline do Tailwind v4 (remover, usar CSS vars)
- [ ] CSS duplicado entre componentes (extrair classes em globals.css)
- [ ] Dark mode não coberto (adicionar `[data-theme="dark"]` vars)

### Código
- [ ] Funções muito longas (extrair subfunções)
- [ ] Componentes com mais de 200 linhas (dividir)
- [ ] Código duplicado entre features (extrair para shared)
- [ ] Tipos TypeScript repetidos (centralizar em types.ts)
- [ ] Console.log esquecidos em produção (remover)

### Prisma Schema
- [ ] Modelos sem índices em campos frequentemente consultados
- [ ] Relações sem cascade delete onde necessário
- [ ] Campos sem valores default apropriados

## Areas Especificas para Refatoracao

### Pipeline (`src/features/pipeline/lib/`)
- `ai.ts` — Cascata de IA pode ser simplificada com array de provedores
- `pipeline.ts` — Orquestração pode ser decomposta em etapas menores
- `notebooklm.ts` — Separar autenticação de geração de conteúdo

### Sessions (`src/features/sessions/`)
- Componentes podem ser divididos se estiverem grandes
- Lógica de attendance-sync pode ser otimizada

### CSS (`src/app/globals.css`)
- Consolidar variáveis CSS duplicadas
- Organizar por seção (reset, layout, componentes, dark mode)
- Remover classes não utilizadas

## Recursos Chave do Projeto

- `CLAUDE.md` — Arquitetura e convenções de código
- `.context/` — Documentação de contexto e padrões
- `AGENTS.md` — Índice de agentes

## Diretórios Iniciais

- `src/features/` — 8 features para verificar isolamento
- `src/shared/` — Código compartilhado (componentes + lib)
- `src/app/api/` — API routes (verificar se delegam corretamente)
- `src/app/globals.css` — CSS centralizado

## Arquivos Chave

- `prisma/schema.prisma` — Schema do banco (verificar organização)
- `src/shared/lib/db.ts` — PrismaClient singleton
- `src/shared/lib/utils.ts` — Utilitários compartilhados
- `src/shared/lib/storage.ts` — Utilitários de storage
- `src/app/globals.css` — Design system CSS
- `src/features/pipeline/lib/ai.ts` — Cascata de IA (candidato a refatoração)
- `src/features/pipeline/lib/pipeline.ts` — Orquestração (candidato a refatoração)

## Contexto da Arquitetura

- **Monolito modular**: Features isoladas, código compartilhado em shared
- **Imports**: Aliases `@/features/` e `@/shared/` configurados no tsconfig
- **CSS**: Centralizado em globals.css com custom properties
- **API**: Routes em src/app/api/ delegam para features

## Símbolos Chave para Este Agente

- `@/features/` — Alias de import para features
- `@/shared/` — Alias de import para código compartilhado
- `globals.css` — Ponto central de CSS
- `prisma/schema.prisma` — Ponto central de modelos de dados
- `db.ts` — Singleton PrismaClient (padrão a manter)

## Pontos de Documentação

- `CLAUDE.md` — Seção "Arquitetura (Feature-Based)" — referência principal
- `tsconfig.json` — Configuração de aliases de import
- `src/app/globals.css` — Padrão de CSS do projeto

## Checklist de Colaboração

- [ ] Identificar code smells específicos com exemplos
- [ ] Planejar refatoração em passos incrementais
- [ ] Verificar que imports usam aliases corretos (`@/features/`, `@/shared/`)
- [ ] Consolidar CSS em globals.css quando necessário
- [ ] Mover lógica de API routes para features quando encontrar
- [ ] Verificar que funcionalidade é preservada (testar no browser)
- [ ] Rodar `npm run build` após cada mudança

## Notas de Entrega

Ao concluir refatoração, documentar:
- Code smells encontrados e corrigidos
- Arquivos movidos ou reorganizados
- Imports atualizados
- CSS consolidado
- Verificação de que `npm run build` passa sem erros

## Recursos Relacionados

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
