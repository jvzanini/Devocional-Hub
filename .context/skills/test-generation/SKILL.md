---
name: test-generation
description: Gerar casos de teste para o DevocionalHub
---

# Test Generation — DevocionalHub

## Objetivo
Definir estrategia de testes e gerar casos de teste para o DevocionalHub. O projeto atualmente NAO possui suite de testes automatizados.

## Estado Atual
- **Sem suite de testes configurada** — nenhum framework de teste instalado.
- **Testes manuais** sao a pratica atual.
- **Validacao de deploy** feita com `curl` apos cada deploy.

## Estrategia Recomendada

### 1. Testes Unitarios de API Routes (Jest)
**Framework recomendado**: Jest + ts-jest

**O que testar**:
- Cada API route em `src/app/api/` (23 endpoints existentes).
- Validacao de autenticacao (retorna 401 sem session).
- Validacao de autorizacao RBAC (retorna 403 para MEMBER em rota ADMIN).
- Validacao de input (retorna 400 para dados invalidos).
- Respostas de sucesso (status 200/201 com formato correto).
- Tratamento de erros (retorna 500 com mensagem adequada).

**Mocks necessarios**:
- `auth()` do NextAuth — mockar session com user e role.
- `prisma` do `@/shared/lib/db` — mockar queries do Prisma.
- `callAI` de `@/features/pipeline/lib/ai.ts` — mockar respostas de IA.

**Exemplo de estrutura**:
```
__tests__/
├── api/
│   ├── sessions.test.ts
│   ├── admin/users.test.ts
│   ├── pipeline/run.test.ts
│   └── webhook/zoom.test.ts
├── features/
│   ├── pipeline/ai.test.ts
│   └── zoom/recordings.test.ts
└── setup.ts
```

### 2. Testes do Pipeline (Manual + Semi-automatizado)
O pipeline de processamento e complexo e depende de servicos externos. Testar manualmente:

- [ ] Webhook Zoom recebe evento `meeting.ended` e dispara pipeline.
- [ ] VTT e baixado corretamente apos 5min de espera.
- [ ] UUID com `/` ou `+` e codificado corretamente (duplo URL-encode).
- [ ] Cascata de IA processa transcricao com fallbacks funcionando.
- [ ] Texto biblico NVI e buscado via API.Bible.
- [ ] NotebookLM gera slides, infografico e video resumo.
- [ ] Documentos sao salvos no banco com tipo correto.

### 3. Validacao de Deploy (curl)
Apos cada deploy, validar com curl:

```bash
# Verificar que o site esta respondendo
curl -I https://devocional.nexusai360.com

# Verificar status 200
curl -o /dev/null -s -w "%{http_code}" https://devocional.nexusai360.com

# Verificar headers de seguranca (HSTS)
curl -I https://devocional.nexusai360.com 2>&1 | grep -i strict
```

### 4. Testes de CSS em Producao
- Verificar que estilos sao renderizados corretamente em producao.
- Abrir em modo incognito (sem cache) apos deploy.
- Testar dark mode (toggle no Sidebar).
- Confirmar que classes de `globals.css` estao aplicadas.
- Verificar que nenhum `@theme inline` foi introduzido.

## Casos de Teste Prioritarios

### API Routes Criticas
1. **POST /api/auth/login** — Login com credenciais validas/invalidas.
2. **GET /api/sessions** — Listagem de sessoes (autenticado vs nao autenticado).
3. **POST /api/pipeline/run** — Execucao do pipeline (apenas ADMIN).
4. **POST /api/webhook/zoom** — Recepcao de webhook (validacao de secret).
5. **GET /api/admin/users** — Listagem de usuarios (apenas ADMIN).

### Seguranca
1. Todas as rotas protegidas retornam 401 sem autenticacao.
2. Rotas admin retornam 403 para MEMBER.
3. Webhook valida origem antes de processar.
4. Nenhuma credencial exposta em respostas de API.

### Pipeline
1. callAI tenta OpenAI primeiro, faz fallback para OpenRouter, depois Gemini.
2. Erro em todos os provedores retorna mensagem clara.
3. UUID com caracteres especiais e codificado corretamente.

## Convencoes de Teste
- Nomes de teste em portugues: `describe("Sessoes API")`, `it("deve retornar 401 sem autenticacao")`.
- Arquivos de teste com sufixo `.test.ts`.
- Usar mocks para dependencias externas (banco, APIs, auth).
- Nao testar contra banco real — usar mocks do Prisma.
