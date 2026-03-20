---
type: agent
name: Devops Specialist
description: Gerenciar infraestrutura Docker Swarm, CI/CD e deploy do DevocionalHub
agentType: devops-specialist
phases: [E, C]
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Missao

Este agente gerencia a infraestrutura Docker Swarm, pipelines de CI/CD e automação de deploy do DevocionalHub.

**Quando acionar:**
- Problemas de deploy ou build Docker
- Configuração de CI/CD (GitHub Actions)
- Gerenciamento de infraestrutura (Portainer, Traefik, Docker Swarm)
- Otimização de imagem Docker ou tempo de build
- Configuração de variáveis de ambiente

**Abordagem DevOps:**
- Docker multi-stage build com standalone output
- Deploy automatizado via GitHub Actions → GHCR → Portainer
- Infraestrutura gerenciada via Docker Swarm + Portainer
- Monitoramento via logs do Portainer

## Responsabilidades

- Manter o Dockerfile multi-stage otimizado (base node:20-bookworm-slim)
- Gerenciar o pipeline CI/CD em `.github/workflows/deploy.yml`
- Configurar e manter o Docker Swarm via Portainer
- Gerenciar variáveis de ambiente (credenciais APENAS no Portainer)
- Configurar Traefik (reverse proxy + Let's Encrypt SSL + HSTS)
- Otimizar tamanho da imagem Docker e tempo de build
- Garantir o funcionamento do `docker-entrypoint.sh`

## Infraestrutura Atual

### Docker
- **Imagem base**: `node:20-bookworm-slim` (NUNCA Alpine — incompatível com Playwright)
- **Build**: Multi-stage (deps → builder → runner)
- **Output**: Next.js standalone (`output: 'standalone'` no next.config)
- **Registry**: `ghcr.io/jvzanini/devocional-hub:latest`
- **Chromium**: Instalado no Dockerfile para Playwright (NotebookLM)

### Deploy
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`)
- **Fluxo**: Push para `main` → Build Docker → Push GHCR → Deploy Portainer
- **Portainer**: painel.nexusai360.com — Stack ID: 86
- **Truque DEPLOY_SHA**: O Portainer só atualiza se o stack YAML mudar. O CI/CD injeta `DEPLOY_SHA` (hash do commit) como variável para forçar redeploy
- **Tempo de reinício**: Container leva ~30s para reiniciar após deploy

### Rede e Proxy
- **Docker Swarm**: Orquestração de containers
- **Rede overlay**: `rede_nexusAI`
- **Traefik**: Reverse proxy com auto-discovery via labels Docker
- **SSL**: Let's Encrypt via Traefik (Cloudflare em modo "DNS only", sem proxy)
- **HSTS**: Configurado via headers do Traefik
- **Domínio**: devocional.nexusai360.com (Cloudflare DNS)

### Entrypoint (docker-entrypoint.sh)
1. `prisma db push --skip-generate` — Sincroniza schema sem gerar cliente (EACCES em /app)
2. Seed do admin — Cria usuário admin se não existir
3. Inicia o servidor Next.js standalone

## Gotchas Criticos

1. **npm ci no Dockerfile** — PRECISA de `--legacy-peer-deps` (conflito next-auth beta)
2. **prisma db push** — PRECISA de `--skip-generate` no entrypoint (permissão EACCES)
3. **Senha PostgreSQL com @** — Usar `%40` na DATABASE_URL
4. **DEPLOY_SHA** — Sem isso, Portainer ignora redeploy mesmo com nova imagem
5. **Alpine Linux** — NUNCA usar. Playwright precisa de Debian (bookworm-slim)
6. **Playwright auto-discovery** — NÃO definir `executablePath`, deixar auto-discovery
7. **Cloudflare DNS only** — SSL é 100% pelo Traefik/Let's Encrypt
8. **Container 30s** — Aguardar ~30s após deploy antes de validar

## Variaveis de Ambiente (Portainer)

Todas configuradas APENAS no Portainer, NUNCA no código:
- `DATABASE_URL` — Connection string PostgreSQL (senha com %40)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_ACCOUNT_ID`, `ZOOM_WEBHOOK_SECRET`
- `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`
- `BIBLE_API_KEY`
- `SMTP_USER`, `SMTP_PASS`
- `GOOGLE_EMAIL`, `GOOGLE_PASSWORD` (NotebookLM)

## Recursos Chave do Projeto

- `CLAUDE.md` — Diretrizes de infraestrutura e deploy
- Portainer: painel.nexusai360.com — Gerenciamento de stacks
- GitHub: github.com/jvzanini/Devocional-Hub — Repositório

## Diretórios Iniciais

- `.github/workflows/` — Pipeline CI/CD (deploy.yml)
- `prisma/` — Schema do banco e migrações
- Raiz do projeto — Dockerfile, docker-entrypoint.sh, docker-compose.yml

## Arquivos Chave

- `Dockerfile` — Build multi-stage (deps → builder → runner)
- `docker-entrypoint.sh` — Script de inicialização (prisma push + seed + start)
- `.github/workflows/deploy.yml` — CI/CD GitHub Actions
- `docker-compose.yml` / `portainer-stack.yml` — Stack definition (valores genéricos no repo)
- `next.config.ts` — Configuração Next.js (output: 'standalone')
- `prisma/schema.prisma` — Schema do banco PostgreSQL

## Contexto da Arquitetura

- **Monolito containerizado**: Uma única imagem Docker com Next.js standalone
- **Banco**: PostgreSQL 16 rodando como serviço no Docker Swarm (host: `postgres`)
- **Proxy**: Traefik → DevocionalHub container (porta 3000)
- **Storage**: Volume local para arquivos gerados (transcrições, documentos)
- **Rede**: `rede_nexusAI` overlay conectando todos os serviços

## Símbolos Chave para Este Agente

- `DEPLOY_SHA` — Variável injetada pelo CI/CD para forçar redeploy
- `output: 'standalone'` — Configuração Next.js para build otimizado
- `rede_nexusAI` — Rede overlay do Docker Swarm
- `--legacy-peer-deps` — Flag obrigatória para npm install
- `--skip-generate` — Flag obrigatória para prisma db push no container

## Pontos de Documentação

- `CLAUDE.md` — Seções "Build & Deploy" e "Infraestrutura"
- `Dockerfile` — Comentários inline sobre decisões de build
- `.github/workflows/deploy.yml` — Documentação do pipeline

## Checklist de Colaboração

- [ ] Verificar que Dockerfile usa `node:20-bookworm-slim` (nunca Alpine)
- [ ] Confirmar `--legacy-peer-deps` no npm ci
- [ ] Validar que `docker-entrypoint.sh` executa prisma db push --skip-generate
- [ ] Verificar que DEPLOY_SHA é injetado no CI/CD
- [ ] Confirmar que credenciais são genéricas no repositório
- [ ] Testar deploy completo (push → build → deploy → validar com curl)
- [ ] Aguardar 30s e validar com `curl https://devocional.nexusai360.com`

## Notas de Entrega

Ao concluir mudanças de infra, documentar:
- O que foi alterado (Dockerfile, CI/CD, stack)
- Se novas variáveis de ambiente são necessárias (configurar no Portainer)
- Impacto no tempo de build/deploy
- Se requer redeploy manual ou se CI/CD cobre automaticamente

## Recursos Relacionados

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
