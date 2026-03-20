---
type: doc
name: glossary
description: Terminologia, conceitos de domínio e regras de negócio do DevocionalHub
category: glossary
generated: 2026-03-20
status: filled
scaffoldVersion: "2.0.0"
---
## Glossário e Conceitos de Domínio

Este documento define a terminologia e os conceitos específicos do DevocionalHub. Use como referência ao encontrar termos desconhecidos no código ou na documentação.

## Termos Principais

**Devocional**: Grupo de estudo bíblico devocional. É o conceito central da plataforma — cada encontro do grupo gera uma sessão com gravação, transcrição e materiais de estudo.

**Sessão (Session)**: Um encontro do grupo devocional gravado via Zoom. Cada sessão contém data, referência bíblica, resumo gerado por IA, transcrição, documentos e lista de participantes. Modelo `Session` no Prisma.

**Pipeline**: Fluxo automatizado que processa gravações do Zoom e transforma em documentos de estudo. Etapas: receber webhook → baixar VTT → processar com IA → buscar texto bíblico → gerar KB → criar materiais no NotebookLM → salvar tudo no banco.

**VTT (Video Text Track)**: Formato de legenda/transcrição gerado pelo Zoom. O pipeline baixa o arquivo VTT da gravação e o processa com IA para gerar um resumo limpo da sessão.

**NotebookLM**: Ferramenta de IA do Google usada para gerar slides, infográficos e vídeos resumo a partir do Knowledge Base. A automação é feita via Playwright (headless Chromium).

**Audio Overview**: Funcionalidade do NotebookLM que gera um **vídeo resumo** (não apenas áudio) da sessão devocional. Apesar do nome sugerir áudio, o resultado é um vídeo.

**Presença (Attendance)**: Rastreamento de quais usuários participaram de uma sessão. Funciona cruzando os dados de participantes do Zoom (`Participant`) com os usuários cadastrados na plataforma via `ZoomIdentifier`.

**ZoomIdentifier**: Mapeamento entre nomes/emails usados no Zoom e os usuários da plataforma. Necessário porque o nome exibido no Zoom pode ser diferente do nome cadastrado no sistema.

**Plano de Leitura (Reading Plan)**: Plano estruturado de leitura bíblica com capítulos diários. Sincronizado automaticamente pelo pipeline após cada sessão.

**KB (Knowledge Base)**: Documento combinado que contém transcrição processada + texto bíblico NVI + pesquisa teológica. É enviado ao NotebookLM como base para gerar os materiais de estudo.

**Cascata de IA**: Cadeia de fallback entre provedores de IA usada pela função `callAI`. Ordem: OpenAI (modelo configurável) → Nemotron 120B (OpenRouter, gratuito) → Step 3.5 Flash (OpenRouter, gratuito) → Nemotron 30B (OpenRouter, gratuito) → Gemini 2.5 Flash (Google API, gratuito). Se todos falharem, registra erro com log de todas as tentativas.

**AppSetting**: Configuração chave-valor armazenada no banco de dados. Permite alterar comportamentos da aplicação sem necessidade de novo deploy. Exemplos: `mainSpeakerName`, `zoomMeetingId`, `aiModel`.

**chapterRef**: Referência ao capítulo bíblico extraída da sessão (ex: "Romanos 10", "Gênesis 1"). Usada para buscar o texto bíblico correspondente via API.Bible.

**Design System v3**: Versão atual do sistema de design do DevocionalHub, definido em `src/app/globals.css`. Utiliza CSS custom properties (`:root` + `[data-theme="dark"]`) para temas claro e escuro. Dark mode (tema principal): bg `#0c0c0e`, surface `#151518`, accent `#f5a623`. Light mode: bg `#f5f5f7`, surface `#ffffff`, accent `#d97706`. Cores devem ser SEMPRE consumidas via `var()` (ex: `var(--text)`, `var(--accent)`, `var(--surface)`), NUNCA hardcoded em componentes. Inclui classes de layout como `.dashboard-two-col`, `.books-layout`, `.reports-top-grid` e `.session-detail-grid`.

## Siglas e Abreviações

| Sigla | Significado | Contexto |
|-------|-------------|----------|
| VTT | Video Text Track | Formato de transcrição do Zoom |
| KB | Knowledge Base | Documento combinado enviado ao NotebookLM |
| GHCR | GitHub Container Registry | Registro de imagens Docker |
| NVI | Nova Versão Internacional | Tradução bíblica usada pela API.Bible |
| SMTP | Simple Mail Transfer Protocol | Envio de emails via Gmail |
| JWT | JSON Web Token | Estratégia de autenticação do NextAuth |
| CI/CD | Integração e Entrega Contínua | GitHub Actions → Docker → Portainer |

## Atores e Papéis

**Administrador (ADMIN)**: Usuário com acesso ao painel admin (`/admin`). Pode disparar o pipeline manualmente, gerenciar configurações (AppSettings), configurar o modelo de IA, e gerenciar usuários e webhooks.

**Membro (MEMBER)**: Usuário regular da plataforma. Pode visualizar sessões, acessar documentos (com senha quando protegidos), ver seu histórico de presença e acompanhar o plano de leitura.

## Regras de Domínio

- Cada sessão está vinculada a um `zoomMeetingId` e `zoomUuid` únicos
- O UUID do Zoom pode conter `/` ou `+`, que precisam de duplo URL-encode (`%252F`, `%252B`) nas chamadas à API
- Documentos de sessão podem ser protegidos por senha (`contentPassword`), extraída automaticamente da transcrição quando mencionada pelo palestrante
- A presença é calculada cruzando `Participant.email` e `Participant.name` com os `ZoomIdentifier` dos usuários
- O pipeline aguarda 5 minutos após o fim da reunião para garantir que o VTT esteja disponível no Zoom
- Credenciais sensíveis ficam apenas no Portainer, nunca no código-fonte

## Recursos Relacionados

- [project-overview.md](./project-overview.md)
- [development-workflow.md](./development-workflow.md)
- [testing-strategy.md](./testing-strategy.md)
