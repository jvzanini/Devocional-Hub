---
type: doc
name: testing-strategy
description: Estratégia de testes e validação de qualidade do DevocionalHub
category: testing
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Estratégia de Testes

Este documento descreve a abordagem atual de testes e validação de qualidade do DevocionalHub.

## Estado Atual

O projeto **não possui suíte formal de testes automatizados**. Não há Jest, Vitest, Cypress ou qualquer framework de testes configurado para validação de código.

A validação é feita de forma manual, focada em garantir que o deploy funcione corretamente e que as funcionalidades principais estejam operacionais.

## Testes Manuais via Navegador

A principal forma de validação é o teste manual pelo navegador:

- Acessar `https://devocional.nexusai360.com` após cada deploy
- Verificar login, navegação, e funcionalidades alteradas
- Testar em modo claro e escuro (dark mode)
- Verificar responsividade quando relevante

## Validação de Deploy

Após cada deploy, o container leva aproximadamente 30 segundos para reiniciar. A validação é feita via `curl`:

```bash
# Verificar se a aplicação está respondendo (esperar 200)
curl -s -o /dev/null -w "%{http_code}" https://devocional.nexusai360.com
```

Se o retorno for `200`, o deploy foi bem-sucedido. Qualquer outro código indica problema.

## Teste do Pipeline

O pipeline de processamento (Zoom → IA → NotebookLM) é testado manualmente:

1. Acessar o painel admin em `/admin`
2. Clicar no botão "Pipeline" (componente `PipelineButton`)
3. Acompanhar os logs no console do servidor
4. Verificar se os documentos foram gerados corretamente no banco de dados

O pipeline também pode ser disparado automaticamente via webhook do Zoom (`meeting.ended`).

## Banco de Dados

**Não há PostgreSQL local.** Todo o desenvolvimento e testes são realizados contra o banco de dados na VPS. Isso significa que:

- Alterações no schema (`prisma db push`) afetam o banco de produção
- Não existe ambiente de staging ou banco separado para testes
- Cuidado redobrado ao testar operações destrutivas

## Playwright — Automação NotebookLM

O Playwright está instalado no projeto, mas **não é usado para testes**. Ele é utilizado exclusivamente para automação do Google NotebookLM:

- Login no Google com credenciais configuradas no Portainer
- Criação de notebooks com o Knowledge Base (KB) gerado pelo pipeline
- Geração automática de slides, infográficos e vídeo resumo (Audio Overview)
- Execução via Chromium headless dentro do container Docker (Debian bookworm)

> **IMPORTANTE**: Não usar `executablePath` no Playwright — deixar o auto-discovery encontrar o Chromium. Alpine Linux é incompatível; o container usa Debian bookworm.

## Oportunidades Futuras

Áreas que poderiam se beneficiar de testes automatizados no futuro:

- **Cascata de IA (`callAI`)**: Validar que o fallback entre provedores funciona corretamente
- **Processamento de VTT**: Garantir parsing correto de transcrições
- **Sincronização de presença**: Validar matching entre participantes do Zoom e usuários da plataforma
- **Rotas de API**: Testes de integração para os 23 endpoints

## Recursos Relacionados

- [development-workflow.md](./development-workflow.md)
- [glossary.md](./glossary.md)
