# Engajamento Admin Insights — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (lei absoluta do projeto — ver CLAUDE.md §Leis Absolutas). UI **sempre** reusando classes existentes do design system. Steps usam checkbox (`- [ ]`) para tracking.

**Goal:** Adicionar aba "Engajamento" ao painel admin com 4 cards de resumo, tabela de Top Streaks, distribuição de conquistas e lista de usuários em risco (attention/dormant/lost).

**Architecture:** Util puro `computeAdminInsights` que agrupa dados por usuário e aplica `computeUserEngagementStats` já existente. Rota API `/api/admin/engagement/insights` (GET, guard `requireRole("ADMIN")`) carrega dados + chama util + retorna JSON. Aba client-side no `admin/page.tsx` consome via `fetch`.

**Tech Stack:** Next.js 16 (App Router), Prisma 5, Vitest, Recharts (já presente mas NÃO usado aqui — listas simples). Zero classe CSS nova. Zero dependência nova.

**Spec:** `docs/superpowers/specs/2026-04-15-engajamento-admin-insights-design.md`

---

## Mapa de Arquivos

**Criar:**
- `src/features/engagement/lib/admin-insights.ts` — util puro `computeAdminInsights`.
- `src/features/engagement/lib/__tests__/admin-insights.test.ts` — testes Vitest.
- `src/app/api/admin/engagement/insights/route.ts` — endpoint GET admin-only.
- `tests/e2e/engagement-admin.spec.ts` — E2E Playwright (rodar pós-deploy).

**Modificar:**
- `src/app/(dashboard)/admin/page.tsx` — adicionar aba "engagement" ao type Tab + renderização.

---

## Task 0: Validar classes CSS e guard admin

**Files:** nenhum

- [ ] **Step 1:** Confirmar classes existentes em `globals.css` (já validado no review #2 — linhas exatas: `.card` 402, `.section-card` 417, `.stat-card` 425, `.btn-outline` 464, `.section-title` 684, `.stats-row` 742, `.reports-table-card` 1016, `.reports-table` 1024). Se quiser verificar: `grep -En "^\.(reports-table|reports-table-card|stats-row|stat-card|card|section-card|section-title|btn-outline)\s*[{,]" src/app/globals.css`.

- [ ] **Step 2:** Run: `grep -n "requireRole\|function requireAdmin" src/features/permissions/lib/permission-guard.ts | head -10`
  Expected: existe função `requireRole(minRole)` exportada. Se for outro nome, ajustar as tasks seguintes.

- [ ] **Step 3:** Run: `grep -rn "requireRole\|requireAdmin" src/app/api/admin | head -5`
  Expected: ver 1+ rota admin existente usando o guard — copiar o padrão exato dela (import + uso).

- [ ] **Step 4:** (Informativo) Anotar o padrão encontrado. Não commitar nada.

---

## Task 1: Util puro `computeAdminInsights` (TDD)

**Files:**
- Create: `src/features/engagement/lib/admin-insights.ts`
- Create: `src/features/engagement/lib/__tests__/admin-insights.test.ts`

- [ ] **Step 1 (TDD):** Criar os testes primeiro em `src/features/engagement/lib/__tests__/admin-insights.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeAdminInsights } from "../admin-insights";
import type { UserLike, UnlockLike } from "../admin-insights";
import type { SessionLike, AttendanceLike } from "../user-stats";

const NOW = new Date("2026-04-15T12:00:00.000Z");

function user(id: string, name: string, extras: Partial<UserLike> = {}): UserLike {
  return {
    id, name, email: `${id}@test.com`,
    church: "IC", team: "A", subTeam: "1",
    whatsapp: null, createdAt: new Date("2026-01-01"),
    ...extras,
  };
}
function session(id: string, daysAgo: number, status: "COMPLETED" | "PENDING" = "COMPLETED", chapterRef = "Mateus 1"): SessionLike {
  return { id, status, chapterRef, date: new Date(NOW.getTime() - daysAgo * 86400_000) };
}
function att(userId: string, sessionId: string, joinDaysAgo: number): AttendanceLike & { userId: string } {
  return { userId, sessionId, joinTime: new Date(NOW.getTime() - joinDaysAgo * 86400_000) };
}
function unlock(userId: string, key: string, daysAgo: number): UnlockLike {
  return { userId, key, unlockedAt: new Date(NOW.getTime() - daysAgo * 86400_000) };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

describe("computeAdminInsights", () => {
  it("comunidade vazia: zeros em todos os campos", () => {
    const r = computeAdminInsights([], [], [], []);
    expect(r.summary.activeCommunity).toBe(0);
    expect(r.summary.activeStreaks).toBe(0);
    expect(r.summary.atRisk).toBe(0);
    expect(r.summary.totalAchievements).toBe(0);
    expect(r.topStreaks).toEqual([]);
    expect(r.atRisk).toEqual([]);
    expect(r.distribution.every((d) => d.count === 0 && d.pct === 0)).toBe(true);
  });

  it("1 usuário com currentStreak 3: topStreaks tem 1 linha, activeStreaks=1", () => {
    const users = [user("u1", "João")];
    const sessions = [session("s1", 20), session("s2", 15), session("s3", 10)];
    const atts = [att("u1", "s1", 20), att("u1", "s2", 15), att("u1", "s3", 10)];
    const r = computeAdminInsights(users, sessions, atts, []);
    expect(r.topStreaks).toHaveLength(1);
    expect(r.topStreaks[0].currentStreak).toBeGreaterThanOrEqual(3);
    expect(r.summary.activeStreaks).toBe(1);
  });

  it("user com bestStreak 5 e última presença 10 dias atrás → atRisk level=attention", () => {
    const users = [user("u1", "Maria")];
    const sessions = [
      session("s1", 40), session("s2", 35), session("s3", 30),
      session("s4", 25), session("s5", 20), session("s6", 10),
    ];
    const atts = [att("u1","s1",40), att("u1","s2",35), att("u1","s3",30), att("u1","s4",25), att("u1","s5",20)];
    const r = computeAdminInsights(users, sessions, atts, []);
    expect(r.atRisk).toHaveLength(1);
    expect(r.atRisk[0].level).toBe("attention");
  });

  it("last=45d → level=dormant", () => {
    const users = [user("u1", "Pedro")];
    const sessions = [session("s1", 50), session("s2", 47), session("s3", 45), session("s4", 1)];
    const atts = [att("u1","s1",50), att("u1","s2",47), att("u1","s3",45)];
    const r = computeAdminInsights(users, sessions, atts, []);
    expect(r.atRisk[0]?.level).toBe("dormant");
  });

  it("last=120d → level=lost", () => {
    const users = [user("u1", "Ana")];
    const sessions = [session("s1", 125), session("s2", 122), session("s3", 120), session("s4", 1)];
    const atts = [att("u1","s1",125), att("u1","s2",122), att("u1","s3",120)];
    const r = computeAdminInsights(users, sessions, atts, []);
    expect(r.atRisk[0]?.level).toBe("lost");
  });

  it("last=2d (streak vivo) → NÃO atRisk", () => {
    const users = [user("u1", "Carlos")];
    const sessions = [session("s1", 5), session("s2", 2)];
    const atts = [att("u1","s1",5), att("u1","s2",2)];
    const r = computeAdminInsights(users, sessions, atts, []);
    expect(r.atRisk).toHaveLength(0);
  });

  it("user sem nenhuma presença → NÃO atRisk, NÃO topStreaks", () => {
    const users = [user("u1", "Novato")];
    const sessions = [session("s1", 5)];
    const r = computeAdminInsights(users, sessions, [], []);
    expect(r.atRisk).toHaveLength(0);
    expect(r.topStreaks).toHaveLength(0);
  });

  it("user soft-deleted NÃO aparece em lista alguma", () => {
    const users = [user("u1", "Deletado", { deletedAt: new Date("2026-04-01") })];
    const sessions = [session("s1", 10)];
    const atts = [att("u1","s1",10)];
    const r = computeAdminInsights(users, sessions, atts, [unlock("u1","first_step",10)]);
    expect(r.topStreaks).toHaveLength(0);
    expect(r.atRisk).toHaveLength(0);
    expect(r.summary.activeCommunity).toBe(0);
    // conquistas persistidas contam no total geral
    expect(r.summary.totalAchievements).toBe(1);
  });

  it("ordenação topStreaks com triple-tie: bestStreak→currentStreak→totalAttended", () => {
    const users = [user("a", "A"), user("b", "B"), user("c", "C")];
    const sessions = [session("s1",10), session("s2",5), session("s3",1)];
    const atts = [
      att("a","s1",10), att("a","s2",5), att("a","s3",1), // best=3 curr=3 total=3
      att("b","s1",10), att("b","s2",5), att("b","s3",1), // best=3 curr=3 total=3
      att("c","s1",10), att("c","s2",5),                  // best=2 curr=?? total=2
    ];
    const r = computeAdminInsights(users, sessions, atts, []);
    // A e B empatam em best+curr+total → ordem estável (por id ou nome)
    expect(r.topStreaks[0].bestStreak).toBe(3);
    expect(r.topStreaks[1].bestStreak).toBe(3);
    expect(r.topStreaks[2].bestStreak).toBe(2);
  });

  it("distribuição ordenada por count desc; inclui achievements com 0 usuários (0%)", () => {
    const users = [user("u1","A"), user("u2","B")];
    const sessions = [session("s1",10)];
    const atts = [att("u1","s1",10), att("u2","s1",10)];
    const unlocks = [unlock("u1","first_step",10), unlock("u2","first_step",10)];
    const r = computeAdminInsights(users, sessions, atts, unlocks);
    const first = r.distribution.find((d) => d.key === "first_step");
    expect(first?.count).toBe(2);
    expect(first?.pct).toBeCloseTo(1);
    const zero = r.distribution.find((d) => d.key === "book_explorer");
    expect(zero?.count).toBe(0);
    expect(zero?.pct).toBe(0);
  });
});
```

- [ ] **Step 2:** Rodar os testes — devem FALHAR por `computeAdminInsights` não existir.
  Run: `npx vitest run src/features/engagement/lib/__tests__/admin-insights.test.ts`

- [ ] **Step 3:** Criar `src/features/engagement/lib/admin-insights.ts`:

```ts
import { computeUserEngagementStats, type SessionLike, type AttendanceLike } from "./user-stats";
import { ACHIEVEMENTS_VIEW } from "./achievements";

export interface UserLike {
  id: string; name: string; email: string;
  church: string; team: string; subTeam: string;
  whatsapp: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
  active?: boolean;
}

export interface UnlockLike { userId: string; key: string; unlockedAt: Date; }

export interface TopStreakRow {
  userId: string; name: string; church: string; team: string;
  bestStreak: number; currentStreak: number; totalAttended: number;
  lastAttendedAt: Date | null;
}
export interface DistributionRow {
  key: string; title: string; description: string;
  count: number; pct: number;
}
export type RiskLevel = "attention" | "dormant" | "lost";
export interface AtRiskRow {
  userId: string; name: string; church: string; team: string;
  whatsapp: string | null;
  level: RiskLevel;
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
  computedAt: string;
}

const SEVEN_DAYS = 7 * 86400_000;
const THIRTY_DAYS = 30 * 86400_000;
const NINETY_DAYS = 90 * 86400_000;

function classifyRisk(
  lastAttendedAt: Date | null,
  bestStreak: number,
  currentStreak: number,
  now: number,
): RiskLevel | null {
  if (!lastAttendedAt) return null;
  if (bestStreak < 2) return null;
  if (currentStreak > 0) return null;
  const age = now - lastAttendedAt.getTime();
  if (age >= SEVEN_DAYS && age < THIRTY_DAYS) return "attention";
  if (age >= THIRTY_DAYS && age < NINETY_DAYS) return "dormant";
  if (age >= NINETY_DAYS) return "lost";
  return null;
}

const LEVEL_PRIORITY: Record<RiskLevel, number> = { dormant: 0, attention: 1, lost: 2 };

export function computeAdminInsights(
  users: UserLike[],
  sessions: SessionLike[],
  attendances: (AttendanceLike & { userId: string })[],
  unlocks: UnlockLike[],
): AdminInsights {
  const now = Date.now();

  // Agrupa attendances por userId
  const byUser = new Map<string, (AttendanceLike & { userId: string })[]>();
  for (const a of attendances) {
    const arr = byUser.get(a.userId) ?? [];
    arr.push(a);
    byUser.set(a.userId, arr);
  }

  // Filtra users válidos (não soft-deleted, não desativados)
  const validUsers = users.filter(
    (u) => u.deletedAt == null && (u.active === undefined || u.active === true),
  );

  const topRows: TopStreakRow[] = [];
  const atRiskRows: AtRiskRow[] = [];
  let activeCommunity = 0;
  let activeStreaks = 0;

  for (const u of validUsers) {
    const userAtts = byUser.get(u.id) ?? [];
    const stats = computeUserEngagementStats(sessions, userAtts);

    if (stats.lastAttendedAt && now - stats.lastAttendedAt.getTime() < THIRTY_DAYS) {
      activeCommunity++;
    }
    if (stats.currentStreak >= 3) activeStreaks++;

    if (stats.totalAttended > 0) {
      topRows.push({
        userId: u.id, name: u.name, church: u.church, team: u.team,
        bestStreak: stats.bestStreak, currentStreak: stats.currentStreak,
        totalAttended: stats.totalAttended, lastAttendedAt: stats.lastAttendedAt,
      });
    }

    const level = classifyRisk(stats.lastAttendedAt, stats.bestStreak, stats.currentStreak, now);
    if (level && stats.lastAttendedAt) {
      atRiskRows.push({
        userId: u.id, name: u.name, church: u.church, team: u.team,
        whatsapp: u.whatsapp, level,
        lastAttendedAt: stats.lastAttendedAt, bestStreak: stats.bestStreak,
      });
    }
  }

  // Ordenação topStreaks: best desc, current desc, total desc, name asc (estável)
  topRows.sort((a, b) =>
    b.bestStreak - a.bestStreak
    || b.currentStreak - a.currentStreak
    || b.totalAttended - a.totalAttended
    || a.name.localeCompare(b.name, "pt-BR"),
  );
  const topStreaks = topRows.slice(0, 10);

  // Ordenação atRisk: level prioridade, depois mais recente primeiro
  atRiskRows.sort((a, b) =>
    LEVEL_PRIORITY[a.level] - LEVEL_PRIORITY[b.level]
    || b.lastAttendedAt.getTime() - a.lastAttendedAt.getTime(),
  );
  const atRisk = atRiskRows.slice(0, 20);

  // Distribuição de conquistas (inclui as de soft-deleted — são eventos imutáveis)
  const unlocksByKey = new Map<string, number>();
  for (const u of unlocks) {
    unlocksByKey.set(u.key, (unlocksByKey.get(u.key) ?? 0) + 1);
  }
  const distribution: DistributionRow[] = ACHIEVEMENTS_VIEW.map((a) => {
    const count = unlocksByKey.get(a.key) ?? 0;
    const pct = activeCommunity > 0 ? count / activeCommunity : 0;
    return { key: a.key, title: a.title, description: a.description, count, pct };
  }).sort((a, b) => b.count - a.count);

  return {
    summary: {
      activeCommunity,
      activeStreaks,
      atRisk: atRiskRows.length,
      totalAchievements: unlocks.length,
    },
    topStreaks,
    distribution,
    atRisk,
    computedAt: new Date(now).toISOString(),
  };
}
```

- [ ] **Step 4:** Rodar testes — devem PASSAR.
  Run: `npx vitest run src/features/engagement/lib/__tests__/admin-insights.test.ts`
  Expected: 10 passed.

- [ ] **Step 5:** Run `npm run test:unit` — esperado: 26+ passed (16 anteriores + 10 novos).

- [ ] **Step 6:** Run `npx tsc --noEmit` — sem erros.

- [ ] **Step 7:** Commit:
```bash
git add src/features/engagement/lib/admin-insights.ts src/features/engagement/lib/__tests__/admin-insights.test.ts
git commit -m "feat(engagement): util computeAdminInsights (admin-only insights)"
```

---

## Task 2: Endpoint API `/api/admin/engagement/insights`

**Files:**
- Create: `src/app/api/admin/engagement/insights/route.ts`

- [ ] **Step 1:** Antes, ler uma rota admin existente para copiar o padrão do guard. Exemplo:
  Run: `cat src/app/api/admin/permissions/route.ts` (ou outra que use `requireRole`).

- [ ] **Step 2:** Criar `src/app/api/admin/engagement/insights/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";
import { computeAdminInsights } from "@/features/engagement/lib/admin-insights";

export async function GET() {
  const guard = await requireRole("ADMIN");
  if (!guard.authorized) return guard.response;

  const [users, attendances, sessions, unlocks] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null, active: true },
      select: {
        id: true, name: true, email: true,
        church: true, team: true, subTeam: true,
        whatsapp: true, createdAt: true,
      },
    }),
    prisma.attendance.findMany({
      select: { userId: true, sessionId: true, joinTime: true },
    }),
    prisma.session.findMany({
      where: { status: "COMPLETED" },
      select: { id: true, status: true, chapterRef: true, date: true },
    }),
    prisma.userAchievement.findMany({
      select: { userId: true, key: true, unlockedAt: true },
    }),
  ]);

  const insights = computeAdminInsights(users, sessions, attendances, unlocks);

  return NextResponse.json(insights, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
```

**Importante:** o nome exato da função `requireRole` e o shape de retorno (`{authorized, response|user}`) devem bater com o que existe no projeto. Se divergir, ajustar os imports/destructures.

- [ ] **Step 3:** Run `npx tsc --noEmit` — sem erros.

- [ ] **Step 4:** Commit:
```bash
git add src/app/api/admin/engagement/insights/route.ts
git commit -m "feat(api): endpoint GET /api/admin/engagement/insights"
```

---

## Task 3: Adicionar aba "Engajamento" ao painel admin (UI)

**Files:**
- Modify: `src/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1:** Ler o arquivo inteiro primeiro para localizar:
  - Linha do `type Tab = ...` (atualmente linha 9).
  - Renderização da lista de abas (botões/tabs).
  - Onde o conteúdo condicional da aba ativa é renderizado.

- [ ] **Step 2:** Adicionar `"engagement"` ao type Tab:

```ts
type Tab = "zoom" | "schedule" | "webhooks" | "users" | "reading" | "attendance" | "ia" | "permissions" | "subscriptions" | "engagement";
```

- [ ] **Step 3:** Adicionar a tab à lista de botões de aba (seguindo o padrão do arquivo — o agente deve ler o arquivo e inserir na mesma estrutura que "ia" ou "permissions").

- [ ] **Step 4:** Criar um componente `EngagementTab` dentro do mesmo arquivo (ou no topo) que consome `/api/admin/engagement/insights`. Usar padrão de outras abas (useEffect+fetch). Renderizar:
  - 4 stat-cards em `.stats-row` com override inline para `gridTemplateColumns: "repeat(4, 1fr)"` (e media query mobile).
  - Tabela Top Streaks com `.reports-table` / `.reports-table-card`.
  - Lista de distribuição de conquistas dentro de um `.card`.
  - Tabela "Em Risco" com `.reports-table` agrupada por level (attention/dormant/lost).
  - Footer mostrando `computedAt` formatado via `timeAgoPtBR`.

**Estrutura sugerida (adapte ao padrão real do arquivo):**

```tsx
const LEVEL_LABEL: Record<"attention" | "dormant" | "lost", string> = {
  attention: "Atenção",
  dormant: "Adormecido",
  lost: "Perdido",
};

function EngagementTab() {
  const [data, setData] = useState<AdminInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/engagement/insights")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((json) => {
        // converte strings ISO em Date para campos Date
        const parsed = {
          ...json,
          topStreaks: json.topStreaks.map((t: any) => ({ ...t, lastAttendedAt: t.lastAttendedAt ? new Date(t.lastAttendedAt) : null })),
          atRisk: json.atRisk.map((a: any) => ({ ...a, lastAttendedAt: new Date(a.lastAttendedAt) })),
        };
        setData(parsed);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 24, color: "var(--text-muted)" }}>Carregando insights…</div>;
  if (error) return <div style={{ padding: 24, color: "var(--accent)" }}>Erro: {error}</div>;
  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="stat-card">
          <div className="section-title">Comunidade Ativa</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{data.summary.activeCommunity}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>últimos 30 dias</div>
        </div>
        <div className="stat-card">
          <div className="section-title">Streaks Ativos</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{data.summary.activeStreaks}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>com 3+ seguidos</div>
        </div>
        <div className="stat-card">
          <div className="section-title">Em Risco</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{data.summary.atRisk}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>precisam de atenção</div>
        </div>
        <div className="stat-card">
          <div className="section-title">Conquistas</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{data.summary.totalAchievements}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>total desbloqueado</div>
        </div>
      </div>

      {/* Top Streaks */}
      <div className="card" style={{ padding: 20 }}>
        <div className="section-title">Top Streaks</div>
        {data.topStreaks.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Sem streaks ainda.</p>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Igreja/Equipe</th>
                <th scope="col">Atual</th>
                <th scope="col">Melhor</th>
                <th scope="col">Total</th>
                <th scope="col">Última</th>
              </tr>
            </thead>
            <tbody>
              {data.topStreaks.map((t) => (
                <tr key={t.userId}>
                  <td>{t.name}</td>
                  <td>{[t.church, t.team].filter(Boolean).join(" · ")}</td>
                  <td>{t.currentStreak}</td>
                  <td>{t.bestStreak}</td>
                  <td>{t.totalAttended}</td>
                  <td>{t.lastAttendedAt ? timeAgoPtBR(t.lastAttendedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Distribuição */}
      <div className="card" style={{ padding: 20 }}>
        <div className="section-title">Distribuição de Conquistas</div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {data.distribution.map((d) => (
            <li key={d.key} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <strong>{d.title}</strong>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.description}</div>
              </div>
              <div style={{ textAlign: "right", minWidth: 120 }}>
                <div style={{ fontWeight: 700, color: "var(--accent)" }}>{d.count}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{Math.round(Math.min(d.pct, 1) * 100)}%</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Em Risco */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>Usuários em Risco</div>
          {data.summary.atRisk > data.atRisk.length && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              mostrando {data.atRisk.length} de {data.summary.atRisk} (mais prioritários)
            </span>
          )}
        </div>
        {data.atRisk.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Ninguém em risco agora 🙌</p>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                <th scope="col">Nível</th>
                <th scope="col">Nome</th>
                <th scope="col">Igreja/Equipe</th>
                <th scope="col">Melhor</th>
                <th scope="col">Última</th>
                <th scope="col">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {data.atRisk.map((a) => (
                <tr key={a.userId}>
                  <td>{LEVEL_LABEL[a.level]}</td>
                  <td>{a.name}</td>
                  <td>{[a.church, a.team].filter(Boolean).join(" · ")}</td>
                  <td>{a.bestStreak}</td>
                  <td>{timeAgoPtBR(a.lastAttendedAt)}</td>
                  <td>{a.whatsapp ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
        Atualizado {timeAgoPtBR(new Date(data.computedAt))}
      </div>
    </div>
  );
}
```

Imports necessários no topo do arquivo:
```ts
import { timeAgoPtBR } from "@/features/engagement/lib/time-utils";
import type { AdminInsights } from "@/features/engagement/lib/admin-insights";
```

- [ ] **Step 5:** Conectar a aba:
  - O state da aba no arquivo real chama-se `tab` (não `activeTab`): `const [tab, setTab] = useState<Tab>("zoom")` por volta da linha 117.
  - Adicionar botão "Engajamento" à lista de tabs seguindo o padrão dos botões existentes (texto "Engajamento", `onClick={() => setTab("engagement")}`, classe ativa igual aos demais).
  - No bloco que renderiza conteúdo por aba ativa, adicionar `{tab === "engagement" && <EngagementTab />}`.

- [ ] **Step 6:** Run `npx tsc --noEmit` — sem erros.

- [ ] **Step 7:** Commit:
```bash
git add "src/app/(dashboard)/admin/page.tsx"
git commit -m "feat(admin): aba Engajamento com insights pastorais"
```

---

## Task 4: E2E Playwright (rodar pós-deploy)

**Files:**
- Create: `tests/e2e/engagement-admin.spec.ts`

- [ ] **Step 1:** Criar `tests/e2e/engagement-admin.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("Admin — Aba Engajamento", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.ADMIN_EMAIL || "");
    await page.fill("#password", process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
    await page.goto("/admin");
  });

  test("abre aba Engajamento e mostra 4 cards", async ({ page }) => {
    await page.getByRole("button", { name: /engajamento/i }).click();
    await expect(page.getByText("Comunidade Ativa")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Streaks Ativos")).toBeVisible();
    await expect(page.getByText("Em Risco")).toBeVisible();
    await expect(page.getByText("Conquistas")).toBeVisible();
  });

  test("tabela Top Streaks ou estado vazio renderiza", async ({ page }) => {
    await page.getByRole("button", { name: /engajamento/i }).click();
    const card = page.getByText("Top Streaks").locator("..");
    await expect(card).toBeVisible();
  });
});
```

- [ ] **Step 2:** Commit:
```bash
git add tests/e2e/engagement-admin.spec.ts
git commit -m "test(e2e): admin aba Engajamento"
```

**Nota:** NÃO executar localmente. E2E roda pós-deploy em prod.

---

## Task 5: Validação final

- [ ] **Step 1:** Run `npm run test:unit` — 26+ passed.
- [ ] **Step 2:** Run `npx tsc --noEmit` — sem erros.
- [ ] **Step 3:** Run `npm run lint` — sem erros novos.
- [ ] **Step 4:** Run `git status` — working tree clean.
- [ ] **Step 5:** Run `git diff <commit-before-plan> HEAD -- src/app/globals.css` — **deve ser vazio** (prova de que nenhuma classe CSS nova entrou).

---

## Resumo dos commits esperados

1. `feat(engagement): util computeAdminInsights (admin-only insights)`
2. `feat(api): endpoint GET /api/admin/engagement/insights`
3. `feat(admin): aba Engajamento com insights pastorais`
4. `test(e2e): admin aba Engajamento`

Total: 4 commits atômicos.
