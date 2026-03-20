---
name: code-review
description: Revisar qualidade de codigo, padroes e boas praticas do DevocionalHub
---

# Code Review — DevocionalHub

## Objetivo
Revisar codigo do DevocionalHub verificando seguranca, padroes do projeto, isolamento de features e qualidade geral.

## Checklist Obrigatorio

### 1. Seguranca de Credenciais (CRITICO)
- [ ] Nenhuma credencial real (API keys, senhas, tokens, emails) presente no codigo.
- [ ] Valores genericos (YOUR_*, changeme) usados em arquivos versionados.
- [ ] Variaveis de ambiente referenciadas via `process.env.*`, nunca hardcoded.
- [ ] Arquivos `portainer-stack.yml` e `docker-compose.yml` com placeholders.
- [ ] `.env` esta no `.gitignore`.

### 2. CSS e Estilizacao
- [ ] NUNCA usar `@theme inline` do Tailwind v4 — nao funciona em producao Docker.
- [ ] Estilos visuais definidos em `src/app/globals.css` (classes: `.card`, `.btn-primary`, `.input-field`).
- [ ] Inline styles (`style={{ }}`) para layout — mais confiavel que Tailwind em producao.
- [ ] CSS custom properties em `:root` e `[data-theme="dark"]`, nunca em `@theme`.
- [ ] Dark mode usando `data-theme="dark"` no `<html>`.

### 3. Isolamento de Features
- [ ] Codigo de dominio dentro de `src/features/<feature>/`.
- [ ] Componentes da feature em `src/features/<feature>/components/`.
- [ ] Logica de negocio em `src/features/<feature>/lib/`.
- [ ] Codigo compartilhado apenas em `src/shared/`.
- [ ] Sem imports cruzados diretos entre features (usar shared como intermediario).
- [ ] Imports usando alias `@/` (ex: `@/features/auth/lib/auth`).

### 4. Portugues e Acentuacao
- [ ] Textos de interface em portugues brasileiro.
- [ ] Acentos corretos com UTF-8 direto (nunca `\u00XX` unicode escapes).
- [ ] Mensagens de erro e logs em portugues quando expostas ao usuario.

### 5. Padroes de Codigo
- [ ] camelCase para variaveis/funcoes, PascalCase para componentes React.
- [ ] TypeScript tipado (sem `any` desnecessario).
- [ ] Prisma queries otimizadas (select/include apenas campos necessarios).
- [ ] NextAuth session validada em API routes protegidas.
- [ ] Verificacao de role (ADMIN/MEMBER) onde necessario.

### 6. API Routes
- [ ] Retornam `NextResponse.json()` com status codes corretos.
- [ ] Tratamento de erros com try/catch e resposta adequada.
- [ ] Validacao de session via `auth()` do NextAuth.
- [ ] Verificacao de role para endpoints administrativos.

### 7. Docker e Deploy
- [ ] `npm ci --legacy-peer-deps` no Dockerfile.
- [ ] `prisma db push --skip-generate` no entrypoint.
- [ ] Senha do PostgreSQL com `%40` no lugar de `@` na DATABASE_URL.

## Severidade dos Problemas
- **CRITICO**: Credenciais no codigo, `@theme inline`, falhas de seguranca.
- **ALTO**: Imports cruzados entre features, falta de validacao de session/role.
- **MEDIO**: Tipagem fraca, queries nao otimizadas, falta de tratamento de erro.
- **BAIXO**: Formatacao, naming inconsistente, comentarios ausentes.

## Formato da Review
Listar problemas encontrados com:
1. Arquivo e linha.
2. Severidade (CRITICO/ALTO/MEDIO/BAIXO).
3. Descricao do problema em portugues.
4. Sugestao de correcao.
