# PRD — DevocionalHub Master Update v2

> **Versão:** 1.0
> **Data:** 2026-03-20
> **Autor:** Product Owner (João Vitor Zanini)
> **Status:** Em Revisão

---

## 1. Visão Geral do Produto

O DevocionalHub é uma plataforma web para organização e acompanhamento de devocionais bíblicos em grupo. A plataforma integra-se com Zoom para capturar transcrições, processa conteúdo via IA, gera materiais automaticamente pelo NotebookLM, e oferece dashboards de acompanhamento.

### 1.1 Objetivo desta Atualização

Esta atualização master (v2) visa transformar o DevocionalHub de uma ferramenta funcional em uma plataforma completa e profissional, adicionando 22 features organizadas em 8 tracks de desenvolvimento paralelo. O foco é: melhor experiência do usuário, sistema de permissões robusto, conteúdo mais inteligente, e novas funcionalidades como Bíblia interativa e módulo de planejamento teológico.

### 1.2 Público-Alvo

| Persona | Descrição | Necessidades |
|---------|-----------|-------------|
| **Super Admin** | Líder/criador da plataforma | Controle total, analytics, configurações, planejamento |
| **Admin** | Equipe de manutenção | Gerenciamento de usuários, conteúdo, relatórios |
| **Assinante VIP** | Membro premium (futuro) | Acesso a conteúdo exclusivo, funcionalidades avançadas |
| **Assinante** | Membro pagante (futuro) | Acesso a conteúdo protegido |
| **Membro** | Participante regular | Dashboard, presença, leitura, perfil |

---

## 2. Features — Catálogo Completo (22 Features / 8 Tracks)

---

### TRACK A: Sistema de Permissões & Autenticação

#### F13 — Sistema de Permissões Multi-Nível

**Prioridade:** CRÍTICA
**Justificativa:** Base para todas as outras features que dependem de controle de acesso.

**Requisitos Funcionais:**

1. **Novos níveis de acesso (substituem ADMIN/MEMBER):**
   - `SUPER_ADMIN` — Controle total (migrar atual ADMIN para este)
   - `ADMIN` — Equipe de manutenção da plataforma
   - `SUBSCRIBER_VIP` — Assinante VIP (futuro, já criar a estrutura)
   - `SUBSCRIBER` — Assinante convencional (futuro, já criar a estrutura)
   - `MEMBER` — Participante regular (substituir MEMBER atual)

2. **Hierarquia de visibilidade:**
   - Se permissão = `ADMIN` → apenas ADMIN e SUPER_ADMIN visualizam
   - Se permissão = `SUBSCRIBER` → ADMIN, SUPER_ADMIN e assinantes visualizam
   - Se permissão = `MEMBER` → todos visualizam

3. **Painel de permissões no Admin:**
   - Nova seção "Permissões" no painel admin
   - Duas subseções: "Arquivos do Card Devocional" e "Menus"
   - Para cada item: dropdown para selecionar nível mínimo de acesso
   - Permissões de arquivos: Texto Bíblico, Slides, Mapa Mental, Vídeo
   - Permissões de menus: Planejamento (por padrão: ADMIN)

4. **Menu "Assinaturas" (placeholder):**
   - Criar menu no admin para futuras integrações de pagamento
   - Tela com layout básico preparado

**Critérios de Aceite:**
- [ ] Migração de ADMIN → SUPER_ADMIN funciona sem perda de dados
- [ ] Todos os endpoints respeitam os novos níveis
- [ ] Painel de permissões funcional no admin
- [ ] Middleware de autorização valida hierarquia corretamente

---

#### F16 — Sistema de Email Completo

**Prioridade:** ALTA
**Justificativa:** Emails de convite não estão chegando; necessário para onboarding.

**Requisitos Funcionais:**

1. **Fix: Envio de convite:**
   - Diagnosticar e corrigir envio via Gmail SMTP
   - Template HTML profissional com branding DevocionalHub
   - Incluir: logo, mensagem de boas-vindas, botão de aceitar, link de acesso
   - Expiração do convite: 7 dias

2. **Tela de criação de senha (via convite):**
   - Campos: Criar Senha, Confirmar Senha, WhatsApp (obrigatório)
   - Validação de senhas coincidentes
   - Após criar: login automático na plataforma

3. **Esqueci minha senha:**
   - Fix na tela de login: botão "Esqueci minha senha" funcional
   - Fluxo: confirmar email → enviar link de redefinição
   - Template HTML de redefinição com branding
   - Tela de redefinição: Nova Senha, Confirmar Senha, Confirmar WhatsApp (pré-preenchido)

**Critérios de Aceite:**
- [ ] Email de convite chega corretamente no Gmail/Outlook/Yahoo
- [ ] Template HTML renderiza bem em todos os clientes de email
- [ ] Fluxo completo de redefinição de senha funciona
- [ ] WhatsApp é obrigatório na criação/redefinição

---

#### F17 — Cadastro Manual de Usuário

**Prioridade:** ALTA

**Requisitos Funcionais:**

1. **Campos de senha na criação:**
   - Adicionar: "Criar Senha" e "Confirmar Senha"
   - Quando preenchidos: botão muda de "Enviar Convite" → "Criar Usuário"
   - Validação: senhas devem coincidir

2. **Campo WhatsApp:**
   - Não obrigatório na criação pelo admin
   - Formato: DDD + número (máscara de input)
   - Aparece em: criação, edição, perfil do usuário

3. **Campo de nível de acesso:**
   - Obrigatório na criação
   - Dropdown com os 5 níveis
   - Também editável posteriormente

4. **Campos de email/username Zoom:**
   - Padrão com "+" para adicionar múltiplos
   - Mesmo modelo da edição (já implementado)
   - Input + botão "+" → item adicionado → campo limpa para próximo

**Critérios de Aceite:**
- [ ] Criação com senha funciona sem envio de convite
- [ ] Criação com convite funciona sem senha
- [ ] Botão muda dinamicamente conforme preenchimento
- [ ] WhatsApp salvo e editável

---

#### F10 — Perfil de Usuário Redesign

**Prioridade:** ALTA

**Requisitos Funcionais:**

1. **Migração de acesso:**
   - Remover menu "Meu Perfil" da sidebar
   - Acessar perfil clicando no nome do usuário (rodapé da sidebar)
   - Cursor `pointer` no nome do usuário

2. **Fix: Foto de perfil persistente:**
   - Diagnosticar por que foto quebra após deploy
   - Implementar armazenamento persistente (volume Docker `/data/user-photos/`)
   - Limite de upload: 5MB
   - Compressão automática antes de salvar no banco
   - Miniatura para exibição na sidebar e listas

3. **Novos campos no perfil:**
   - Redefinir Senha (abre modal)
   - Alterar WhatsApp (campo editável, obrigatório)
   - Nível de acesso (visível, não editável pelo próprio usuário)

4. **Botão "Apagar Conta":**
   - Visual com destaque de atenção (vermelho/warning)
   - Confirmação em duas etapas (modal)
   - Soft delete: manter email, nome, igreja, WhatsApp
   - Remover: senha, foto, dados de sessão vinculados
   - Possibilidade de reativação futura pelo admin
   - Conformidade LGPD

**Critérios de Aceite:**
- [ ] Foto persiste após redeploy
- [ ] Upload comprimido funciona até 5MB
- [ ] Apagar conta faz soft delete corretamente
- [ ] Perfil acessível pelo clique no nome

---

### TRACK B: Pipeline & Processamento IA

#### F6 — Triagem Inteligente de Transcrições

**Prioridade:** CRÍTICA
**Justificativa:** Qualidade do conteúdo gerado depende diretamente desta triagem.

**Requisitos Funcionais:**

1. **Limpeza da transcrição:**
   - Remover nomes pessoais (ex: "João Vitor Zanini mencionou...")
   - Remover referências a áudio compartilhado, música, outros idiomas
   - Remover comentários irrelevantes ao texto bíblico
   - Manter essência do que foi falado sobre o capítulo

2. **Validação teológica (pente fino):**
   - Cruzar informações da transcrição com:
     - Texto bíblico NVI do capítulo
     - Base teológica de referência
   - **Corrigir** fatos comprovadamente errados:
     - Ex: "Moisés construiu o templo" → Corrigir para "Salomão"
     - Ex: "Jesus ressuscitou no quarto dia" → Corrigir para "terceiro dia"
   - **Remover** informações grotescamente falsas:
     - Ex: "Deus teletransportou o povo" → Bíblia diz que atravessaram o mar
   - **MANTER** interpretações espirituais/subjetivas:
     - Dons espirituais, profecias, experiências pessoais
     - Se não há como comprovar que está errado, não remover

3. **Hierarquia de prioridade na geração de conteúdo:**
   - 1o: Transcrição do Zoom (norte principal)
   - 2o: Texto bíblico NVI
   - 3o: Base teológica
   - Instruções claras para NotebookLM seguir esta prioridade

4. **Saída:**
   - Arquivo de base de conhecimento com 3 seções:
     - Seção 1: Texto Bíblico (NVI)
     - Seção 2: Resumo teológico
     - Seção 3: Síntese do devocional (transcrição triada)
   - Instruções para geração de slides/infográfico/vídeo

**Critérios de Aceite:**
- [ ] Nomes pessoais são removidos da transcrição processada
- [ ] Fatos bíblicos errados são corrigidos com referência
- [ ] Interpretações espirituais são preservadas
- [ ] Base de conhecimento gerada com 3 seções corretas

---

#### F8 — Inteligência de Capítulos Multi-Sessão

**Prioridade:** ALTA

**Requisitos Funcionais:**

1. **Detecção de continuidade:**
   - Analisar transcrição para identificar se capítulo não foi concluído
   - Detectar frases como "amanhã continuamos", "próxima sessão terminamos"
   - Verificar se já existe card para aquele capítulo

2. **Merge de transcrições:**
   - Quando detectar continuidade: buscar transcrição anterior do mesmo capítulo
   - Mesclar transcrições (Parte 1 + Parte 2 + ... Parte N)
   - Reaproveitar texto bíblico e teológico já gerados (economizar tokens)
   - Regenerar apenas a seção de síntese do devocional

3. **Nomenclatura de arquivos:**
   - Padrão: `{Livro} {Capítulo} - {Tipo}`
   - Parcial: `Romanos 11 - Parte 1 - Slides.pdf`
   - Completo: `Romanos 11 - Cap Completo - Slides.pdf`
   - Ao completar: fazer upload dos arquivos completos SEM excluir os parciais

4. **Update do card existente:**
   - Atualizar summary com conteúdo completo
   - Adicionar novos documentos (mantendo anteriores)
   - Recalcular participantes (merge de todas as sessões)

**Critérios de Aceite:**
- [ ] Sistema detecta continuidade de capítulo automaticamente
- [ ] Merge de transcrições funciona corretamente
- [ ] Arquivos parciais são mantidos ao gerar completos
- [ ] Card é atualizado (não duplicado)

---

#### F19 — Integração Claude Code Max

**Prioridade:** ALTA
**Justificativa:** Reduzir custos de API eliminando gastos com OpenAI.

**Requisitos Funcionais:**

1. **Pesquisa de viabilidade:**
   - Investigar se é possível usar assinatura Claude Code Max como provider de IA
   - Verificar APIs disponíveis: Anthropic API, Claude API
   - Verificar rate limits do plano Max
   - **IMPORTANTE:** Comunicar ao usuário ANTES de decidir (não tomar decisão sozinho)

2. **Se viável — Configuração como provider primário:**
   - Adicionar "Claude (Assinatura)" como opção no painel admin de IA
   - Posicionar ACIMA da OpenAI na cascata
   - Modelos disponíveis: Sonnet (padrão), Opus, Haiku
   - Puxar automaticamente a versão mais recente (latest)
   - Selecionar categoria de modelo no admin; versão é automática

3. **Cascata atualizada:**
   - 1o: Claude (Assinatura Max) — Sonnet 4.6
   - 2o: OpenAI (API key) — modelo configurável
   - 3o: OpenRouter (gratuito)
   - 4o: Gemini (gratuito)

4. **Remoção do GPT-3.5-Turbo:**
   - Remover da lista de modelos disponíveis no admin

**Critérios de Aceite:**
- [ ] Pesquisa de viabilidade documentada
- [ ] Se viável: Claude funciona como provider primário
- [ ] GPT-3.5-Turbo removido do seletor
- [ ] Admin permite selecionar modelo Claude

---

#### F7 — Deduplicação de Participantes Zoom

**Prioridade:** ALTA

**Requisitos Funcionais:**

1. **Deduplicação por email:**
   - Ao processar participantes: cruzar por email para eliminar duplicatas
   - Username pode mudar; email é o identificador único
   - Manter registro mais completo (nome mais longo, etc.)

2. **Log de entradas/saídas:**
   - Para cada participante: registrar TODAS as entradas e saídas
   - Formato por participante:
     ```
     João Vitor
     Entrada: 07:00 | Saída: 07:34 | Duração: 34min
     Entrada: 07:40 | Saída: 07:50 | Duração: 10min
     ─────────────────────────────
     Total: 44 minutos
     ```

3. **Somatório de tempo:**
   - Calcular tempo total = soma de todas as durações individuais
   - Exibir com destaque visual (fonte maior ou badge)

4. **Exibição no card:**
   - Participantes abaixo dos arquivos da sessão
   - Cada participante: foto + nome + log de entradas/saídas + total
   - Informação "Meet ID processado em..." → visível apenas para admin

**Critérios de Aceite:**
- [ ] Participante que entrou 3x aparece apenas 1x com log completo
- [ ] Somatório de tempo calculado corretamente
- [ ] Meet ID visível apenas para admin
- [ ] Log de entradas/saídas formatado corretamente

---

### TRACK C: UI/UX Core Redesign

#### F1 — Calendário Redesign

**Prioridade:** MÉDIA

**Requisitos Funcionais:**

1. **Destaque visual diferenciado:**
   - Devocionais futuros: destaque amarelo/âmbar (manter)
   - Devocionais realizados: cor mais escura ou apenas bordas
   - Dia de hoje: destaque especial diferenciado

2. **Legendas em todos os dias:**
   - Todos os dias com devocional devem ter legenda embaixo
   - Formato: `{ABREV} {capítulos}`
   - Abreviação com MÁXIMO de caracteres: `ROM` (não `RM`), `COR` (não `CO`)
   - Capítulos: número único (`ROM 11`) ou range (`ROM 1-3`)
   - Exemplos: `ROM 11`, `1COR 1-3`, `ATOS 15`

3. **Padrão de abreviações (máximo de caracteres):**

   | Livro | Abreviação |
   |-------|-----------|
   | Gênesis | GEN |
   | Êxodo | EXO |
   | Levítico | LEV |
   | Números | NUM |
   | Deuteronômio | DEUT |
   | Romanos | ROM |
   | 1 Coríntios | 1COR |
   | 2 Coríntios | 2COR |
   | Apocalipse | APOC |
   | *(completar para todos os 66 livros)* | |

**Critérios de Aceite:**
- [ ] Dias futuros: destaque amarelo
- [ ] Dias passados: visual diferenciado (bordas ou escurecido)
- [ ] Todos os dias com devocional têm legenda com livro + capítulo
- [ ] Abreviações usam máximo de caracteres possível

---

#### F2 — Banner de Leitura

**Prioridade:** MÉDIA

**Requisitos Funcionais:**

1. **Redesign como banner de destaque:**
   - Seção "Leitura: Romanos" → transformar em retângulo grande
   - Mesmo padrão visual do calendário (retângulo abrangente)
   - Barra de progresso mantida
   - Botão elaborado (como na imagem de referência)

2. **Mover Insights de IA:**
   - Remover insights de IA desta seção
   - Substituir por gráfico de pizza (ver F12)

**Critérios de Aceite:**
- [ ] Banner com visual de destaque semelhante ao calendário
- [ ] Progresso visível com barra
- [ ] Insights de IA movidos para outro local

---

#### F9 — Sidebar Redesign

**Prioridade:** MÉDIA

**Requisitos Funcionais:**

1. **Dimensões:**
   - Aumentar largura da sidebar
   - Aumentar fontes do menu
   - Mais espaçamento entre itens

2. **Menu "Meu Perfil" removido:**
   - Acesso via clique no nome/foto do usuário (rodapé sidebar)
   - Cursor `pointer` no nome do usuário

3. **Renomeações:**
   - "Livros da Bíblia" → "Devocional"
   - "Relatórios" → "Progresso" ou "Desempenho"
   - Menu "Progresso/Desempenho" visível para TODOS os níveis de acesso

4. **Menu "Presença" removido:**
   - Redundante com relatórios
   - Excluir completamente

**Critérios de Aceite:**
- [ ] Sidebar mais larga com fontes maiores
- [ ] "Meu Perfil" acessível pelo clique no nome
- [ ] Renomeações aplicadas
- [ ] Menu "Presença" removido

---

#### F22 — Responsividade Total

**Prioridade:** CRÍTICA (Regra absoluta)

**Requisitos Funcionais:**

1. **Fix de layouts quebrados:**
   - Auditar todas as páginas em viewport mobile (375px, 414px)
   - Corrigir elementos fora das margens
   - Corrigir textos cortados
   - Corrigir tabelas sem scroll horizontal

2. **Sidebar mobile:**
   - Hamburger menu funcional
   - Overlay scrim
   - Slide-in suave
   - Close via X e clique fora

3. **Modais responsivos:**
   - Todos os modais: full-screen em mobile
   - Botão X visível para fechar
   - Scroll interno quando conteúdo excede tela

4. **Regra absoluta:**
   - TODAS as features desta atualização DEVEM ser responsivas
   - Testar em: iPhone SE (375px), iPhone 14 (390px), iPad (768px), Desktop (1440px)

**Critérios de Aceite:**
- [ ] Nenhum elemento fora das margens em mobile
- [ ] Todas as tabelas com scroll horizontal
- [ ] Todos os modais adaptados para mobile
- [ ] Sidebar mobile funcional

---

### TRACK D: Cards & Busca

#### F5 — Card de Capítulo Redesign

**Prioridade:** ALTA

**Requisitos Funcionais:**

1. **Data e horário:**
   - Exibir data E horário (ex: "20 de março de 2026, 07:00")

2. **Resumo gerado por IA:**
   - Baseado no arquivo de contexto (3 seções: bíblico, teológico, zoom)
   - Não usar transcrição bruta

3. **Layout vertical (não lado a lado):**
   - Ordem: Data/Horário → Resumo IA → Arquivos da Sessão → Participantes

4. **Arquivos da sessão:**
   - Formato PDF (não TXT)
   - Nomenclatura: `{Livro} {Cap} ({Versão})` para texto bíblico
   - Renomear "Infográfico" → "Mapa Mental"
   - Vídeo: visível APENAS para admin
   - Remover: transcrição bruta e transcrição limpa como arquivos separados

5. **Navegação entre cards:**
   - Botões anterior/próximo no topo do card
   - Navegar para card anterior/próximo do mesmo livro
   - Sem necessidade de voltar à lista

6. **Meet ID processado:**
   - Visível apenas para admin
   - Oculto para outros perfis

**Critérios de Aceite:**
- [ ] Horário exibido junto à data
- [ ] Layout vertical aplicado
- [ ] Arquivos em PDF com nomenclatura correta
- [ ] Navegação entre cards funciona
- [ ] Vídeo oculto para não-admin

---

#### F4 — Busca Inteligente

**Prioridade:** MÉDIA

**Requisitos Funcionais:**

1. **Barra de busca funcional:**
   - Busca por palavra-chave no topo da seção "Devocional"
   - Resultados filtrados em tempo real

2. **Fontes de dados para busca:**
   - Arquivo de base de conhecimento (3 seções):
     - Texto bíblico NVI
     - Base teológica
     - Transcrição processada do Zoom
   - Nome do livro, capítulo, data

3. **Implementação:**
   - Busca full-text no lado do servidor
   - Sem necessidade de IA para a busca (técnicas de programação avançada)
   - Indexação dos campos relevantes no banco

**Critérios de Aceite:**
- [ ] Busca retorna resultados relevantes
- [ ] Busca funciona por palavra-chave, livro, tema
- [ ] Resultados destacam o termo buscado
- [ ] Performance aceitável (< 500ms)

---

### TRACK E: Plano de Leitura

#### F18 — Plano de Leitura Redesign (COMPLEXA)

**Prioridade:** CRÍTICA
**Justificativa:** Feature mais complexa da atualização.

**Requisitos Funcionais:**

1. **Layout de criação em 3 seções:**
   - Seção 1: Seleção do livro
   - Seção 2: Capítulos por dia + insights (dias necessários, etc.)
   - Seção 3: Calendário interativo

2. **Calendário melhorado:**
   - Fontes maiores (dias da semana, números, mês)
   - Paleta de cores consistente com a plataforma
   - Animações ao interagir
   - Efeitos hover nos quadradinhos

3. **Comportamento de seleção inteligente:**
   - Manter seleção ao mudar capítulos/dia (recalcular a partir da data já selecionada)
   - Selecionar data anterior → recalcular como nova data de início
   - Integração com horários: pular dias sem horário definido
   - Pop-up para definir horário quando clicar em dia bloqueado
   - Número fixo de dias selecionados = total de capítulos / capítulos por dia
   - Ao clicar após último dia: avança último, remove primeiro (mantém total fixo)

4. **Criação retroativa:**
   - Permitir criar planos com datas passadas
   - Ao criar com datas retroativas: exigir checklist de dias já realizados
   - Recalcular datas futuras baseado nos dias não realizados

5. **Checklist de capítulos (COMPLEXO):**
   - Em cada dia: checklist dos capítulos programados
   - **Checkbox esquerda (grande):** capítulo lido por completo
   - **Checkbox direita (pequeno):** leitura parcial (legenda "Leitura Parcial")
   - Regras:
     - Marcar direita → automaticamente marca esquerda
     - Marcar apenas esquerda → leitura completa
     - Capítulo parcial → reaparece nos dias seguintes
     - Ao completar capítulo parcial: bloquear e exibir "X sessões"
   - Componente customizado (NÃO usar checkbox/lista padrão)

6. **Preenchimento automático via Zoom:**
   - Detectar na transcrição: "amanhã continuamos", "capítulo completo"
   - Preencher automaticamente checkbox parcial/completo
   - Permitir edição manual via modal

7. **Edição de plano:**
   - Botão editar (além do excluir existente)
   - Reabre tela de criação com dados preenchidos
   - Permite update de checklist

8. **Barra de progresso com percentual:**
   - Círculo com percentual visual
   - Formato: "13 de 20 capítulos (65%)"

9. **Barra de busca por livro:**
   - Buscar na lista de planos cadastrados

**Critérios de Aceite:**
- [ ] 3 seções de criação funcionam
- [ ] Calendário com fontes grandes e cores corretas
- [ ] Recalcular ao mudar capítulos/dia sem perder data selecionada
- [ ] Dias sem horário são pulados
- [ ] Criação retroativa com checklist obrigatório
- [ ] Checkbox parcial/completo funciona com todas as regras
- [ ] Preenchimento automático via transcrição
- [ ] Botão editar funcional
- [ ] Barra de progresso com percentual

---

### TRACK F: Relatórios & Analytics

#### F11 — Relatórios Redesign

**Prioridade:** ALTA

**Requisitos Funcionais:**

1. **Filtros de ano dinâmico:**
   - Começar com 2026
   - Adicionar próximo ano automaticamente em dezembro
   - Algoritmo: `if (mesAtual >= 12) adicionar(anoAtual + 1)`

2. **Botão exportar:**
   - Dar funcionalidade real (exportar relatório em PDF/CSV)
   - Ou remover se não fizer sentido

3. **Reorganização de filtros:**
   - Mover filtros para próximo do relatório (não no topo distante)
   - Adicionar filtro por subequipe
   - Adicionar filtro por livro
   - Filtro por livro: apenas livros com devocionais realizados

4. **Restrição de acesso:**
   - Usuário comum: vê apenas SEUS dados (sem filtro de outros usuários)
   - Admin/Super Admin: vê todos + filtros completos
   - Renomear "Relatórios" → "Progresso"

5. **Gráfico de presença (toggle semanal/mensal):**
   - Toggle no canto superior direito: "Semana" | "Mês"
   - Mesmo espaço, gráfico muda conforme seleção
   - Barra = total de devocionais realizados
   - Preenchimento = quantas vezes a pessoa foi
   - Hover: "Devocionais: 7 | Presença: 7 | Frequência: 100%"
   - Percentual de frequência visível

6. **Gráfico de linha (evolução):**
   - Abaixo do gráfico de barras
   - Toggle: Semana | Mês
   - Mostrar evolução do percentual de frequência ao longo do tempo
   - Ex: 20% → 30% → 40% → 80%

7. **Insights atualizados:**
   - Admin: "Média de Participantes" (substituir "Membros Únicos")
   - Admin: "Horas de Devocional" (baseado no maior tempo de permanência por dia)
   - Usuário: "Horas de Devocional" (suas próprias)
   - Todos respeitam filtros aplicados

8. **Detalhamento por usuário:**
   - Adicionar: "Tempo Médio" (ícone de relógio)
   - Botões semanal/mensal/anual no canto superior direito da seção
   - Default: mensal
   - Ao mudar filtro supremo: reset para mensal
   - Semanal: dados da semana atual
   - Anual: dados do ano atual

**Critérios de Aceite:**
- [ ] Ano dinâmico funciona
- [ ] Filtros próximos ao relatório
- [ ] Filtro por subequipe e livro existem
- [ ] Toggle semanal/mensal funciona
- [ ] Gráfico de linha implementado
- [ ] Insights corretos por perfil
- [ ] Detalhamento com tempo médio e toggle semanal/mensal/anual

---

#### F12 — Gráfico de Pizza (Substituir Insights de IA)

**Prioridade:** MÉDIA

**Requisitos Funcionais:**

1. **Gráfico de pizza no dashboard:**
   - Substituir seção "Insights de IA"
   - Mostrar livros que o usuário participou
   - Cada fatia = 1 livro
   - Hover: mostrar aproveitamento (%) por livro

2. **Interatividade:**
   - Clicar na fatia: filtrar dashboard por aquele livro
   - Cores distintas por livro

**Critérios de Aceite:**
- [ ] Gráfico de pizza renderiza corretamente
- [ ] Hover mostra aproveitamento por livro
- [ ] Dados refletem participação real do usuário

---

### TRACK G: Novas Funcionalidades

#### F20 — Módulo Planejamento (Novo Menu)

**Prioridade:** ALTA

**Requisitos Funcionais:**

1. **Novo item no menu lateral: "Planejamento"**
   - Controle de acesso configurável (default: ADMIN)

2. **Carga automática à meia-noite:**
   - Na zero hora do dia de início de um novo plano:
   - Carregar texto bíblico NVI de TODOS os capítulos
   - Gerar pesquisa teológica para TODOS os capítulos
   - Criar resumo de planejamento exclusivo (não reutilizado em outro lugar)

3. **Cards de planejamento por capítulo:**
   - Análise por capítulo:
     - Como abordar o capítulo
     - Segmentação por temas dentro do capítulo
     - Agrupamento de capítulos (quando houver tema comum)
   - Referências bíblicas com texto completo:
     - Ex: "Filipenses 2:3 — 'Nada façam por ambição egoísta...'"
     - Buscar via API (API.Bible ou bolls.life)
   - Links de estudo: pelo menos 5 links de referência por card
   - Imagens: 2 imagens por card (geradas por IA)
     - **ATENÇÃO:** Sonnet pode não gerar imagens
     - Se não: comunicar ao usuário para decidir alternativa
     - Não usar API paga sem autorização
   - Aprofundamento teológico + histórico

4. **Não forçar agrupamentos:**
   - Agrupar capítulos APENAS quando houver tema comum natural
   - Capítulo isolado: detalhar individualmente

**Critérios de Aceite:**
- [ ] Menu "Planejamento" aparece na sidebar
- [ ] Carga automática à meia-noite funciona
- [ ] Cards por capítulo com análise completa
- [ ] Referências com texto bíblico completo
- [ ] Links de estudo presentes
- [ ] Questão de imagens comunicada ao usuário

---

#### F21 — Bíblia Interativa (Bubble Flutuante)

**Prioridade:** ALTA

**Requisitos Funcionais:**

1. **Bubble flutuante:**
   - Ícone de Bíblia fixo no canto inferior direito
   - Não atrapalhar CTAs e navegação
   - Posição inteligente e responsiva

2. **Container da experiência:**
   - Desktop/Tablet: modal amplo e elegante
   - Mobile: full-screen com botão X para fechar
   - Animações de entrada/saída suaves
   - Fechamento: X, ESC (desktop), clique fora (desktop)

3. **Seletores customizados (NÃO usar select padrão):**
   - Seletor de Versão (filtrar: português + áudio disponível)
   - Seletor de Livro (com expansão de capítulos)
   - Seletor de Capítulo (grid de números)
   - HTML semântico + CSS customizado
   - Acessibilidade: navegação por teclado, aria labels

4. **Leitura:**
   - Versículos bem formatados
   - Título do capítulo destacado
   - Excelente legibilidade
   - Scroll interno

5. **Navegação canônica:**
   - Botões anterior/próximo
   - Navegação contínua entre livros
   - Sincronizado com player de áudio

6. **Player de áudio:**
   - Play/Pause
   - Velocidade: 1x, 1.25x, 1.5x, 1.75x, 2x
   - Barra de progresso
   - Autoplay entre capítulos e livros
   - Parar apenas: pause manual, fechar modal, sair da página
   - Reprodução em segundo plano (mobile)

7. **Contexto devocional:**
   - Abrir por padrão no livro/capítulo do devocional atual
   - Permitir troca livre depois

8. **Integração API.Bible:**
   - API key: via env var (produção)
   - FUMS v3 compliance
   - Descoberta dinâmica de versões em português com áudio
   - Filtro: idioma português → preferencialmente PT-BR → com áudio

**Critérios de Aceite:**
- [ ] Bubble funciona em desktop, tablet e mobile
- [ ] Modal desktop / fullscreen mobile
- [ ] 3 seletores customizados funcionais
- [ ] Versões filtradas: português + áudio
- [ ] Leitura formatada por versículos
- [ ] Navegação entre capítulos e livros
- [ ] Player com velocidade e autoplay
- [ ] Contexto devocional como default
- [ ] FUMS implementado

---

### TRACK H: Admin Panel

#### F3 — Seção Devocional/Livros Redesign

**Prioridade:** MÉDIA

**Requisitos Funcionais:**

1. **Ao clicar no livro:**
   - Barra de progresso com percentual
   - Data de início e término
   - Checklist de capítulos realizados
   - Roadmap/trilha: dias realizados, participantes por dia
   - Botão atalho "Abrir Bíblia" (abre bubble F21)

2. **Menu lateral de livros:**
   - Aumentar tamanho
   - Mais elaborado, com informações adicionais

**Critérios de Aceite:**
- [ ] Clicar no livro mostra progresso, datas, checklist
- [ ] Roadmap/trilha implementado
- [ ] Botão "Abrir Bíblia" funciona
- [ ] Menu lateral maior e mais informativo

---

#### F14 — Admin: Configuração Zoom

**Prioridade:** BAIXA

**Requisitos Funcionais:**

1. **Lógica de bloqueio de campos:**
   - Campo vazio → desbloqueado para edição
   - Campo preenchido → bloqueado, editar via ícone lápis + salvar

2. **Fix modo escuro:**
   - Ícone de relógio (horários): visível no modo escuro
   - Cor do ícone: usar `var(--text)` ou branco

3. **Webhooks normalização:**
   - Normalizar ícones (copiar, desativar, excluir)
   - Remover contorno branco no modo escuro
   - Alinhar botões (desativar + excluir na mesma linha)

**Critérios de Aceite:**
- [ ] Campos vazios editáveis livremente
- [ ] Campos preenchidos bloqueados com lápis
- [ ] Relógio visível no modo escuro
- [ ] Ícones de webhooks normalizados

---

#### F15 — Admin: Usuários Redesign

**Prioridade:** ALTA

**Requisitos Funcionais:**

1. **Barra de busca:**
   - Mover para junto da lista de usuários (não no topo)

2. **Botão "Enviar Convite":**
   - Menor (não ocupar toda a largura)

3. **Foto de perfil na lista:**
   - Puxar foto do banco de dados
   - Miniatura ao lado do nome

4. **Admin na lista:**
   - Apenas botão "Editar" (sem desativar/remover)

5. **Campo email na edição:**
   - Aparecer pré-preenchido e editável

6. **Campo nível de acesso:**
   - Dropdown com 5 níveis
   - Presente na criação E edição
   - Editável: pode rebaixar ou dar upgrade

**Critérios de Aceite:**
- [ ] Busca junto à lista
- [ ] Botão menor
- [ ] Fotos na lista
- [ ] Admin sem botão desativar/remover
- [ ] Email editável
- [ ] Nível de acesso editável

---

## 3. Requisitos Não-Funcionais

| Requisito | Especificação |
|-----------|---------------|
| **Responsividade** | Todas as features devem funcionar em 375px-1440px+ |
| **Performance** | Carregamento de página < 2s, busca < 500ms |
| **Acessibilidade** | WCAG 2.1 AA (labels, aria, contraste, teclado) |
| **Segurança** | LGPD compliance, soft delete, credenciais em env vars |
| **Dark Mode** | Todas as features devem funcionar corretamente em ambos os temas |
| **Compatibilidade** | Chrome, Firefox, Safari, Edge (últimas 2 versões) |
| **Mobile** | iOS Safari, Chrome Android |

---

## 4. Fora de Escopo (v2)

- Integração de pagamento para assinaturas (futuro)
- App mobile nativo (futuro)
- Push notifications (futuro)
- Integração WhatsApp para envio de mensagens (futuro)
- Multi-idioma (futuro)

---

## 5. Métricas de Sucesso

| Métrica | Target |
|---------|--------|
| Bugs críticos pós-deploy | 0 |
| Features implementadas | 22/22 |
| Cobertura responsiva | 100% das telas |
| Emails entregues | > 95% delivery rate |
| Performance (LCP) | < 2.5s |
| Acessibilidade | Score > 80 (Lighthouse) |

---

## 6. Dependências Externas

| Dependência | Risco | Mitigação |
|-------------|-------|-----------|
| API.Bible | Rate limits, disponibilidade | Cache agressivo, fallback bolls.life |
| Claude Code Max API | Viabilidade técnica incerta | Pesquisa prévia, manter OpenAI como fallback |
| Gmail SMTP | Rate limits para envio de email | Monitorar bounces, considerar SendGrid futuro |
| Zoom API | Mudanças de API, rate limits | Versionamento, retry com backoff |
| NotebookLM | Automação via Playwright (frágil) | Retry, fallback manual, monitoramento |

---

## 7. Aprovações

| Stakeholder | Status | Data |
|-------------|--------|------|
| Product Owner (João Vitor) | Pendente | — |
| Tech Lead | Pendente | — |
