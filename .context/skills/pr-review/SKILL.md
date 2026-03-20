---
name: pr-review
description: Revisar pull requests contra os padroes e boas praticas do DevocionalHub
---

# PR Review — DevocionalHub

## Objetivo
Revisar pull requests do DevocionalHub verificando seguranca, padroes do projeto, isolamento de features, compatibilidade e qualidade geral.

## Checklist de Revisao de PR

### 1. Seguranca de Credenciais (BLOQUEANTE)
- [ ] NENHUMA credencial real (API keys, senhas, tokens, emails) nos arquivos alterados.
- [ ] `portainer-stack.yml` e `docker-compose.yml` manteem placeholders (YOUR_*, changeme).
- [ ] `.env` nao esta incluido no PR.
- [ ] Buscar padroes: `sk-`, `AIza`, `@gmail.com`, strings alfanumericas longas, `Bearer `.
- [ ] Se credenciais forem encontradas: **BLOQUEAR o PR** e solicitar remocao imediata.

### 2. CSS e Tailwind (BLOQUEANTE)
- [ ] Nenhum uso de `@theme inline` do Tailwind v4 — nao funciona em producao Docker.
- [ ] Estilos visuais novos adicionados em `src/app/globals.css`.
- [ ] Inline styles para layout (`style={{ }}`).
- [ ] Dark mode usa `data-theme="dark"` com CSS custom properties.
- [ ] Se `@theme` for encontrado: **BLOQUEAR o PR**.

### 3. Portugues e Acentuacao
- [ ] Textos de interface em portugues brasileiro correto.
- [ ] Acentos usando UTF-8 direto (nunca unicode escapes `\u00XX`).
- [ ] Mensagens de erro em portugues quando expostas ao usuario.
- [ ] Commit messages em portugues.

### 4. Isolamento de Features
- [ ] Codigo de dominio dentro de `src/features/<feature>/`.
- [ ] Sem imports cruzados entre features.
- [ ] Codigo compartilhado em `src/shared/`.
- [ ] Imports usando alias `@/`.
- [ ] Novos componentes no diretorio correto (`features/<dominio>/components/` ou `shared/components/`).

### 5. Headers de Seguranca
- [ ] Respostas de API nao expoe dados sensiveis.
- [ ] Endpoints protegidos validam session via `auth()`.
- [ ] Endpoints admin verificam `session.user.role === "ADMIN"`.
- [ ] Webhooks validam origem/secret.

### 6. Compatibilidade com Deploy
- [ ] Mudancas no Dockerfile manteem `npm ci --legacy-peer-deps`.
- [ ] Mudancas no Prisma schema sao compativeis com `prisma db push --skip-generate`.
- [ ] Novas dependencias nao quebram build Docker.
- [ ] Senha do PostgreSQL com `@` continua usando `%40` na DATABASE_URL.
- [ ] Container reinicia corretamente (~30s) apos deploy.

### 7. Qualidade de Codigo
- [ ] TypeScript tipado (sem `any` desnecessario).
- [ ] camelCase para variaveis/funcoes, PascalCase para componentes.
- [ ] API routes finas (validacao -> service -> resposta).
- [ ] Tratamento de erros com try/catch adequado.
- [ ] Prisma queries otimizadas (select/include).

### 8. Compatibilidade Retroativa
- [ ] Mudancas no schema Prisma sao aditivas (novos campos opcionais, nao remocer campos usados).
- [ ] API routes existentes manteem contrato (mesmos parametros e formato de resposta).
- [ ] CSS existente nao foi quebrado por novas classes.
- [ ] Navegacao na Sidebar continua funcionando.
- [ ] Pipeline de processamento nao foi interrompido por mudancas.

## Formato da Review

### Comentarios
Cada problema encontrado deve incluir:
1. **Severidade**: BLOQUEANTE / ALTO / MEDIO / BAIXO
2. **Arquivo**: Caminho completo e linha(s) afetada(s).
3. **Problema**: Descricao clara em portugues.
4. **Sugestao**: Como corrigir.

### Severidades
- **BLOQUEANTE**: Credenciais no codigo, `@theme inline`, falha de seguranca critica. PR NAO deve ser mergeado.
- **ALTO**: Falta de autenticacao/autorizacao, imports cruzados, quebra de compatibilidade.
- **MEDIO**: Tipagem fraca, queries nao otimizadas, portugues incorreto.
- **BAIXO**: Formatacao, naming, oportunidades de melhoria.

### Resultado Final
- **APROVADO**: Nenhum problema BLOQUEANTE ou ALTO, poucos MEDIOS.
- **APROVADO COM RESSALVAS**: Nenhum BLOQUEANTE, alguns ALTOS com plano de correcao.
- **MUDANCAS NECESSARIAS**: Problemas BLOQUEANTES ou muitos ALTOS que precisam ser resolvidos.
- **REJEITADO**: Credenciais reais no codigo ou falha de seguranca grave.

## Pontos de Atencao Especificos do Projeto
- O pipeline de IA e critico — qualquer mudanca em `src/features/pipeline/` requer atencao redobrada.
- O NotebookLM usa Playwright — mudancas de browser ou automacao podem quebrar em Docker.
- A cascata de IA tem ordem especifica de fallbacks — nao alterar sem motivo.
- Dark mode depende de `data-theme` no `<html>` e localStorage `devhub-theme`.
