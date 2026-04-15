# Minhas Conquistas no Perfil — Design Spec

**Data:** 2026-04-15
**Autor:** Claude (modo autônomo)
**Status:** Draft
**Escopo:** Adicionar seção "Minha Jornada" na página `/profile` onde o usuário (qualquer role) vê SUA PRÓPRIA jornada histórica: conquistas com datas, timeline de presenças recentes, livros participados. Espelho privado do que admin já vê em "Jornada Individual".

---

## 1. Objetivo

Dar ao usuário uma página própria onde ele possa:
- Celebrar sua própria trajetória (pastoralmente positivo).
- Ver quando cada conquista foi desbloqueada.
- Acompanhar histórico de presenças.
- Entender quais livros já estudou.

Complementa o widget "Sua Jornada" do dashboard (que é resumido) com versão completa.

## 2. Não-Objetivos

- Não é pública — só o próprio usuário vê a sua jornada.
- Não compara com outros usuários.
- Não expõe ranking.
- Não permite editar conquistas.

## 3. Reaproveitamento

- Endpoint `/api/admin/users/:id/journey` existe mas é **admin-only**.
- **Criar novo endpoint** `/api/me/journey` (sem guard admin — apenas autenticação) que retorna a jornada do usuário logado.
- Reusar 100% do util `computeUserJourney`.
- Reusar componentes `BadgeIcon`, pattern da modal; mas aqui **não é modal**, é seção na página.

## 4. Funcionalidades (V1)

### 4.1 Nova seção na página `/profile`

Adicionar seção "Minha Jornada" após os cards existentes (perfil, foto, zoom identifiers). Visível para todos os roles.

**Estrutura:**
- Cards de resumo (Streak atual, Melhor streak, Presenças, Frequência)
- Conquistas desbloqueadas com datas
- Timeline de presenças recentes (20)
- Livros participados

Usa classes existentes (`.card`, `.stat-card`, `.stats-row`, `.section-title`, `.reports-table`) — mesma identidade visual do widget "Sua Jornada" e do modal admin.

### 4.2 Estado vazio / novo usuário

- `totalAttended === 0`: uma mensagem motivadora "Sua jornada começa no próximo devocional" (espelho do dashboard).
- Conquistas vazias: "Ainda não desbloqueou conquistas. Continue firme!".
- Sem presenças: "Sem histórico de presença."

## 5. Arquitetura

### 5.1 Helper compartilhado `fetchUserJourney(userId)`

**Arquivo:** `src/features/engagement/lib/user-journey.ts` (ampliação do módulo existente).

```ts
export async function fetchUserJourney(userId: string): Promise<UserJourney | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, name: true, email: true, church: true, team: true, subTeam: true, createdAt: true },
  });
  if (!user) return null;

  const [attendances, sessions, unlocks] = await Promise.all([
    prisma.attendance.findMany({ where: { userId }, select: { sessionId: true, joinTime: true, duration: true } }),
    prisma.session.findMany({ where: { status: PipelineStatus.COMPLETED, date: { gte: user.createdAt } }, select: { id: true, status: true, chapterRef: true, date: true } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { userId: true, key: true, unlockedAt: true } }),
  ]);

  return computeUserJourney(
    { ...user, whatsapp: null },
    sessions.map((s) => ({ ...s, status: s.status as string })),
    attendances,
    unlocks,
  );
}
```

**Refactor preliminar:** a rota admin `/api/admin/users/[id]/journey/route.ts` passa a chamar `fetchUserJourney(id)` em vez de duplicar as queries. Garante única fonte de verdade.

### 5.2 Endpoint `GET /api/me/journey`

- Guard: apenas autenticação (`auth()` do NextAuth) — **não** admin-only.
- Se `!session?.user?.id`: retorna `NextResponse.json({ error: "unauthorized" }, { status: 401 })`.
- Caso contrário: `const journey = await fetchUserJourney(session.user.id)`; se `null` (raro — user deletado entre auth e fetch), 404.
- `Cache-Control: private, max-age=30`.

**Arquivo:** `src/app/api/me/journey/route.ts`.

### 5.3 Component `MyJourneySection` (Client)

`src/features/engagement/components/MyJourneySection.tsx`:
- Client Component.
- `useEffect` → `fetch('/api/me/journey')`.
- Estados loading/error/data (igual ao `UserJourneyModal`).
- Renderiza seções iguais ao modal admin, mas:
  - SEM botão X / overlay (é uma seção inline na página, não modal).
  - SEM cabeçalho com email/church (o próprio usuário já vê o perfil acima).

### 5.4 Integração em `/profile/page.tsx`

Adicionar `<MyJourneySection />` ao final da página. `/profile` é Client Component já.

## 6. Classes CSS

Zero CSS nova. Reusa tudo do sistema atual.

## 7. Segurança

- Rota `/api/me/journey` validates `auth()` — sem admin required.
- `userId` vem exclusivamente de `session.user.id` (jamais de URL/body).
- Usuário vê APENAS sua própria jornada.
- Não há vetor de enumeração.

## 8. Performance

- Queries filtradas por `userId` desde o começo.
- Cache `private, max-age=30` (mesma política do endpoint admin).

## 9. Testes

### 9.1 Unit

Já temos 8 casos de `computeUserJourney` (feature anterior). Nada novo de unit para esta feature.

### 9.2 E2E

`tests/e2e/my-journey-profile.spec.ts`:
- Login (admin ou membro) → `/profile` → scroll até a seção "Minha Jornada".
- Verifica presença de "Streak atual", "Conquistas", "Presenças recentes".
- **Guard test:** chamar `/api/me/journey` sem sessão (`page.request.get` em contexto new `browser.newContext()` sem login) deve retornar 401. Confirma que o guard está funcionando.

## 10. Rollback

Zero schema. Revert commits.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Usuário chama com outra `userId` via query | Endpoint ignora qualquer param; só usa `session.user.id`. |
| Performance com muitos usuários chamando simultaneamente | Query leve por usuário; cache 30s. |
| Duplicação visual com widget "Sua Jornada" do dashboard | OK — dashboard é resumo; perfil é histórico completo com timeline. Complementares. |

## 12. Futuro

- V2: Compartilhar conquista como imagem (requer geração de imagem server-side).
- V2: Filtros de período.
- V2: Link permalink privado.
