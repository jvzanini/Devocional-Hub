# Terminal A — Etapas 1 + 4: Backend Bugs + Bíblia Interativa

> **Escopo:** API routes, bible-reader/, webhook, zoom sync, participantes, foto perfil
> **NÃO TOCAR:** globals.css, Sidebar.tsx, pages de dashboard/books/reports/login/profile/planning

## Referências
- PRD: `.context/workflow/docs/prd-devocional-hub-master-update-v2.md`
- Tech Spec: `.context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md`
- Plano Hotfix: `.context/plans/devocional-hub-v2-hotfix.md`
- CLAUDE.md na raiz do projeto

## Regras
- Responder SEMPRE em português brasileiro
- NUNCA commitar credenciais reais
- Validar com `npx prisma generate` + `npx tsc --noEmit` antes de commitar
- NÃO fazer push (quem faz push é o Terminal D)

---

## Etapa 1 — Bugs Críticos Restantes

### 1.1 — Bubble não abre (CORRIGIR)
O componente `BibleBubble.tsx` tem o handler `onClick={handleOpen}` correto e o CSS `.bible-bubble` tem `cursor: pointer`.
O problema pode ser:
- z-index conflitante (`.bible-bubble` tem z-index 50, mas algo pode estar sobrepondo)
- O `BibleBubbleWrapper` usa dynamic import — verificar se está carregando
- **Adicionar**: tooltip "Abrir Bíblia" ao hover (title já existe, verificar se aparece)
- **Adicionar**: garantir cursor mãozinha visível

**Arquivos:** `src/features/bible-reader/components/BibleBubble.tsx`, `BibleBubbleWrapper.tsx`, `src/app/globals.css` (APENAS a classe `.bible-bubble`)

### 1.2 — Participantes duplicados
Na lista de participantes de cada sessão, nomes aparecem repetidos (ex: "João Zanini" 2x, "iris silva" 2x, "Nick Marcos" 2x).

**Corrigir em:** `src/app/(dashboard)/session/[id]/page.tsx` — agrupar participantes por email ou nome, somar durations
**Também:** exibir horário de entrada e saída
**Também:** tag de tempo "Total: Xmin" — trocar cor (amarelo+branco péssimo contraste no dark mode). Usar fundo escuro com texto claro, ou verde/cinza.

### 1.3 — Sincronização Zoom por email
A sincronização de presença busca só pelo username do Zoom. Precisa buscar também pelo email.

**Arquivo:** `src/features/sessions/lib/attendance-sync.ts`
**Lógica:** ao vincular participante Zoom → User, buscar por ZoomIdentifier.value === participant.email OU participant.name

### 1.4 — Foto de perfil some após redeploy
As fotos são salvas em path local que não persiste no Docker.

**Verificar:** `src/app/api/profile/route.ts` (upload de foto) — o path deve ser `/app/data/user-photos/`
**Verificar:** `src/shared/lib/image-utils.ts` — onde salva
**Verificar:** que o volume Docker `devocional_data:/app/data` inclui o subdir `user-photos`

### 1.5 — Limpeza do banco (criar endpoint)
Criar endpoint `POST /api/admin/cleanup` que:
1. Deleta todos os Documents, Participants, ParticipantEntries
2. Deleta todas as Sessions
3. NÃO deleta Users, ReadingPlans, Permissions, AppSettings, Webhooks
4. Retorna contagem do que foi deletado
5. Requer role SUPER_ADMIN

**Criar:** `src/app/api/admin/cleanup/route.ts`

---

## Etapa 4 — Bíblia Interativa

### 4.1 — Texto não carrega
Erro: "Não foi possível carregar o texto. Tente novamente."

**Investigar:** `src/features/bible-reader/lib/bible-api-client.ts`
- Verificar se BIBLE_API_KEY está sendo passada nos headers
- Verificar o formato do versionId e chapterId
- A chamada pode estar falhando silenciosamente
- Testar com versão NVI (id: `a556c5305ee15c3f-01`)

**Investigar:** `src/app/api/bible/content/[versionId]/[chapterId]/route.ts`
- Verificar se o endpoint está fazendo a chamada correta à API.Bible
- Headers obrigatórios: `api-key` e `fums-version: 3`

### 4.2 — Áudio não funciona
Mensagem: "Áudio não disponível para esta versão"

**Investigar:** `src/features/bible-reader/lib/audio-manager.ts`
**Investigar:** `src/app/api/bible/audio/[versionId]/[chapterId]/route.ts`
- Nem todas as versões têm áudio. Verificar quais têm.
- Se NVI não tem áudio, encontrar uma versão PT que tenha e usar como fallback

### 4.3 — UX dos seletores
**Arquivo:** `src/features/bible-reader/components/BookSelector.tsx`
- Suavizar transição ao trocar de livro (CSS transition, não jump)
- Aumentar separação visual entre Antigo e Novo Testamento (padding, divider, título maior)
- Aumentar fonte geral dos seletores

**Arquivo:** `src/features/bible-reader/components/VersionSelector.tsx`, `ChapterSelector.tsx`
- Verificar transições suaves

---

## Commit ao finalizar
```
git add src/features/bible-reader/ src/app/api/bible/ src/app/api/admin/cleanup/ src/app/api/webhook/ src/features/sessions/ src/features/zoom/ "src/app/(dashboard)/session/"
git commit -m "fix(hotfix-A): corrigir bubble, participantes, zoom sync, bíblia texto/áudio

- Bubble: garantir abertura ao clicar, z-index, tooltip
- Participantes: deduplicar por email/nome, somar tempos, horários
- Zoom sync: buscar por email além de username
- Bíblia: corrigir carregamento de texto e áudio via API.Bible
- Seletores: transições suaves, separação AT/NT
- Endpoint de limpeza do banco criado

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
