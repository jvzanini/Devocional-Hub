---
status: filled
progress: 0
generated: 2026-03-21
agents:
  - type: "bug-fixer"
    role: "Corrigir bugs críticos: bubble, admin, webhook, participantes duplicados, sincronização"
  - type: "frontend-specialist"
    role: "Redesign de UI: calendário, gráfico pizza, cards, trilha, login, perfil, planejamento"
  - type: "feature-developer"
    role: "Implementar funcionalidades: Bíblia texto/áudio, filtros relatórios, markdown planejamento"
  - type: "devops-specialist"
    role: "Limpeza de dados, deploy, validação em produção"
phases:
  - id: "etapa-1"
    name: "Bugs Críticos & Backend"
    prevc: "E"
    agent: "bug-fixer"
  - id: "etapa-2"
    name: "Dashboard & Calendário"
    prevc: "E"
    agent: "frontend-specialist"
  - id: "etapa-3"
    name: "Devocional, Cards & Navegação"
    prevc: "E"
    agent: "frontend-specialist"
  - id: "etapa-4"
    name: "Bíblia Interativa"
    prevc: "E"
    agent: "feature-developer"
  - id: "etapa-5"
    name: "Planejamento & Relatórios"
    prevc: "E"
    agent: "feature-developer"
  - id: "etapa-6"
    name: "Login, Perfil & Design"
    prevc: "E"
    agent: "frontend-specialist"
  - id: "etapa-7"
    name: "Deploy & Validação"
    prevc: "C"
    agent: "devops-specialist"
lastUpdated: "2026-03-21T03:30:00.000Z"
---

# DevocionalHub v2.1 Hotfix — Correções pós-deploy

> Correções de ~30 bugs e ajustes de UI/UX identificados pelo usuário em produção após o Master Update v2.

## Task Snapshot
- **Primary goal:** Corrigir todos os bugs críticos, ajustar UI/UX conforme feedback do usuário, limpar dados corrompidos e redesenhar componentes que ficaram fora do esperado.
- **Success signal:** Todas as telas funcionam corretamente, bubble abre, admin acessível, participantes deduplicados, calendário com cores corretas, Bíblia com texto e áudio, planejamento com markdown, relatórios com filtros em linha.

---

## Etapa 1 — Bugs Críticos & Backend
> **Agent:** `bug-fixer`

**Objetivo:** Corrigir bugs que impedem funcionalidades essenciais.

### Subetapa 1.1 — Bubble não abre
| # | Task | Status |
|---|------|--------|
| 1.1.1 | Investigar por que BibleBubbleWrapper não responde ao clique | pending |
| 1.1.2 | Corrigir handler de clique e estado isOpen | pending |
| 1.1.3 | Adicionar cursor pointer + tooltip "Abrir Bíblia" ao hover | pending |

### Subetapa 1.2 — Admin não abre
| # | Task | Status |
|---|------|--------|
| 1.2.1 | Investigar redirect de /admin para / — verificar middleware e role check | pending |
| 1.2.2 | Corrigir acesso ao Painel Admin para SUPER_ADMIN | pending |

### Subetapa 1.3 — Webhook sem filtro de meeting ID
| # | Task | Status |
|---|------|--------|
| 1.3.1 | No handler do webhook, filtrar pelo ZOOM_RECURRING_MEETING_ID configurado no admin | pending |
| 1.3.2 | Rejeitar eventos de reuniões que não correspondem ao ID configurado | pending |

### Subetapa 1.4 — Participantes duplicados
| # | Task | Status |
|---|------|--------|
| 1.4.1 | Corrigir deduplicação: agrupar por email OU nome, somar tempos | pending |
| 1.4.2 | Exibir horário de entrada e saída de cada participante | pending |
| 1.4.3 | Corrigir tag de tempo — mudar cor (amarelo+branco = péssimo contraste no dark mode) | pending |

### Subetapa 1.5 — Sincronização Zoom
| # | Task | Status |
|---|------|--------|
| 1.5.1 | Buscar email dos participantes na API do Zoom (além do username) | pending |
| 1.5.2 | Sincronizar por email OU username (ZoomIdentifier) | pending |
| 1.5.3 | Corrigir "Desconhecido" nos relatórios | pending |

### Subetapa 1.6 — Limpeza do banco
| # | Task | Status |
|---|------|--------|
| 1.6.1 | Criar endpoint/script para limpar sessões, documentos e participantes (manter users, planos, permissões) | pending |
| 1.6.2 | Executar limpeza após deploy | pending |

### Subetapa 1.7 — Foto de perfil some após redeploy
| # | Task | Status |
|---|------|--------|
| 1.7.1 | Verificar que fotos são salvas no volume Docker persistente (/app/data/user-photos/) | pending |
| 1.7.2 | Corrigir path de referência para usar volume montado | pending |

---

## Etapa 2 — Dashboard & Calendário
> **Agent:** `frontend-specialist`

**Objetivo:** Corrigir componentes visuais do dashboard.

### Subetapa 2.1 — Gráfico de pizza (distribuição por livro)
| # | Task | Status |
|---|------|--------|
| 2.1.1 | Redesenhar gráfico: percentuais junto das legendas, não distantes | pending |
| 2.1.2 | Melhorar layout do espaço de distribuição por livro | pending |

### Subetapa 2.2 — Calendário
| # | Task | Status |
|---|------|--------|
| 2.2.1 | Inverter cores: dias realizados = cor escura, dias futuros com agenda = cor viva/vibrante | pending |
| 2.2.2 | Remover contorno verde do dia atual — usar bolinha branca embaixo | pending |
| 2.2.3 | Abreviações de livros: primeira letra maiúscula, demais minúsculas (ex: "Rom" não "ROM") | pending |

### Subetapa 2.3 — Devocional mais recente
| # | Task | Status |
|---|------|--------|
| 2.3.1 | Filtrar sessões com erro/não identificadas do card "Devocional mais recente" | pending |

---

## Etapa 3 — Devocional, Cards & Navegação
> **Agent:** `frontend-specialist`

**Objetivo:** Redesenhar a página de devocional e corrigir navegação.

### Subetapa 3.1 — Menu lateral de livros
| # | Task | Status |
|---|------|--------|
| 3.1.1 | Aumentar bloco do livro (ex: "Romanos 20 sessões") — fonte maior, mais espaçamento | pending |
| 3.1.2 | Corrigir busca: filtrar blocos de livros conforme digitação | pending |

### Subetapa 3.2 — Cards de sessão
| # | Task | Status |
|---|------|--------|
| 3.2.1 | Substituir tag "Concluído" por ícone check verde visível | pending |
| 3.2.2 | Remover botão "Abrir Bíblia" (redundante com bubble) | pending |
| 3.2.3 | Trilha: mostrar preview recolhida com botão expand | pending |
| 3.2.4 | Trilha: incluir horário início/fim + ano completo (2026 não 26) | pending |

### Subetapa 3.3 — Navegação
| # | Task | Status |
|---|------|--------|
| 3.3.1 | Botão "Voltar" deve voltar para os cards (não para Início) | pending |
| 3.3.2 | Navegação por setas: filtrar/pular sessões com erro de pipeline | pending |

### Subetapa 3.4 — Dentro do card (detalhe da sessão)
| # | Task | Status |
|---|------|--------|
| 3.4.1 | Participantes deduplicados (usar lógica da etapa 1.4) | pending |
| 3.4.2 | Mostrar horário entrada/saída de cada participante | pending |
| 3.4.3 | Tag de tempo: mudar cor para melhor contraste no dark mode | pending |

---

## Etapa 4 — Bíblia Interativa
> **Agent:** `feature-developer`

**Objetivo:** Fazer a Bíblia funcionar (texto, áudio, seletores).

### Subetapa 4.1 — Carregamento de texto
| # | Task | Status |
|---|------|--------|
| 4.1.1 | Investigar erro "Não foi possível carregar o texto" — verificar API.Bible key e endpoints | pending |
| 4.1.2 | Corrigir chamada à API: headers, versionId, chapterId | pending |
| 4.1.3 | Testar com diferentes versões (NVI, ARC, etc.) | pending |

### Subetapa 4.2 — Áudio
| # | Task | Status |
|---|------|--------|
| 4.2.1 | Investigar "Áudio não disponível para esta versão" | pending |
| 4.2.2 | Verificar quais versões têm áudio na API.Bible | pending |
| 4.2.3 | Mostrar player apenas quando áudio disponível | pending |

### Subetapa 4.3 — UX dos seletores
| # | Task | Status |
|---|------|--------|
| 4.3.1 | Suavizar transição entre livros (animação, sem salto) | pending |
| 4.3.2 | Aumentar separação visual Antigo/Novo Testamento | pending |
| 4.3.3 | Aumentar fonte dos seletores | pending |

---

## Etapa 5 — Planejamento & Relatórios
> **Agent:** `feature-developer`

**Objetivo:** Corrigir planejamento e redesenhar relatórios.

### Subetapa 5.1 — Planejamento
| # | Task | Status |
|---|------|--------|
| 5.1.1 | Renderizar textos como Markdown (negrito, títulos, parágrafos) | pending |
| 5.1.2 | Corrigir referências bíblicas ("referência não reconhecida") | pending |
| 5.1.3 | Corrigir geração de imagens (DALL-E fallback) | pending |
| 5.1.4 | Organizar por livros: pastas colapsáveis com expand/collapse por capítulo | pending |
| 5.1.5 | Título "Planejamento" (sem nome do livro), livros como sub-pastas | pending |
| 5.1.6 | Corrigir ícone estrela do botão "Gerar" — mudar cor para visível | pending |

### Subetapa 5.2 — Relatórios
| # | Task | Status |
|---|------|--------|
| 5.2.1 | Renomear menu "Progresso" → "Relatórios" na sidebar | pending |
| 5.2.2 | Filtros em linha horizontal ACIMA dos insights (não empilhados) | pending |
| 5.2.3 | Para não-admin: esconder filtros Igreja/Equipe/SubEquipe/Usuário, mostrar só Livro | pending |
| 5.2.4 | Adicionar "Duração média" como 4o card grande (junto a Total Presenças, Membros Únicos, Freq. Média) | pending |
| 5.2.5 | Remover bloquinhos menores redundantes (sessões no mês, membro mais presente, duração média, período) | pending |

---

## Etapa 6 — Login, Perfil & Design
> **Agent:** `frontend-specialist`

**Objetivo:** Ajustes visuais e de UX.

### Subetapa 6.1 — Tela de login
| # | Task | Status |
|---|------|--------|
| 6.1.1 | Mudar frase para "Sua plataforma de devocionais inteligentes" | pending |
| 6.1.2 | Aumentar ícone e fonte "Devocional Hub" | pending |
| 6.1.3 | "Esqueci a senha": adaptar formulário in-place (NÃO popup sobreposto) | pending |

### Subetapa 6.2 — Perfil
| # | Task | Status |
|---|------|--------|
| 6.2.1 | Feedback de salvar: usar toast/popup temporário (não inline empurrando botões) | pending |

### Subetapa 6.3 — Cores e design
| # | Task | Status |
|---|------|--------|
| 6.3.1 | Ajustar tom do accent: menos alaranjado/marrom, mais amarelo queimado elegante | pending |
| 6.3.2 | Definir tom ideal separado para dark mode e light mode | pending |
| 6.3.3 | Aumentar logo Devocional Hub na sidebar | pending |

---

## Etapa 7 — Deploy & Validação
> **Agent:** `devops-specialist`

**Objetivo:** Deploy final e validação em produção.

### Tasks
| # | Task | Status |
|---|------|--------|
| 7.1 | Validar tsc --noEmit sem erros | pending |
| 7.2 | Verificar zero credenciais no código | pending |
| 7.3 | Commit descritivo | pending |
| 7.4 | Push para main | pending |
| 7.5 | Monitorar CI/CD | pending |
| 7.6 | Executar limpeza do banco em produção | pending |
| 7.7 | Validar todas as telas em produção | pending |
| 7.8 | Atualizar CLAUDE.md se necessário | pending |

---

## Checklist Final
- [ ] Bubble abre ao clicar
- [ ] Admin acessível para SUPER_ADMIN
- [ ] Webhook filtra por meeting ID
- [ ] Participantes deduplicados com horários
- [ ] Calendário com cores corretas
- [ ] Gráfico de pizza legível
- [ ] Bíblia carrega texto e áudio
- [ ] Planejamento com markdown e expand/collapse
- [ ] Relatórios com filtros em linha
- [ ] Login com layout correto
- [ ] Perfil com toast de feedback
- [ ] Cores ajustadas (accent amarelo queimado)
- [ ] Banco limpo (sessões removidas)
- [ ] Deploy verde e funcionando
