---
name: documentation
description: Gerar e atualizar documentacao tecnica do DevocionalHub
---

# Documentacao — DevocionalHub

## Objetivo
Gerar e manter documentacao tecnica do projeto DevocionalHub, cobrindo arquitetura, API routes, pipeline de IA, e instrucoes de deploy.

## Referencia Principal
- O arquivo `CLAUDE.md` na raiz do repositorio e a fonte de verdade para arquitetura, stack, convencoes e gotchas.
- Sempre consultar `CLAUDE.md` antes de documentar qualquer aspecto do projeto.

## O Que Documentar

### Arquitetura Feature-Based
- Estrutura de `src/features/` com dominios: auth, sessions, pipeline, zoom, bible, email, admin, dashboard.
- Camada de roteamento em `src/app/` (App Router do Next.js 16).
- Codigo compartilhado em `src/shared/` (db.ts, storage.ts, utils.ts, Sidebar, componentes UI).

### API Routes (23 endpoints)
- Localizar todos os endpoints em `src/app/api/`.
- Documentar para cada rota: metodo HTTP, parametros, corpo esperado, resposta, autenticacao requerida (NextAuth session), role necessario (ADMIN/MEMBER).
- Formato: tabela ou lista organizada por dominio (auth, sessions, pipeline, zoom, admin, webhook).

### Pipeline de Processamento
- Fluxo completo: webhook Zoom -> aguarda VTT -> processa transcricao -> texto biblico NVI -> pesquisa teologica -> NotebookLM -> salva no banco.
- Cascata de IA: OpenAI (primario) -> OpenRouter Nemotron -> Step 3.5 Flash -> Nemotron 30B -> Gemini 2.5 Flash.
- Gotchas: UUID com duplo URL-encode, espera de 5min para VTT.

### Deploy e Infraestrutura
- Docker Swarm via Portainer (painel.nexusai360.com).
- CI/CD: push para `main` -> GitHub Actions -> Docker image no GHCR -> deploy Portainer.
- Traefik como reverse proxy + SSL Let's Encrypt.
- Credenciais APENAS no Portainer, NUNCA no codigo.

### Modelos de Dados (Prisma)
- Documentar cada modelo: User, Session, Participant, Document, Webhook, AppSetting.
- Relacoes entre modelos e campos importantes.

## Regras de Documentacao

1. **Idioma**: Toda documentacao em portugues brasileiro com acentos corretos (UTF-8 direto, nunca unicode escapes).
2. **Fonte de verdade**: CLAUDE.md e o documento principal. Qualquer nova documentacao deve ser consistente com ele.
3. **Formato**: Markdown limpo, sem emojis, com exemplos de codigo quando necessario.
4. **Seguranca**: NUNCA incluir credenciais, API keys, senhas ou tokens reais na documentacao. Usar placeholders (YOUR_*, changeme).
5. **Atualizacao**: Ao adicionar nova feature ou endpoint, atualizar a documentacao correspondente.
6. **Localizacao**: Documentar caminhos de arquivo sempre com path absoluto relativo a raiz do projeto (ex: `src/features/pipeline/lib/ai.ts`).

## Quando Usar Esta Skill
- Ao criar nova feature que precisa de documentacao.
- Ao adicionar ou modificar API routes.
- Ao alterar fluxo do pipeline.
- Ao atualizar infraestrutura ou processo de deploy.
- Quando solicitado pelo usuario para gerar documentacao tecnica.
