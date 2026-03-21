---
status: filled
generated: 2026-03-21
agents:
  - type: "feature-developer"
    role: "Implementar áudio Bible.is, player colapsável, busca, e melhorias UX"
  - type: "frontend-specialist"
    role: "CSS/layout fixes, bubble, seletores, formatação de texto"
  - type: "documentation-writer"
    role: "Atualizar CLAUDE.md e documentação"
phases:
  - id: "phase-1"
    name: "Áudio Bible.is — migração versão-específica"
    prevc: "E"
    agent: "feature-developer"
  - id: "phase-2"
    name: "UX — Bubble, Modal, Scroll, Seletores"
    prevc: "E"
    agent: "frontend-specialist"
  - id: "phase-3"
    name: "Player — Colapsável, Drag-to-seek, Controles flutuantes"
    prevc: "E"
    agent: "feature-developer"
  - id: "phase-4"
    name: "Texto — Formatação, margens, busca no capítulo"
    prevc: "E"
    agent: "frontend-specialist"
  - id: "phase-5"
    name: "Limpeza, Validação, Deploy e Documentação"
    prevc: "V"
    agent: "documentation-writer"
---

# Bible Bubble v4 — Bible.is Audio + UX Overhaul Completo

> Migrar áudio para Bible.is (4 versões PT com áudio versão-específico), redesenhar UX completa do modal/bubble/player com controles colapsáveis e drag-to-seek, adicionar busca no capítulo, melhorar formatação do texto, e limpar código obsoleto.

## Task Snapshot
- **Primary goal:** Áudio versão-específico (NVI/NAA/NTLH/NVT) + UX profissional do reader
- **Success signal:** Ao trocar versão, áudio muda. Player colapsável funciona. Busca encontra texto. Zero bugs de scroll/z-index.

## Dados da API Bible.is

### Filesets de áudio PT-BR (versão-específico)
| Versão | NT Fileset | OT Fileset |
|--------|-----------|-----------|
| NVI | PORNVIN1DA | PORNVIO1DA |
| NAA | PORBBSN1DA | PORBBSO1DA |
| NTLH | PO1NLHN1DA | PO1NLHO1DA |
| NVT | PORTHFN1DA | PORTHFO1DA |

### URL da API
```
GET https://live.bible.is/api/bibles/filesets/{FILESET_ID}/{BOOK_CODE}/{CHAPTER}?v=4
→ { data: [{ path: "https://cloudfront.../file.mp3?signed...", duration: 181 }] }
```

### Nota sobre títulos de seção
As APIs (Holy Bible API e Bible.is text_plain) **NÃO fornecem títulos de seção** como "Jesus transforma água em vinho". O texto vem como versículos simples. Não é possível implementar essa feature sem uma base de dados própria de títulos.

### Nota sobre busca
Bible.is tem endpoint de busca mas retorna metadados de áudio, não texto. A busca será implementada **client-side** apenas no capítulo carregado.

---

## Phase 1 — Áudio Bible.is (versão-específico)

**Objetivo:** Quando o usuário selecionar NVI, ouvir narração NVI. Quando selecionar NAA, ouvir narração NAA.

| # | Task | Deliverable |
|---|------|-------------|
| 1.1 | Criar `bible-is-audio.ts` com mapeamento de filesets | Client que chama Bible.is API |
| 1.2 | Reescrever rota `/api/bible/audio` para usar Bible.is | Retorna URL CloudFront MP3 |
| 1.3 | Atualizar `version-discovery.ts` — marcar audioAvailable correto | Apenas NVI/NAA/NTLH/NVT = true |
| 1.4 | Remover `word-project-audio.ts` | Arquivo deletado |
| 1.5 | Atualizar badge "Áudio" no VersionSelector | Mostrar apenas para versões com áudio real |

## Phase 2 — UX: Bubble, Modal, Scroll, Seletores

**Objetivo:** Corrigir todos os bugs visuais e de UX reportados nas imagens.

| # | Task | Deliverable |
|---|------|-------------|
| 2.1 | Esconder bubble quando modal está aberto (mobile) | Bubble some, modal fica por cima |
| 2.2 | Aumentar bubble 10-15% + label "Abrir Bíblia" | Bubble maior com tag |
| 2.3 | Travar scroll do body quando modal aberto (mobile) | Sem vazamento do dashboard |
| 2.4 | Bordas inferiores nos seletores (versão + livro/capítulo) | Seletores delimitados |
| 2.5 | Adicionar ícone de lupa no header | Ícone ao lado do volume |

## Phase 3 — Player: Colapsável + Drag-to-seek

**Objetivo:** Player profissional com controles colapsáveis e seek arrastável.

| # | Task | Deliverable |
|---|------|-------------|
| 3.1 | Drag-to-seek na barra de progresso (touch + mouse) | Arrastar thumb do player |
| 3.2 | Player colapsável — botão minimizar/expandir | Controles recolhem |
| 3.3 | Quando colapsado: play + prev/next flutuantes | Botões aparecem sobre conteúdo |
| 3.4 | Desktop/tablet: botão expandir quando colapsado | Pequeno botão no rodapé |
| 3.5 | Mobile: play + prev/next na posição do bubble (quando colapsado) | Controles na posição do bubble |

## Phase 4 — Texto: Formatação, margens, busca

**Objetivo:** Texto mais legível com margens adequadas e busca no capítulo.

| # | Task | Deliverable |
|---|------|-------------|
| 4.1 | Aumentar margens laterais do texto | Mais espaço para botões flutuantes |
| 4.2 | Busca no capítulo (client-side) | Lupa → campo de busca → highlight |
| 4.3 | Melhorar tipografia (espaçamento, parágrafos) | Texto mais legível |

## Phase 5 — Limpeza, Validação, Deploy, Documentação

| # | Task | Deliverable |
|---|------|-------------|
| 5.1 | Remover word-project-audio.ts | Código limpo |
| 5.2 | tsc --noEmit sem erros | Zero erros |
| 5.3 | Testar APIs via curl | Áudio Bible.is funciona |
| 5.4 | Commit + push + deploy | CI/CD concluído |
| 5.5 | Acompanhar deploy | Container em produção |
| 5.6 | Atualizar CLAUDE.md | Documentação completa |
| 5.7 | Atualizar portainer-stack.yml via API | Stack atualizada |
