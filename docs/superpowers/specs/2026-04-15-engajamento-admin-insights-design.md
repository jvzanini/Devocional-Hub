# Engajamento Admin Insights — Design Spec

**Data:** 2026-04-15
**Autor:** Claude (modo autônomo)
**Status:** Draft
**Escopo:** Nova aba "Engajamento" no painel admin com insights pastorais da comunidade — consumindo `UserAchievement` + `Attendance` já em produção.

---

## 1. Objetivo

Dar ao admin/super_admin visibilidade da saúde comunitária do grupo devocional: quem está firme, quem está em risco de desengajar, qual a distribuição de conquistas. Foco **pastoral**, não competitivo — o ranking é privado (apenas admin vê), nunca exposto para membros.

## 2. Não-Objetivos

- Não expõe ranking competitivo para membros.
- Não cria novas tabelas (reaproveita `Attendance` + `UserAchievement`).
- Não envia notificações/emails nesta V1.
- Não permite admin editar conquistas manualmente (fica para V2).
- Não substitui a aba Relatórios (que foca em presença histórica agregada).

## 3. Contexto

Já existem no projeto (backend):
- `Attendance` por usuário × sessão (`joinTime`, `duration`).
- `UserAchievement` (`userId`, `key`, `unlockedAt`).
- `Session` com `status: COMPLETED`.
- `computeUserEngagementStats(sessions, attendances)` puro e testado.
- Painel admin em `src/app/(dashboard)/admin/page.tsx` (Client) com abas.

## 4. Funcionalidades (V1)

### 4.1 Nova aba "Engajamento"

Adicionar valor `"engagement"` ao `type Tab` em `admin/page.tsx`. Acessível apenas para admins (guard já existe na página).

### 4.2 Cards de resumo (topo da aba)

4 cards usando a classe `.stat-card` existente, em `.stats-row` (grid de 3–4 cols responsivo):

| Card | Métrica |
|---|---|
| **Comunidade Ativa** | `count(usuários com Attendance nos últimos 30 dias)` |
| **Streaks Ativos** | `count(usuários com currentStreak >= 3)` |
| **Em Risco** | `count(usuários ATIVOS e ENGAJADOS que pararam de aparecer)` — ver §9 para definição precisa. |
| **Conquistas Totais** | `count(UserAchievement)` |

### 4.3 Top Streaks (tabela)

Lista dos 10 usuários com maior `bestStreak` (desempate por `currentStreak` desc, depois `totalAttended` desc). Colunas: Nome, Igreja/Equipe, Streak Atual, Melhor Streak, Total Presenças, Última Presença (via `timeAgoPtBR`).

Reutiliza estilo da tabela de relatórios (`.reports-table`).

### 4.4 Distribuição de Conquistas (lista simples)

Para cada key em `ACHIEVEMENTS`:
- Nome + descrição
- Nº de usuários que desbloquearam
- % sobre comunidade ativa

Ordenado por count desc. Renderizado como lista em um `.card` único, sem chart (manter simples e em linha com o design atual).

### 4.5 Usuários em Risco (tabela)

Mesma definição de §4.2 "Em Risco", mas expandida para até 20 linhas mostrando Nome, última presença relativa, melhor streak histórico, Whatsapp (se disponível). **Ação pastoral:** o admin pode copiar a lista ou ver nomes para entrar em contato — sem ação automática.

## 5. Arquitetura

Dividido em:

### 5.1 Endpoint SSR-only (admin)

Nova rota **API** `/api/admin/engagement/insights` (GET):
- Guard: `requireRole("ADMIN")` (padrão já usado nas outras rotas admin).
- Retorna `{ summary, topStreaks, distribution, atRisk }`.
- Todas as métricas computadas server-side via queries agregadas + util puro existente.
- Payload completo inferior a 50 KB mesmo com 500 usuários.

Motivação para endpoint (e não SSR direto na página admin): a página `admin/page.tsx` é Client Component; precisa consumir dados via `fetch`.

### 5.2 Util novo: `src/features/engagement/lib/admin-insights.ts`

```ts
import type { SessionLike, AttendanceLike } from "./user-stats";

export interface UserLike {
  id: string; name: string; email: string;
  church: string; team: string; subTeam: string;
  whatsapp: string | null;
  createdAt: Date;
}
export interface UnlockLike { userId: string; key: string; unlockedAt: Date; }

export interface TopStreakRow {
  userId: string; name: string; church: string; team: string;
  bestStreak: number; currentStreak: number; totalAttended: number;
  lastAttendedAt: Date | null;
}

export interface DistributionRow {
  key: string; title: string; description: string;
  count: number; pct: number; // 0..1 sobre activeCommunity
}

export interface AtRiskRow {
  userId: string; name: string; church: string; team: string;
  whatsapp: string | null;
  level: "attention" | "dormant" | "lost";
  lastAttendedAt: Date;
  bestStreak: number;
}

export interface AdminInsights {
  summary: {
    activeCommunity: number;
    activeStreaks: number;
    atRisk: number;
    totalAchievements: number;
  };
  topStreaks: TopStreakRow[];
  distribution: DistributionRow[];
  atRisk: AtRiskRow[];
  computedAt: string; // ISO
}

export function computeAdminInsights(
  users: UserLike[],
  sessions: SessionLike[],
  attendances: (AttendanceLike & { userId: string })[],
  unlocks: UnlockLike[],
): AdminInsights;
```

**Pipeline interno (implementação):**
1. Agrupar `attendances` por `userId` → `Map<userId, AttendanceLike[]>`.
2. Para cada usuário **não soft-deleted** (`deletedAt == null`) e **ativo** (`active !== false`): chamar `computeUserEngagementStats(sessions, userAttendances)` — reutiliza exatamente a mesma função usada em prod.
3. Acumular: bestStreak, currentStreak, classificação de risco (§9), último `unlockedAt` (via `unlocks` groupBy userId).
4. Derivar listas: topStreaks (top 10 por bestStreak desc, currentStreak desc, totalAttended desc); atRisk (até 20, ordenado por RiskLevel e recência); distribution (loop por `ACHIEVEMENTS` × `unlocks` groupBy key).
5. `activeCommunity` = count(users com última presença < 30 dias).

Função é **pura** (sem I/O) e testável sem Prisma.

### 5.3 Aba visual

Client Component dentro de `admin/page.tsx`:
- `useEffect` carrega `/api/admin/engagement/insights`
- Estados: loading / error / ok
- Renderiza usando classes existentes (`.stat-card`, `.stats-row`, `.card`, `.section-title`, `.reports-table` — ver análise em §6).

## 6. Classes CSS reutilizadas (zero novas)

Conforme regra absoluta do projeto: **proibido criar classes CSS novas**. Verificar presença em `globals.css` na task 0 do plan; ajustar spec se alguma divergir. Alvos:

- `.stats-row` — grid 3 cols (para 4 cards, sobrescrever inline: `style={{ gridTemplateColumns: "repeat(4, 1fr)" }}` desktop / `repeat(2, 1fr)` em ≤480px)
- `.stat-card` — cards de métrica
- `.card` — container de bloco
- `.section-card` — card com padding 20px
- `.section-title` — título uppercase cinza
- `.reports-table` + `.reports-table-card` — padrão de tabela (verificar existência)
- `.btn-outline` — botão secundário

**Regra de fallback:** se qualquer classe acima não existir, implementar com inline style usando apenas tokens `var(--accent)`, `var(--surface)`, `var(--text)`, `var(--text-muted)`, `var(--border)`, `var(--radius-xl)`. **Não criar classe nova.**

## 7. Segurança e LGPD

- **Rota API** protegida por guard admin (confirmar nome real em `src/features/permissions/lib/permission-guard.ts` antes de implementar — `requireRole("ADMIN")` ou similar). Retorna 403 para não-admin, 401 para não-logado.
- **Não aceita** `userId` arbitrário via query/body — dados são globais da comunidade.
- **Filtro obrigatório**: `users.findMany({ where: { deletedAt: null, active: true } })`. Usuários soft-deleted ou desativados **NÃO** aparecem em listas nem compõem `activeCommunity`. Exclui potencial vazamento LGPD de conta excluída.
- Nomes, emails, WhatsApp são dados já acessíveis a admin via aba "Usuários". Não há nova exposição.
- Admin que copiar WhatsApp para enviar mensagem fora da plataforma é comportamento aceito (admin tem acesso legítimo a dados de contato; este é seu canal pastoral).

## 8. Performance

- Comunidade atual: <500 usuários, <2k attendances históricas. Query agregada simples roda em <100ms.
- Endpoint expõe `Cache-Control: private, max-age=30` — admin alternando entre abas não recomputa 4 queries a cada clique. Pequena latência de 30s em updates é aceitável para insight pastoral.
- Queries paralelizadas via `Promise.all`:
  1. `users` com `where: { deletedAt: null, active: true }` (select id, name, email, church, team, subTeam, whatsapp, createdAt)
  2. `attendances` (select userId, sessionId, joinTime)
  3. `sessions` completed (select id, date, status, chapterRef)
  4. `userAchievements` (select userId, key, unlockedAt)
- Complexidade: O(U × S) onde U = usuários e S = sessões (reusa `computeUserEngagementStats` por usuário, que é O(S)). Para U=500, S=500, total ≤250k ops — alguns ms em Node moderno.

## 9. Util de classificação de risco

Definição pastoral revisada — categoriza em 3 níveis para priorizar ação do líder. A contagem de "Em Risco" no card soma os 3 níveis.

```ts
const NOW = Date.now();
const SEVEN_DAYS  = 7  * 86400_000;
const THIRTY_DAYS = 30 * 86400_000;
const NINETY_DAYS = 90 * 86400_000;

export type RiskLevel = "attention" | "dormant" | "lost";

/**
 * Classifica como "em risco" um usuário que já demonstrou engajamento
 * (bestStreak >= 2) mas parou de participar. Não inclui nunca-engajados.
 */
function classifyAtRisk({
  lastAttendedAt, bestStreak, currentStreak,
}: { lastAttendedAt: Date | null; bestStreak: number; currentStreak: number }): RiskLevel | null {
  if (!lastAttendedAt) return null;    // nunca participou — fora de "em risco"
  if (bestStreak < 2) return null;     // nunca teve engajamento mínimo
  if (currentStreak > 0) return null;  // ainda em sequência viva
  const age = NOW - lastAttendedAt.getTime();
  if (age >= SEVEN_DAYS && age < THIRTY_DAYS) return "attention"; // 7–30d
  if (age >= THIRTY_DAYS && age < NINETY_DAYS) return "dormant";  // 30–90d — alvo principal de resgate
  if (age >= NINETY_DAYS) return "lost";                          // 90+ dias
  return null;
}
```

**Mudanças vs rascunho anterior:**
- `bestStreak >= 2` (era 3) — captura pessoas que já estiveram 2 vezes consecutivas, não apenas os "veteranos".
- Inclui dormant (30–90d) e lost (90+d) — antes a spec excluía e deixava de fora justamente o alvo pastoral principal.
- Lista em §4.5 ordena por `RiskLevel` (dormant primeiro → attention → lost) e dentro do mesmo nível por proximidade temporal (mais recente primeiro), porque dormant é o mais recuperável.

## 10. Testes

### 10.1 Unit (Vitest)

`src/features/engagement/lib/__tests__/admin-insights.test.ts` — testa `computeAdminInsights` puro:
- Comunidade vazia: zeros em todos os campos.
- Comunidade com 1 usuário streak 3 (currentStreak=3): topStreaks tem 1 linha, activeStreaks=1.
- Usuário com bestStreak 5 e última presença 10 dias atrás: aparece em atRisk com `level="attention"`.
- Usuário com bestStreak 5 e última presença 45 dias atrás: aparece em atRisk com `level="dormant"`.
- Usuário com bestStreak 5 e última presença 120 dias atrás: aparece em atRisk com `level="lost"`.
- Usuário com bestStreak 5 e última presença 2 dias atrás: NÃO aparece em atRisk.
- Usuário nunca-presente (sem Attendance): NÃO aparece em atRisk nem em topStreaks.
- Usuário soft-deleted (`deletedAt != null`): NÃO aparece em lista alguma, NEM conta em `activeCommunity`.
- Ordenação topStreaks: bestStreak desc, currentStreak desc, totalAttended desc (incluindo triple-tie).
- Distribuição de conquistas: ordenada por count desc, inclui achievements com 0 usuários (mostrando 0%).
- Timezone: usar datas fixas (`vi.setSystemTime`) garantindo classificação correta em boundaries BRT vs UTC.

Mínimo 10 casos.

### 10.2 E2E (Playwright)

`tests/e2e/engagement-admin.spec.ts`:
- Login admin → navega para `/admin`
- Clica na aba Engajamento
- Verifica presença dos 4 cards de resumo
- Verifica que a tabela de Top Streaks renderiza

## 11. Rollback

- Nenhuma mudança de schema. Rollback = reverter commits.
- Rota API pode ficar órfã sem prejuízo (apenas não consumida).

## 12. Acessibilidade

- Tabelas com `<thead>` + `<th scope="col">`.
- Números relevantes com `aria-label` explicativo.
- Empty states textuais ("Ninguém em risco ainda 🙌").
- Contraste mantido via tokens `var(--*)`.

## 13. Riscos

| Risco | Mitigação |
|---|---|
| Usuário "nunca participou" contado em "Em Risco" | Guard: `if (!lastAttendedAt) return false`. |
| Endpoint pesado em comunidades maiores | V1 aceita ~500 usuários. V2: cache 60s. |
| Exposição indevida via browser | Rota protegida por `requireRole("ADMIN")`. |
| Admin copiar lista com WhatsApp e enviar fora | Já é comportamento aceito (admin tem acesso legítimo). Listar apenas o mínimo necessário. |

## 14. Futuro (fora desta spec)

- V2: botão "Enviar lembrete via WhatsApp/Email" para usuários em risco.
- V2: filtros por equipe/igreja/período.
- V2: export CSV.
- V2: chart de evolução de engajamento ao longo do tempo.
