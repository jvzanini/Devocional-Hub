---
name: feature-breakdown
description: Decompor features em tarefas implementaveis na arquitetura do DevocionalHub
---

# Feature Breakdown — DevocionalHub

## Objetivo
Decompor novas features em tarefas implementaveis seguindo a arquitetura feature-based do DevocionalHub.

## Arquitetura Feature-Based

O DevocionalHub organiza codigo por dominio de negocio:

```
src/features/<nome-da-feature>/
├── components/     # Componentes React da feature
├── lib/            # Logica de negocio, services, utils
└── hooks/          # Custom hooks (se necessario)
```

**Features existentes**: auth, sessions, dashboard, admin, bible, pipeline, zoom, email.

## Processo de Decomposicao

### 1. Definir o Dominio
- A feature pertence a um dominio existente ou precisa de um novo?
- Se pertence a dominio existente, adicionar em `src/features/<dominio>/`.
- Se e novo dominio, criar `src/features/<novo-dominio>/`.

### 2. Identificar Mudancas no Prisma Schema
- A feature requer novos modelos ou campos no banco?
- Atualizar `prisma/schema.prisma` com os novos modelos/campos.
- Relacoes com modelos existentes (User, Session, Document).
- Apos alterar schema: `npx prisma generate` + `npx prisma db push`.

### 3. Definir API Routes
- Quais endpoints a feature precisa?
- Criar em `src/app/api/<dominio>/<recurso>/route.ts`.
- Definir metodos HTTP (GET, POST, PUT, DELETE).
- Definir autenticacao (publica, autenticada, admin-only).

### 4. Criar Componentes
- Componentes da feature em `src/features/<dominio>/components/`.
- Componentes compartilhados em `src/shared/components/`.
- Estilos: classes em `globals.css` + inline styles (NUNCA `@theme inline`).

### 5. Criar Paginas
- Paginas autenticadas em `src/app/(dashboard)/<rota>/page.tsx`.
- Paginas publicas em `src/app/(auth)/<rota>/page.tsx`.
- Usar layout compartilhado do grupo de rotas.

### 6. Conectar ao Pipeline (se aplicavel)
- Se a feature interage com o pipeline de IA, integrar em `src/features/pipeline/lib/`.
- Verificar integracao com a cascata de IA (`callAI`).

## Template de Decomposicao

Para cada nova feature, preencher:

```
## Feature: [Nome]

### Descricao
[O que a feature faz e por que e necessaria]

### Tarefas

#### Banco de Dados
- [ ] Atualizar prisma/schema.prisma — [novos modelos/campos]
- [ ] Rodar prisma generate + db push

#### API Routes
- [ ] POST /api/<dominio>/<recurso> — [descricao]
- [ ] GET /api/<dominio>/<recurso> — [descricao]
- [ ] [Autenticacao requerida: ADMIN/MEMBER/publica]

#### Logica de Negocio
- [ ] src/features/<dominio>/lib/<modulo>.ts — [descricao]

#### Componentes
- [ ] src/features/<dominio>/components/<Componente>.tsx — [descricao]

#### Paginas
- [ ] src/app/(dashboard)/<rota>/page.tsx — [descricao]

#### Estilos
- [ ] Adicionar classes em src/app/globals.css (se necessario)

#### Integracao
- [ ] Atualizar Sidebar (se precisa de nova rota de navegacao)
- [ ] Atualizar middleware.ts (se precisa de protecao especial)
```

## Regras

1. **Isolamento**: Cada feature deve ser independente. Codigo compartilhado vai em `src/shared/`.
2. **Imports**: Usar alias `@/` — ex: `@/features/sessions/lib/attendance-sync`.
3. **Sem cruzamento**: Features nao importam diretamente de outras features. Usar `src/shared/` como intermediario.
4. **CSS**: Nunca usar `@theme inline`. Adicionar classes em `globals.css` ou usar inline styles.
5. **Seguranca**: Nunca hardcodar credenciais. Usar `process.env.*`.
6. **Portugues**: Textos de interface e mensagens em portugues brasileiro.
7. **Tipagem**: TypeScript tipado, evitar `any`.
