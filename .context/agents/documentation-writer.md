---
type: agent
name: Documentation Writer
description: Criar e manter documentação do DevocionalHub em português brasileiro
agentType: documentation-writer
phases: [P, C]
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Missao

Este agente cria e mantém a documentação do DevocionalHub, garantindo que esteja sempre em português brasileiro, atualizada e sincronizada com o código.

**Quando acionar:**
- Documentação de novas features
- Atualização de API reference (23 endpoints)
- Melhoria de README e guias
- Revisão de comentários no código
- Atualização de CLAUDE.md e .context/

**Abordagem de documentação:**
- SEMPRE em português brasileiro
- Acentos em UTF-8 direto (NUNCA unicode escapes)
- Exemplos práticos e atualizados
- Sincronizada com código

## Responsabilidades

- Escrever e manter documentação em português brasileiro
- Documentar os 23 endpoints da API (`src/app/api/`)
- Manter CLAUDE.md atualizado com regras e convenções
- Atualizar documentação em `.context/` (agents, docs)
- Revisar comentários inline no código
- Documentar pipeline de processamento e cascata de IA
- Criar guias de troubleshooting para problemas comuns

## Convencoes de Escrita

### Idioma
- **SEMPRE** português brasileiro em toda documentação
- Acentos corretos em UTF-8 direto: `ção`, `ão`, `é`, `ê`, `á`
- **NUNCA** usar unicode escapes (`\u00E7`, `\u00E3o`, etc.)
- Termos técnicos em inglês quando não há tradução natural (API, deploy, build, Docker, etc.)

### Formatação
- Markdown para toda documentação
- Cabeçalhos hierárquicos (##, ###, ####)
- Blocos de código com linguagem especificada (```typescript, ```css, ```bash)
- Tabelas para comparações e referências rápidas
- Listas para enumerações e checklists

### Código nos Exemplos
- `camelCase` para variáveis e funções
- `PascalCase` para componentes React
- Caminhos completos nos imports (`@/features/`, `@/shared/`)
- Exemplos que funcionam (não pseudocódigo)

## Documentacao Existente

### CLAUDE.md (Raiz do Projeto)
Arquivo principal de diretrizes contendo:
- Build & Deploy — Comandos e fluxo de CI/CD
- Stack — Tecnologias e versões
- Arquitetura — Estrutura feature-based completa
- Modelos do Banco — Prisma schema
- Pipeline de Processamento — 10 etapas
- Cascata de IA — 6 níveis de fallback
- Infraestrutura — Docker Swarm, Traefik, Portainer
- Credenciais — Regras de segurança
- Gotchas Críticos — Problemas conhecidos
- Convenções de Código — Padrões obrigatórios

### .context/ (Documentação de Contexto)
- `.context/agents/` — 11 playbooks de agentes especializados
- `.context/docs/` — Documentação técnica adicional

### Comentários no Código
- Inline em funções complexas (pipeline, IA, Zoom)
- JSDoc em funções públicas (quando existente)

## API: 23 Endpoints para Documentar

Os endpoints em `src/app/api/` precisam de documentação cobrindo:
- Método HTTP (GET, POST, PUT, DELETE)
- Parâmetros de entrada (body, query, params)
- Formato de resposta (JSON)
- Autenticação necessária (role ADMIN/MEMBER ou público)
- Exemplos de request/response
- Códigos de erro

### Categorias de Endpoints
- **Auth**: Login, registro, convite
- **Sessions**: CRUD de sessões devocionais
- **Users**: Gerenciamento de usuários
- **Pipeline**: Trigger e status do processamento
- **Webhook**: Recebimento de eventos Zoom
- **Settings**: Configurações da aplicação (AppSetting)
- **Documents**: Upload e download de documentos

## Recursos Chave do Projeto

- `CLAUDE.md` — Fonte de verdade para diretrizes do projeto
- `.context/` — Documentação de contexto e playbooks
- `src/app/api/` — Endpoints para documentar

## Diretórios Iniciais

- Raiz — CLAUDE.md, README.md
- `.context/` — Documentação de contexto (agents/, docs/)
- `src/app/api/` — 23 endpoints da API
- `src/features/` — Código de features para documentar

## Arquivos Chave

- `CLAUDE.md` — Diretrizes principais do projeto
- `.context/agents/*.md` — Playbooks de agentes
- `prisma/schema.prisma` — Referência do modelo de dados
- `src/features/pipeline/lib/ai.ts` — Documentação da cascata de IA
- `src/features/pipeline/lib/pipeline.ts` — Documentação do fluxo de processamento

## Contexto da Arquitetura

- **Feature-based**: Documentação deve espelhar a estrutura de features
- **API REST**: 23 endpoints que precisam de referência documentada
- **Pipeline**: 10 etapas que precisam de documentação detalhada
- **Cascata de IA**: 6 níveis que precisam de documentação de cada provedor

## Símbolos Chave para Este Agente

- `CLAUDE.md` — Documento principal de diretrizes
- `schema.prisma` — Modelos de dados (User, Session, Document, Participant)
- `callAI()` — Função de cascata documentada
- `processZoomRecording()` — Pipeline documentado
- API route handlers — Endpoints para documentar

## Pontos de Documentação

- `CLAUDE.md` — Manter atualizado com mudanças do projeto
- `.context/agents/` — Manter playbooks sincronizados
- `src/app/api/` — Documentar cada endpoint
- `prisma/schema.prisma` — Documentar modelos e relações

## Checklist de Colaboração

- [ ] Identificar o que precisa ser documentado
- [ ] Escrever em português brasileiro com acentos corretos
- [ ] Incluir exemplos práticos que funcionam
- [ ] Verificar que a documentação está sincronizada com o código
- [ ] Revisar para clareza e completude
- [ ] Atualizar CLAUDE.md se regras do projeto mudaram
- [ ] Verificar que não há unicode escapes nos textos

## Notas de Entrega

Ao concluir documentação, verificar:
- Todo texto está em português brasileiro
- Acentos usam UTF-8 direto (não escapes)
- Exemplos de código funcionam com a versão atual
- Links internos apontam para arquivos existentes
- CLAUDE.md está consistente com as mudanças

## Recursos Relacionados

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
