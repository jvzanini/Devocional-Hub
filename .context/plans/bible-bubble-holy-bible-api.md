---
status: filled
progress: 0
generated: 2026-03-21
agents:
  - type: "feature-developer"
    role: "Implementar migração backend e integração com Holy Bible API + Word Project"
  - type: "refactoring-specialist"
    role: "Remover código obsoleto da API.Bible e limpar dependências"
  - type: "documentation-writer"
    role: "Atualizar CLAUDE.md, .env.example, e documentação do projeto"
phases:
  - id: "phase-1"
    name: "Backend — Novo client Holy Bible API + Word Project Audio"
    prevc: "E"
    agent: "feature-developer"
  - id: "phase-2"
    name: "Limpeza — Remover API.Bible e código obsoleto"
    prevc: "E"
    agent: "refactoring-specialist"
  - id: "phase-3"
    name: "Validação, Deploy e Documentação"
    prevc: "V"
    agent: "documentation-writer"
lastUpdated: "2026-03-21T17:07:37.113Z"
---

# Migrar Bible Bubble para Holy Bible API + Word Project Audio

> Substituir completamente a API.Bible (requer API key, sem áudio PT) pela Holy Bible API (gratuita, sem key, 14 versões PT) + Word Project (áudio MP3 PT-BR, Bíblia completa). Zero mudanças no frontend — toda a UI (BibleModal, AudioPlayer, seletores) permanece intacta.

## Task Snapshot
- **Primary goal:** Bible Bubble funcional com texto NVI + áudio PT-BR, sem dependência de API key
- **Success signal:** Texto NVI carrega em produção + player de áudio toca MP3 PT-BR + zero erros no console

## Arquitetura Nova

```
Frontend → /api/bible/content → holy-bible-client.ts → holy-bible-api.com (GRATUITO, SEM KEY)
Frontend → /api/bible/audio  → word-project-audio.ts → wordproaudio.org (MP3 DIRETO PT-BR)
Frontend → /api/bible/versions → version-discovery.ts → lista estática (12 versões PT funcionais)
```

## Phase 1 — Backend: Novos clients + rotas

| # | Task | Deliverable |
|---|------|-------------|
| 1.1 | Criar holy-bible-client.ts | Client HTTP para Holy Bible API |
| 1.2 | Criar word-project-audio.ts | Função getWordProjectAudioUrl() |
| 1.3 | Reescrever version-discovery.ts | 12 versões PT com IDs numéricos |
| 1.4 | Reescrever rota /api/bible/content | Usa holy-bible-client |
| 1.5 | Reescrever rota /api/bible/audio | Retorna URL Word Project |
| 1.6 | Atualizar rota /api/bible/versions | Usa nova discovery |
| 1.7 | Atualizar devocional-context.ts | Default version = 644 (NVI) |

## Phase 2 — Limpeza de código obsoleto

| # | Task | Deliverable |
|---|------|-------------|
| 2.1 | Remover bible-api-client.ts | Arquivo deletado |
| 2.2 | Remover rotas /api/bible/books e /chapters | Diretórios removidos |
| 2.3 | Remover FUMS tracking do audio-manager.ts | Código simplificado |
| 2.4 | Remover BIBLE_API_KEY/BIBLE_NVI_ID de configs | .env, docker-compose, portainer limpos |
| 2.5 | Atualizar bible.ts (pipeline fallback) | Usa Holy Bible API |

## Phase 3 — Validação, deploy e documentação

| # | Task | Deliverable |
|---|------|-------------|
| 3.1 | tsc --noEmit sem erros | Zero erros TypeScript |
| 3.2 | Testar API via curl | Texto NVI + áudio URL funcionam |
| 3.3 | Commit + push + deploy | CI/CD concluído |
| 3.4 | Verificar em produção | Texto + áudio funcionando |
| 3.5 | Atualizar CLAUDE.md | Documentação completa |

## Execution History

> Last updated: 2026-03-21T17:07:37.113Z | Progress: 0%

### phase-1 [IN PROGRESS]
- Started: 2026-03-21T17:07:37.113Z

- [ ] Step 1: Step 1 *(in progress)*
