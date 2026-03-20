---
name: refactoring
description: Refatoracao segura de codigo mantendo a arquitetura feature-based do DevocionalHub
---

# Refactoring — DevocionalHub

## Objetivo
Refatorar codigo do DevocionalHub de forma segura, mantendo isolamento de features, consolidando codigo compartilhado e respeitando as convencoes do projeto.

## Principios de Refatoracao

### 1. Manter Isolamento de Features
- Cada feature em `src/features/<dominio>/` deve permanecer independente.
- Ao refatorar, NAO introduzir imports cruzados entre features.
- Se duas features precisam do mesmo codigo, mover para `src/shared/`.

### 2. Consolidar Codigo Compartilhado em src/shared/
- Funcoes utilitarias: `src/shared/lib/utils.ts`
- Acesso ao banco: `src/shared/lib/db.ts` (singleton do Prisma)
- Storage: `src/shared/lib/storage.ts`
- Componentes UI genericos: `src/shared/components/ui/`
- Sidebar e navegacao: `src/shared/components/Sidebar.tsx`

### 3. CSS Sempre em globals.css
- Estilos visuais reutilizaveis devem ser classes em `src/app/globals.css`.
- Classes do design system: `.card`, `.btn-primary`, `.btn-secondary`, `.input-field`, `.badge`.
- CSS custom properties em `:root` e `[data-theme="dark"]`.
- NUNCA usar `@theme inline` do Tailwind v4.
- Para layout especifico de componente, usar inline styles (`style={{ }}`).

### 4. Imports com Alias @/
- Todos os imports devem usar o alias `@/` configurado no tsconfig.
- Formato: `@/features/<feature>/lib/<modulo>`, `@/features/<feature>/components/<Componente>`, `@/shared/lib/<modulo>`.
- Ao mover arquivo, atualizar TODOS os imports que referenciam o caminho antigo.

## Checklist de Refatoracao

### Antes de Refatorar
- [ ] Entender o fluxo completo do codigo a ser refatorado.
- [ ] Identificar todos os arquivos que importam o codigo afetado.
- [ ] Verificar se o codigo faz parte do pipeline de IA (impacto critico).
- [ ] Garantir que build local passa (`npm run build`).

### Durante a Refatoracao
- [ ] Mover logica de negocio para `src/features/<dominio>/lib/`.
- [ ] Mover codigo duplicado entre features para `src/shared/`.
- [ ] Manter tipagem TypeScript (nao introduzir `any`).
- [ ] Preservar comportamento (refatorar estrutura, nao logica).
- [ ] Atualizar todos os imports afetados.
- [ ] Manter camelCase para variaveis/funcoes, PascalCase para componentes.

### Apos Refatorar
- [ ] Verificar que `npm run build` passa sem erros.
- [ ] Verificar que `npx prisma generate` funciona (se schema foi alterado).
- [ ] Testar endpoints afetados manualmente.
- [ ] Confirmar que nenhuma credencial foi exposta.
- [ ] Verificar que textos em portugues mantem acentuacao correta (UTF-8).

## Padroes de Refatoracao Comuns

### Extrair Service
Mover logica de negocio de API route para service em `src/features/<dominio>/lib/`:
```
# Antes: logica pesada em route.ts
# Depois: route.ts chama service, service contem logica
```

### Consolidar Duplicacao
Se duas features tem codigo similar:
1. Identificar o codigo duplicado.
2. Criar funcao/componente em `src/shared/`.
3. Atualizar ambas as features para usar o codigo compartilhado.

### Reorganizar Componentes
Componentes que so pertencem a uma feature devem estar em `src/features/<dominio>/components/`.
Componentes usados por multiplas features devem estar em `src/shared/components/`.

### Simplificar API Routes
Routes devem ser finas — apenas:
1. Validar session/autorizacao.
2. Validar input.
3. Chamar service.
4. Retornar resposta.

## Arquivos que NUNCA Devem Ser Refatorados Sem Cuidado Extremo
- `src/features/pipeline/lib/ai.ts` — Cascata de IA critica para o fluxo principal.
- `src/features/pipeline/lib/pipeline.ts` — Orquestracao do pipeline completo.
- `src/features/auth/lib/auth.ts` — Configuracao do NextAuth.
- `src/middleware.ts` — Protecao de rotas.
- `src/app/globals.css` — Design system inteiro do projeto.
- `prisma/schema.prisma` — Schema do banco de dados.
