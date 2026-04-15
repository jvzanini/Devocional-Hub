# Jornada Individual do Usuário — Design Spec

**Data:** 2026-04-15
**Autor:** Claude (modo autônomo)
**Status:** Draft
**Escopo:** Admin pode abrir a "Jornada" de qualquer usuário individual (timeline de engajamento, conquistas, presenças, livros participados) como ferramenta pastoral.

---

## 1. Objetivo

Permitir que o admin entenda a história de engajamento de um membro específico — útil para acompanhamento pastoral direto, não apenas visão agregada da comunidade (que já temos em "Engajamento Admin").

Casos de uso:
- Admin vê um usuário em "Em Risco" e quer entender o padrão histórico antes de abordar.
- Admin quer reconhecer publicamente alguém — consulta conquistas e streak atual.
- Admin investiga falha de sincronização de presença para um usuário específico.

## 2. Não-Objetivos

- Não é auto-serviço de usuário (o widget "Sua Jornada" já existe no dashboard do próprio usuário).
- Não envia notificações nem dispara ações sobre o usuário.
- Não permite admin editar manualmente conquistas, streaks, ou presenças nesta V1.
- Não cria novas tabelas nem endpoints públicos.
- Não expõe aos membros a jornada de outros membros.

## 3. Contexto e Reaproveitamento

Já existe em produção (backend):
- `computeUserEngagementStats(sessions, attendances)` — retorna stats completos de um usuário.
- `ACHIEVEMENTS` catálogo fixo e `UserAchievement` persistido.
- `extractBookName()` em `bible-utils.ts`.
- Painel admin tem aba "Usuários" (lista todos) e "Engajamento" (com listas Top/AtRisk).

V1 reaproveita tudo isso e adiciona apenas:
- 1 endpoint API: `GET /api/admin/users/:id/journey`
- 1 util de transformação: `computeUserJourney(user, sessions, attendances, unlocks) → UserJourney`
- 1 componente modal de visualização

## 4. Funcionalidades (V1)

### 4.1 Pontos de entrada

Dois pontos existentes no painel admin ganham um botão "Ver Jornada":
- **Aba Usuários:** em cada linha da tabela, ícone/botão `Ver Jornada` (abre modal).
- **Aba Engajamento:** em cada linha das tabelas "Top Streaks" e "Em Risco", o nome do usuário vira link/botão clicável.

Ambos abrem o mesmo modal.

### 4.2 Modal "Jornada de [Nome]"

Modal full-screen em mobile, centralizado em desktop (padrão já usado em outros modais do projeto, ex: edição de usuário). Seções:

**Cabeçalho**
- Nome + email + igreja/equipe.
- Botão fechar (X).

**Cards de Resumo (4 em linha / 2×2 mobile)**
- Streak atual
- Melhor streak
- Total de presenças
- % de frequência (sobre **todas** as sessões COMPLETED — usa diretamente `frequencyPct` já computado por `computeUserEngagementStats`, mesma regra do widget "Sua Jornada" do membro e do card "Frequência" do dashboard, evitando divergência entre telas)

**Conquistas Desbloqueadas**
- Lista das conquistas do usuário, ordenadas por `unlockedAt` desc.
- Cada item: ícone (reusa `BadgeIcon`), título, data (via `timeAgoPtBR` ou data absoluta curta).
- Se vazia: "Ainda não desbloqueou conquistas."

**Timeline de Presenças (últimas 20)**
- Lista das 20 presenças mais recentes do usuário.
- Cada item: data da sessão (formato pt-BR), capítulo/livro (`Session.chapterRef`), duração total em minutos.
- Se vazio: "Sem histórico de presença."

**Livros Participados**
- Lista de livros distintos em que o usuário esteve presente (via `extractBookName` sobre as sessões com presença).
- Conta quantas vezes cada um.
- Ordenada por contagem desc.

### 4.3 Estado vazio / novo usuário

Se o usuário nunca participou:
- Cards zerados.
- Todas as listas com empty state apropriado ("Ainda sem histórico de presença").

## 5. Arquitetura

### 5.1 Util puro: `src/features/engagement/lib/user-journey.ts`

Pure function testável sem Prisma:

```ts
export interface UserJourney {
  user: { id: string; name: string; email: string; church: string; team: string; subTeam: string };
  stats: UserEngagementStats;
  unlockedAchievements: { key: string; title: string; description: string; iconId: IconId; unlockedAt: string }[];
  recentAttendances: { sessionId: string; date: string; chapterRef: string; durationMin: number }[];
  booksParticipated: { name: string; count: number }[];
  computedAt: string;
}

export function computeUserJourney(
  user: UserLike,
  sessions: SessionLike[],
  attendances: (AttendanceLike & { sessionId: string; duration: number })[],
  unlocks: UnlockLike[],
): UserJourney;
```

- Reusa `computeUserEngagementStats` para `stats`.
- Enriquece `unlockedAchievements` correlacionando `unlocks[i].key` com `ACHIEVEMENTS_VIEW`.
- `recentAttendances`: join com `sessions` (para `date` e `chapterRef`), ordena por `session.date` desc, depois `joinTime` desc como tiebreaker, top 20.
- `booksParticipated`: `Map<string, number>` iterando sessões com presença.
- Duração: `attendance.duration` é em **segundos** (confirmado no schema `prisma/schema.prisma:173`) → converter para minutos usando `Math.round(seconds / 60)` (evita exibir "0 min" para presenças curtas >30s; consistente com `reports/hours/route.ts` que usa `Math.floor(seconds/3600)` para horas — escolhemos `round` para minutos por ser mais amigável a durações pequenas).

### 5.2 Endpoint: `GET /api/admin/users/:id/journey`

- Guard `requireRole("ADMIN")` — aceita **ADMIN ou superior** (hierarquia do projeto: SUPER_ADMIN=100 > ADMIN=80). Confirmado: `requireRole` delega a `hasAccess` em `src/features/permissions/lib/role-hierarchy.ts` que faz comparação `>=` por nível (hierárquico).
- Valida `:id` existe e **não está soft-deleted** (`deletedAt == null`). Retorna `404` caso contrário — nenhum dado de conta excluída vaza.
- Promise.all:
  - `user` com select mínimo (id, name, email, church, team, subTeam, createdAt)
  - `attendances` do usuário: `where: { userId: :id }`
  - `sessions` COMPLETED **filtradas por `date >= user.createdAt`** (evita puxar histórico indefinido do banco conforme projeto cresce, mantém necessário para streak correto):
    - `where: { status: "COMPLETED", date: { gte: user.createdAt } }`
    - select id, status, chapterRef, date
  - `userAchievements` do usuário: `where: { userId: :id }`

  Observação: como `user.createdAt` precisa ser conhecido antes de filtrar `sessions`, o fluxo é: (1) busca `user` primeiro e se 404 retorna cedo; (2) `Promise.all` com attendances+sessions+achievements.
- Retorna `UserJourney` com `Cache-Control: private, max-age=30`.

### 5.3 UI: modal em `admin/page.tsx`

Novo componente `UserJourneyModal({ userId, onClose })`:
- Carrega `/api/admin/users/:id/journey` com `useEffect`.
- Renderiza seções com estados loading/error/ok.
- Usa classes existentes: `.card`, `.stat-card`, `.stats-row`, `.section-title`, `.reports-table`.
- **Modal overlay:** reusar exatamente o padrão canônico já em uso em `src/app/(dashboard)/admin/page.tsx:1425` (e também linha 1487): `position: fixed; inset: 0; zIndex: 200; background: rgba(0,0,0,0.6); backdropFilter: blur(4px)`. Container interno centralizado com `background: var(--surface); border-radius: var(--radius-xl); max-width: 720px; max-height: 90vh; overflow: auto`. Não reinventar o modal.
- **Microcópia padronizada:** usar "Sem histórico de presença" (uma frase única) em todas as seções vazias.
- **Header ellipsis:** nome/email longos recebem `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` para não quebrar layout.

## 6. Classes CSS (zero novas)

Alinhado com lei do projeto. Classes necessárias:
- `.card`, `.stat-card`, `.stats-row`, `.section-title`, `.reports-table`.
- Modal: padrão inline style já em uso para outros modais (overlay fixed + container centralizado). Confirmar na Task 0 do plan.

## 7. Segurança

- Rota protegida por `requireRole("ADMIN")`.
- Param `:id` validado; 404 se soft-deleted (`deletedAt != null`).
- Nenhum dado sensível novo exposto (admin já tem acesso via aba Usuários).
- LGPD: modal mostra dados já disponíveis ao admin, só agrega.

## 8. Performance

- Queries paralelas, filtradas por `userId` — baixo volume (usuário único).
- Cache 30s como no endpoint de insights (clicks repetidos no mesmo usuário não re-rodam).
- Timeline de 20 attendances: O(20) render.

## 9. Testes

### 9.1 Unit (Vitest)

`src/features/engagement/lib/__tests__/user-journey.test.ts` — testa `computeUserJourney`:
- Usuário novo, sem presenças: stats zerados, listas vazias.
- Usuário com 5 presenças e 2 conquistas: recentAttendances=5, unlockedAchievements=2 ordenado por `unlockedAt` desc.
- `booksParticipated` agrega corretamente (3 sessões de "Mateus", 2 de "Marcos" → lista ordenada por count desc).
- `recentAttendances` corta em 20 quando há mais.
- `recentAttendances` ordenado por `session.date` desc (com `joinTime` desempatando).
- Correlação `unlocks[i].key` com catálogo: se key desconhecida (regressão futura), filtra fora silenciosamente — não vaza null no payload.
- Duração em minutos via `Math.round(seconds/60)` — presença de 90s vira 2min, presença de 25s vira 0min.
- Usuário com `church`/`team` vazios: `UserJourney.user` carrega strings vazias sem quebrar.

Mínimo 8 casos.

### 9.2 E2E (Playwright)

`tests/e2e/user-journey.spec.ts`:
- Login admin → vai para `/admin` → aba Usuários.
- Clica "Ver Jornada" em uma linha → modal aparece.
- Verifica presença de "Streak atual", "Conquistas", "Livros Participados".
- Fecha modal.

## 10. Rollback

Zero mudança de schema. Revert dos commits desfaz.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Endpoint vazar dado de soft-deleted | 404 explícito se `deletedAt != null` |
| Admin ver jornada de si mesmo sem utilidade | Aceito — é info dele já disponível no dashboard próprio |
| Nomes longos quebrarem layout | `overflow: hidden; text-overflow: ellipsis` no header do modal |
| Muitas presenças → payload pesado | Truncar em 20 recentes + contagem total em stats |

## 12. Futuro (fora da V1)

- Chart temporal de frequência mensal.
- Botão "Abrir detalhe da sessão" ao clicar numa presença.
- Admin pode exportar jornada como PDF/CSV.
- Ver jornada de leitura pessoal (requer V2 de dados por-usuário).
