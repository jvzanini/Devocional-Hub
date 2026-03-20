---
type: doc
name: security
description: Security policies, authentication, secrets management, and compliance requirements
category: security
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Segurança e Conformidade — DevocionalHub

Este documento descreve as práticas de segurança, autenticação, autorização e gerenciamento de credenciais do projeto DevocionalHub.

**Princípios de Segurança**:
- Defesa em profundidade — Múltiplas camadas de segurança (Cloudflare DNS, Traefik TLS, NextAuth JWT, RBAC)
- Princípio do menor privilégio — Membros só acessam o que precisam
- Seguro por padrão — Credenciais nunca no código, SSL automático, headers de segurança ativos

## Autenticação

**Mecanismo**: NextAuth v5 (Credentials Provider)
- Estratégia: JWT (token armazenado no lado do cliente)
- Hashing de senhas: `bcryptjs`
- Configuração `trustHost: true` (necessário para funcionar atrás do reverse proxy Traefik)
- Página de login: `/login`

**Fluxo de Autenticação**:
1. Usuário submete email e senha em `/login`
2. NextAuth valida credenciais contra o banco (bcryptjs compare)
3. JWT é gerado e armazenado no cliente
4. Middleware (`src/middleware.ts`) intercepta todas as rotas
5. Se o JWT for inválido ou ausente, redireciona para `/login`

## Autorização

**Modelo**: RBAC (Role-Based Access Control) com 2 papéis

| Papel    | Acesso                                                        |
|----------|---------------------------------------------------------------|
| `ADMIN`  | Acesso total: pipeline, gerenciamento de usuários, configurações, webhooks |
| `MEMBER` | Dashboard, sessões, perfil, relatórios, livros bíblicos       |

**Aplicação**:
- Verificação no nível das API routes (server-side)
- Verificação no nível das páginas (redirecionamento se não autorizado)
- Sidebar renderiza apenas os links permitidos para o papel do usuário

## Sistema de Convites

**Fluxo**:
1. Admin cria um usuário com `inviteToken` + `inviteExpiresAt` (validade de 7 dias)
2. Email é enviado via Gmail SMTP com o link `/invite/[token]`
3. Usuário acessa o link, define sua senha
4. Token é invalidado após o uso (uso único)

**Segurança do Convite**:
- Token gerado com randomização segura
- Expira automaticamente após 7 dias
- Invalidado imediatamente após aceite

## Gerenciamento de Credenciais

**Regra Crítica**: NUNCA commitar senhas, API keys, tokens ou emails reais no Git.

**Armazenamento**:
- Todas as credenciais são configuradas via variáveis de ambiente no Portainer (painel.nexusai360.com)
- Arquivo `.env` está no `.gitignore` e nunca é commitado
- Arquivo `.env.example` contém apenas valores placeholder (`YOUR_*`, `changeme`)

**Variáveis de Ambiente Utilizadas**:
- `DATABASE_URL` — Conexão com PostgreSQL (senha com `@` usa encoding `%40`)
- `NEXTAUTH_SECRET` — Chave de assinatura dos tokens JWT
- `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_ACCOUNT_ID`, `ZOOM_WEBHOOK_SECRET` — Integração Zoom
- `OPENAI_API_KEY` — API da OpenAI (modelo primário de IA)
- `GEMINI_API_KEY` — API do Google Gemini (fallback)
- `OPENROUTER_API_KEY` — API do OpenRouter (fallback gratuito)
- `BIBLE_API_KEY` — API.Bible para textos bíblicos NVI
- `GOOGLE_EMAIL`, `GOOGLE_PASSWORD` — Credenciais para automação NotebookLM (Playwright)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — Seed do usuário admin inicial
- `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT` — Configuração de email (Gmail SMTP)

## Proteção de Dados

**Criptografia em Trânsito**:
- TLS automático via Traefik + Let's Encrypt (certificados SSL renovados automaticamente)
- Cloudflare DNS em modo "DNS only" (sem proxy) — SSL gerenciado pelo Traefik

**Headers de Segurança** (configurados em `next.config.ts`):
- `Strict-Transport-Security` (HSTS) — Força conexões HTTPS
- `X-Frame-Options` — Previne clickjacking
- `X-Content-Type-Options` — Previne MIME-type sniffing

**Proteção de Conteúdo de Sessões**:
- O modelo `Session` possui campo opcional `contentPassword`
- Quando preenchido, os documentos da sessão ficam protegidos por senha
- A senha é extraída automaticamente da transcrição pelo pipeline de IA

**Banco de Dados**:
- PostgreSQL com senha forte (caractere `@` requer URL encoding `%40` na `DATABASE_URL`)
- Acesso restrito à rede Docker interna (`rede_nexusAI`)

## Segurança de Webhooks

**Zoom Webhook**:
- Eventos `meeting.ended` são validados com `ZOOM_WEBHOOK_SECRET`
- Apenas eventos com assinatura válida são processados

**Webhooks Customizados**:
- Cada webhook possui seu próprio secret independente
- Gerenciados pelo admin via painel de configurações

## Infraestrutura

**Isolamento de Rede**:
- Docker Swarm com rede overlay isolada: `rede_nexusAI`
- Serviços (app, PostgreSQL, Traefik) comunicam-se apenas dentro da rede interna
- Apenas o Traefik expõe portas 80/443 ao público

**Reverse Proxy**:
- Traefik como reverse proxy com SSL automático (Let's Encrypt)
- Roteamento baseado em labels Docker
- Redirecionamento automático HTTP → HTTPS

**DNS**:
- Cloudflare em modo "DNS only" (sem proxy/WAF do Cloudflare)
- Domínio: `devocional.nexusai360.com`

**CI/CD**:
- GitHub Actions builda a imagem Docker e faz deploy no Portainer
- Imagem armazenada no GHCR (`ghcr.io/jvzanini/devocional-hub:latest`)
- Credenciais de deploy armazenadas como GitHub Secrets (nunca no código)

## Resposta a Incidentes

**Práticas de Segurança Contínuas**:
- Verificar antes de cada commit se não há dados sensíveis nos arquivos alterados
- Rotacionar secrets regularmente (especialmente `NEXTAUTH_SECRET` e API keys)
- Monitorar logs do Traefik e da aplicação para atividade suspeita

**Em Caso de Vazamento de Credenciais**:
1. Revogar/rotacionar imediatamente a credencial vazada
2. Atualizar a variável de ambiente no Portainer
3. Forçar redeploy do container
4. Verificar logs para uso não autorizado
5. Documentar o incidente e a correção

## Recursos Relacionados

<!-- Link para documentos relacionados para navegação cruzada. -->

- [architecture.md](./architecture.md)
