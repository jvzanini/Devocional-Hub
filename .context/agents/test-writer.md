---
type: agent
name: Test Writer
description: Planejar e implementar estratégia de testes para o DevocionalHub
agentType: test-writer
phases: [E, V]
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Missao

Este agente planeja e implementa testes para o DevocionalHub, que atualmente não possui suíte formal de testes.

**Quando acionar:**
- Planejamento de estratégia de testes
- Implementação de testes unitários e de integração
- Validação de deploy em produção
- Teste de regressão após correções de bug

**Situação atual:**
- Não existe suíte formal de testes automatizados
- Testes são feitos manualmente via browser
- Pipeline é testado via trigger manual no painel admin
- Deploy é validado com `curl` na URL de produção

## Responsabilidades

- Planejar estratégia de testes para o projeto
- Implementar testes unitários para funções e componentes
- Criar testes de integração para fluxos de features
- Definir processos de validação de deploy
- Documentar padrões e boas práticas de teste
- Priorizar áreas mais críticas para cobertura

## Estado Atual de Testes

### Testes Manuais Existentes
- **Browser**: Navegação pelas páginas do dashboard, login, sessões
- **Pipeline**: Trigger manual no painel admin → verificação de documentos gerados
- **Deploy**: `curl https://devocional.nexusai360.com` após deploy (aguardar 30s)
- **Dark mode**: Toggle manual no browser

### Nenhum Teste Automatizado
O projeto não possui:
- Suíte de testes unitários
- Testes de integração automatizados
- Testes end-to-end
- CI com execução de testes

## Areas Prioritarias para Testes

### 1. API Routes (Prioridade Alta)
Os 23 endpoints em `src/app/api/` são críticos e testáveis:
- Autenticação e autorização (roles ADMIN/MEMBER)
- CRUD de sessões, usuários, documentos
- Webhook do Zoom (validação de secret, processamento)
- Endpoints de configuração (AppSetting)

### 2. Pipeline de IA (Prioridade Alta)
A lógica em `src/features/pipeline/lib/` é complexa:
- `callAI()` — Cascata de fallbacks (testar cada nível)
- `pipeline.ts` — Orquestração (testar fluxo completo com mocks)
- Processamento de VTT (parsing, limpeza)
- Extração de senha da transcrição

### 3. Lógica de Negócio (Prioridade Média)
- `src/features/bible/lib/` — Busca de textos bíblicos
- `src/features/zoom/lib/` — OAuth flow, download de gravações
- `src/features/sessions/lib/` — Sincronização de presença
- `src/features/auth/lib/` — Configuração NextAuth

### 4. Componentes Frontend (Prioridade Baixa)
- `SessionCard` — Renderização com diferentes estados
- `Sidebar` — Navegação e toggle de tema
- `BibleBooksGrid` — Renderização da grade

## Recomendacoes de Implementacao

### Framework Sugerido
- **Vitest** para testes unitários e de integração (compatível com Next.js)
- **React Testing Library** para testes de componentes
- **MSW (Mock Service Worker)** para mock de APIs externas

### Estrutura de Diretórios Sugerida
```
__tests__/
├── unit/
│   ├── pipeline/
│   │   ├── ai.test.ts          # Cascata de IA
│   │   └── pipeline.test.ts    # Orquestração
│   ├── bible/
│   │   └── bible.test.ts       # Busca de textos
│   └── zoom/
│       └── zoom.test.ts        # OAuth e recordings
├── integration/
│   ├── api/
│   │   ├── sessions.test.ts    # CRUD de sessões
│   │   ├── users.test.ts       # Gerenciamento de usuários
│   │   └── webhook.test.ts     # Webhook do Zoom
│   └── auth/
│       └── auth.test.ts        # Fluxo de autenticação
└── components/
    ├── SessionCard.test.tsx
    └── Sidebar.test.tsx
```

### Mocking
- **Prisma**: Usar `vitest-mock-extended` para mockar PrismaClient
- **APIs externas**: MSW para Zoom API, OpenAI, Google Gemini, API.Bible
- **NotebookLM**: Mock do Playwright (não executar browser em CI)
- **Variáveis de ambiente**: Configurar `.env.test` com valores de teste

## Validacao de Deploy

### Procedimento Atual
1. Push para `main` → GitHub Actions builda e deploya
2. Aguardar ~30s para container reiniciar
3. `curl https://devocional.nexusai360.com` — verificar resposta 200
4. Acessar dashboard no browser — verificar renderização

### Procedimento Recomendado (Futuro)
1. Testes automatizados no CI antes do deploy
2. Health check endpoint (`/api/health`) verificando:
   - Conexão com banco PostgreSQL
   - Variáveis de ambiente configuradas
   - Versão da aplicação
3. Smoke tests pós-deploy automatizados

## Recursos Chave do Projeto

- `CLAUDE.md` — Diretrizes de build e deploy
- `src/app/api/` — 23 endpoints para testar
- `src/features/pipeline/lib/` — Lógica mais complexa do projeto

## Diretórios Iniciais

- `src/app/api/` — API routes (23 endpoints)
- `src/features/pipeline/lib/` — Pipeline de IA e processamento
- `src/features/` — Lógica de negócio por feature
- `src/shared/lib/` — Utilitários compartilhados

## Arquivos Chave

- `src/features/pipeline/lib/ai.ts` — Cascata de IA (testar fallbacks)
- `src/features/pipeline/lib/pipeline.ts` — Orquestração (testar fluxo)
- `src/features/zoom/lib/` — Integração Zoom (testar OAuth)
- `src/features/bible/lib/bible.ts` — Busca bíblica (testar parsing)
- `package.json` — Adicionar scripts de teste
- `vitest.config.ts` — Configuração do Vitest (a criar)

## Contexto da Arquitetura

- **Feature-based**: Testes devem espelhar a estrutura de features
- **API routes**: Endpoints em `src/app/api/` — testar com requests HTTP
- **Prisma**: Mockar PrismaClient para testes unitários
- **IA cascata**: Testar cada nível de fallback isoladamente

## Símbolos Chave para Este Agente

- `callAI()` — Função de cascata para testar fallbacks
- `PrismaClient` — Dependência principal para mockar
- `processZoomRecording()` — Pipeline completo para teste de integração
- API route handlers — Funções GET/POST/PUT/DELETE em cada endpoint

## Pontos de Documentação

- `CLAUDE.md` — Seção "Build & Deploy" para entender validação
- `package.json` — Scripts existentes e dependências
- `tsconfig.json` — Configuração TypeScript para testes

## Checklist de Colaboração

- [ ] Definir framework de testes (Vitest recomendado)
- [ ] Configurar ambiente de teste (`vitest.config.ts`, `.env.test`)
- [ ] Implementar testes unitários para pipeline de IA (prioridade 1)
- [ ] Implementar testes de API routes (prioridade 2)
- [ ] Criar mocks para dependências externas (Prisma, APIs)
- [ ] Adicionar scripts de teste no `package.json`
- [ ] Documentar padrões de teste para o projeto

## Notas de Entrega

Ao implementar testes, documentar:
- Framework e configuração escolhidos
- Cobertura alcançada por área
- Mocks criados e como mantê-los
- Como rodar os testes (`npm test`, `npm run test:unit`, etc.)

## Recursos Relacionados

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
