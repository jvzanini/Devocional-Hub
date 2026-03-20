---
name: security-audit
description: Auditoria de seguranca do codigo e infraestrutura do DevocionalHub
---

# Security Audit — DevocionalHub

## Objetivo
Auditar a seguranca do DevocionalHub cobrindo credenciais no codigo, autenticacao JWT, segredos de webhooks, controle de acesso RBAC e protecao de variaveis de ambiente.

## Checklist de Auditoria

### 1. Credenciais no Codigo (CRITICO)
- [ ] Buscar por API keys, senhas, tokens e emails reais em TODOS os arquivos versionados.
- [ ] Verificar `portainer-stack.yml` e `docker-compose.yml` — devem ter APENAS placeholders (YOUR_*, changeme).
- [ ] Confirmar que `.env` esta no `.gitignore`.
- [ ] Buscar padroes suspeitos: strings longas de caracteres alfanumericos, enderecos `@gmail.com`, `sk-`, `Bearer`.
- [ ] Verificar historico do git para credenciais que possam ter sido commitadas e removidas.

**Variaveis sensiveis do projeto**:
- ADMIN_EMAIL, ADMIN_PASSWORD
- SMTP_USER, SMTP_PASS
- ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_ACCOUNT_ID
- OPENAI_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, BIBLE_API_KEY
- GOOGLE_EMAIL, GOOGLE_PASSWORD
- NEXTAUTH_SECRET, DATABASE_URL

**Regra**: Todas devem estar definidas APENAS no Portainer (variaveis de ambiente da stack), NUNCA no codigo.

### 2. Validacao JWT (NextAuth)
- [ ] Verificar configuracao do NextAuth em `src/features/auth/lib/auth.ts`.
- [ ] Confirmar que `trustHost: true` esta definido (necessario para proxy reverso Traefik).
- [ ] Verificar que a estrategia e JWT (nao database sessions).
- [ ] Confirmar que `NEXTAUTH_SECRET` e forte e definido apenas no Portainer.
- [ ] Verificar que o middleware em `src/middleware.ts` protege as rotas corretas.

### 3. Segredos de Webhooks
- [ ] Webhook Zoom em `src/app/api/webhook/zoom/route.ts` deve validar a origem da requisicao.
- [ ] Verificar se existe validacao de token/secret antes de processar o webhook.
- [ ] Confirmar que o webhook nao expoe dados sensiveis na resposta.
- [ ] Verificar modelo Webhook no Prisma (slug, active) para controle de ativacao.

### 4. Controle de Acesso RBAC
- [ ] Todas as API routes administrativas verificam `session.user.role === "ADMIN"`.
- [ ] Retornar 403 (Forbidden) para usuarios sem permissao, nao 404.
- [ ] Verificar que endpoints de pipeline/admin nao sao acessiveis por MEMBER.
- [ ] Pagina de admin (`src/app/(dashboard)/admin/page.tsx`) verificam role no lado servidor.
- [ ] Sidebar mostra/oculta itens admin baseado no role do usuario.

### 5. Protecao de .env
- [ ] `.env` listado no `.gitignore`.
- [ ] `.env.example` (se existir) contem apenas placeholders.
- [ ] Nenhum arquivo `.env.*` commitado no repositorio.
- [ ] Dockerfile nao copia `.env` para a imagem.

### 6. Seguranca de Infraestrutura
- [ ] Traefik configurado com HSTS (Strict-Transport-Security).
- [ ] SSL via Let's Encrypt (certificados automaticos).
- [ ] Cloudflare em modo "DNS only" (sem proxy) — SSL pelo Traefik.
- [ ] Rede Docker overlay (`rede_nexusAI`) isola servicos.
- [ ] PostgreSQL acessivel apenas internamente (host: `postgres` dentro da rede Docker).

### 7. Seguranca de Dados
- [ ] Senhas de usuarios hasheadas (bcrypt) antes de armazenar.
- [ ] ContentPassword das sessoes nao exposto em listagens publicas.
- [ ] Documentos protegidos requerem autenticacao para download.
- [ ] Storage local (upload de arquivos) nao e acessivel publicamente sem autenticacao.

## Padroes de Busca para Auditoria

Buscar nos arquivos do projeto por:
- Emails: `@gmail.com`, `@hotmail.com`, `@outlook.com`
- API keys: `sk-`, `AIza`, `key-`, `Bearer `
- Senhas: `password =`, `password:`, `PASS=`, `SECRET=`
- URLs com credenciais: `://.*:.*@`
- Tokens longos: sequencias alfanumericas com mais de 20 caracteres

## Severidade
- **CRITICO**: Credencial real no codigo, falta de autenticacao em rota protegida.
- **ALTO**: Falta de verificacao de role, webhook sem validacao, .env commitado.
- **MEDIO**: HSTS ausente, headers de seguranca faltando, logs verbosos com dados sensiveis.
- **BAIXO**: Mensagens de erro genericas demais, falta de rate limiting.

## Resultado da Auditoria
Reportar em formato:
1. Severidade (CRITICO/ALTO/MEDIO/BAIXO).
2. Arquivo e linha afetada.
3. Descricao do problema.
4. Recomendacao de correcao.
5. Status (RESOLVIDO/PENDENTE).
