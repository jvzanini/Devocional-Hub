---
name: bug-investigation
description: Investigacao sistematica de bugs e analise de causa raiz no DevocionalHub
---

# Bug Investigation — DevocionalHub

## Objetivo
Investigar bugs de forma sistematica no DevocionalHub, cobrindo problemas de pipeline, CSS em producao, automacao Playwright, cascata de IA e deploy.

## Categorias Comuns de Bugs

### 1. Falhas no Pipeline de Processamento
**Sintomas**: Sessao nao e processada, documentos faltando, transcricao vazia.

**Investigacao**:
- Verificar logs no Portainer (painel.nexusai360.com) para o container devocional-hub.
- Checar se o webhook Zoom (`meeting.ended`) foi recebido em `src/app/api/webhook/zoom/route.ts`.
- Verificar se a espera de 5min para VTT ficar pronto foi respeitada.
- Checar UUID do Zoom: se contem `/` ou `+`, precisa de duplo URL-encode (`%252F`, `%252B`).
- Verificar em `src/features/pipeline/lib/pipeline.ts` qual etapa falhou.
- Verificar em `src/features/pipeline/lib/ai.ts` se a cascata de IA esgotou todos os fallbacks.

**Arquivos relevantes**:
- `src/features/pipeline/lib/pipeline.ts` — Orquestracao principal.
- `src/features/pipeline/lib/ai.ts` — Cascata de IA (callAI).
- `src/features/pipeline/lib/notebooklm.ts` — Automacao NotebookLM.
- `src/features/zoom/lib/` — Integracao Zoom (OAuth, recordings, participants).

### 2. Problemas de CSS em Producao (Docker)
**Sintomas**: Estilos aparecem no dev local mas somem em producao, layout quebrado, dark mode inconsistente.

**Causa raiz mais comum**: Uso de `@theme inline` do Tailwind v4.

**Investigacao**:
- Procurar por `@theme` em arquivos CSS — se encontrar, substituir por CSS custom properties em `:root`.
- Verificar se estilos visuais estao em `src/app/globals.css` com classes hardcoded.
- Confirmar que inline styles (`style={{ }}`) sao usados para layout.
- Verificar dark mode: `data-theme="dark"` no `<html>`, salvo em localStorage como `devhub-theme`.
- Testar com `curl` para verificar se o CSS esta sendo servido corretamente.

### 3. Erros na Automacao Playwright (NotebookLM)
**Sintomas**: NotebookLM nao gera slides/infografico/video, browser crash, timeout.

**Investigacao**:
- Verificar se o Playwright esta usando auto-discovery do Chromium (NAO usar `executablePath`).
- Em Docker, usar imagem base Debian bookworm (Alpine Chromium e incompativel com Playwright 1.58+).
- Checar se as credenciais Google (GOOGLE_EMAIL, GOOGLE_PASSWORD) estao corretas no Portainer.
- Verificar timeouts na automacao em `src/features/pipeline/lib/notebooklm.ts`.
- Procurar erros de `page.waitForSelector` ou `page.click` nos logs.

### 4. Erros na Cascata de IA
**Sintomas**: Resumo/sumario vazio, erro 429 (rate limit), resposta truncada.

**Investigacao**:
- Verificar logs da funcao `callAI` em `src/features/pipeline/lib/ai.ts`.
- Checar ordem de fallback: OpenAI -> Nemotron 120B -> Step 3.5 Flash -> Nemotron 30B -> Gemini 2.5 Flash.
- Verificar se as API keys estao definidas no Portainer: OPENAI_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY.
- Verificar modelo configurado no admin (AppSetting com key `aiModel`).
- Checar se os modelos gratuitos do OpenRouter ainda estao disponiveis.

### 5. Problemas de Deploy
**Sintomas**: Container nao atualiza, app nao responde apos deploy, erro de banco.

**Investigacao**:
- Verificar se `DEPLOY_SHA` foi injetado no stack YAML (Portainer so atualiza se o YAML mudar).
- Checar GitHub Actions em `.github/workflows/deploy.yml` para erros de build.
- Container leva ~30s para reiniciar — aguardar antes de validar.
- Verificar `prisma db push --skip-generate` no entrypoint (EACCES no /app).
- Checar `npm ci --legacy-peer-deps` no Dockerfile.
- Senha do PostgreSQL com `@` precisa de `%40` na DATABASE_URL.

## Processo de Investigacao

1. **Reproduzir**: Identificar o cenario exato que causa o bug.
2. **Localizar**: Usar logs do Portainer + busca no codigo para encontrar o ponto de falha.
3. **Diagnosticar**: Analisar a causa raiz (nao apenas o sintoma).
4. **Corrigir**: Aplicar a correcao no arquivo correto da feature.
5. **Validar**: Apos deploy, verificar com `curl https://devocional.nexusai360.com` e checar logs no Portainer.

## Validacao Pos-Correcao
- `curl -I https://devocional.nexusai360.com` — Verificar status 200 e headers.
- Checar logs do container no Portainer por 2-3 minutos apos deploy.
- Para bugs de pipeline: disparar um processamento de teste e acompanhar logs.
- Para bugs de CSS: verificar no navegador em modo incognito (cache limpo).
