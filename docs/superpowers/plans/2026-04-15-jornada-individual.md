# Jornada Individual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` (lei absoluta). UI reusando design system atual. Zero CSS novo em `globals.css`.

**Goal:** Admin abre modal com jornada de engajamento de um membro (stats, conquistas, timeline 20 presenças, livros participados).

**Architecture:** Util puro `computeUserJourney` (reusa `computeUserEngagementStats`) + endpoint admin `GET /api/admin/users/:id/journey` + modal client consumido na aba Usuários e tabelas de Engajamento.

**Tech stack:** Next.js 16, Prisma 5, Vitest. Sem deps novas.

**Spec:** `docs/superpowers/specs/2026-04-15-jornada-individual-design.md`

---

## Mapa de Arquivos

**Criar:**
- `src/features/engagement/lib/user-journey.ts`
- `src/features/engagement/lib/__tests__/user-journey.test.ts`
- `src/app/api/admin/users/[id]/journey/route.ts`
- `src/features/engagement/components/UserJourneyModal.tsx` (Client)
- `tests/e2e/user-journey.spec.ts`

**Modificar:**
- `src/app/(dashboard)/admin/page.tsx` — botão "Ver Jornada" na aba Usuários + nos links da aba Engajamento + integrar modal.

---

## Task 1: Util puro `computeUserJourney` (TDD)

**Files:**
- Create: `src/features/engagement/lib/user-journey.ts`
- Create: `src/features/engagement/lib/__tests__/user-journey.test.ts`

- [ ] **Step 1 (TDD):** Criar testes em `src/features/engagement/lib/__tests__/user-journey.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeUserJourney } from "../user-journey";
import type { UserLike, UnlockLike } from "../admin-insights";
import type { SessionLike } from "../user-stats";

const NOW = new Date("2026-04-15T12:00:00.000Z");

function user(overrides: Partial<UserLike> = {}): UserLike {
  return {
    id: "u1", name: "Maria", email: "maria@test.com",
    church: "IC", team: "A", subTeam: "1",
    whatsapp: null, createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}
function session(id: string, daysAgo: number, chapterRef = "Mateus 1"): SessionLike {
  return { id, status: "COMPLETED", chapterRef, date: new Date(NOW.getTime() - daysAgo * 86400_000) };
}
function att(sessionId: string, daysAgo: number, durationSec = 3600) {
  return {
    userId: "u1", sessionId,
    joinTime: new Date(NOW.getTime() - daysAgo * 86400_000),
    duration: durationSec,
  };
}
function unlock(key: string, daysAgo: number): UnlockLike {
  return { userId: "u1", key, unlockedAt: new Date(NOW.getTime() - daysAgo * 86400_000) };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

describe("computeUserJourney", () => {
  it("usuário novo sem presenças: stats zerados, listas vazias", () => {
    const j = computeUserJourney(user(), [], [], []);
    expect(j.stats.totalAttended).toBe(0);
    expect(j.unlockedAchievements).toEqual([]);
    expect(j.recentAttendances).toEqual([]);
    expect(j.booksParticipated).toEqual([]);
  });

  it("5 presenças e 2 conquistas: retorna todas, ordena por unlockedAt desc", () => {
    const sessions = [session("s1",30), session("s2",20), session("s3",15), session("s4",10), session("s5",5)];
    const atts = [att("s1",30), att("s2",20), att("s3",15), att("s4",10), att("s5",5)];
    const unlocks = [unlock("first_step",30), unlock("streak_3",15)];
    const j = computeUserJourney(user(), sessions, atts, unlocks);
    expect(j.stats.totalAttended).toBe(5);
    expect(j.unlockedAchievements).toHaveLength(2);
    expect(j.unlockedAchievements[0].key).toBe("streak_3");
    expect(j.unlockedAchievements[1].key).toBe("first_step");
    expect(j.recentAttendances).toHaveLength(5);
  });

  it("booksParticipated agrega por count desc", () => {
    const sessions = [
      session("s1", 30, "Mateus 1"),
      session("s2", 25, "Mateus 2"),
      session("s3", 20, "Marcos 1"),
      session("s4", 15, "Mateus 3"),
      session("s5", 10, "Marcos 2"),
    ];
    const atts = sessions.map((s, i) => att(s.id, 30 - i*5));
    const j = computeUserJourney(user(), sessions, atts, []);
    expect(j.booksParticipated[0]).toEqual({ name: "Mateus", count: 3 });
    expect(j.booksParticipated[1]).toEqual({ name: "Marcos", count: 2 });
  });

  it("recentAttendances corta em 20 quando há mais", () => {
    const sessions = Array.from({ length: 25 }, (_, i) => session(`s${i}`, 25 - i));
    const atts = sessions.map((s, i) => att(s.id, 25 - i));
    const j = computeUserJourney(user(), sessions, atts, []);
    expect(j.recentAttendances).toHaveLength(20);
  });

  it("recentAttendances ordenado por session.date desc", () => {
    const sessions = [session("a", 10), session("b", 2), session("c", 30)];
    const atts = [att("a",10), att("b",2), att("c",30)];
    const j = computeUserJourney(user(), sessions, atts, []);
    expect(j.recentAttendances[0].sessionId).toBe("b"); // mais recente (2d)
    expect(j.recentAttendances[1].sessionId).toBe("a");
    expect(j.recentAttendances[2].sessionId).toBe("c");
  });

  it("unlocks com key desconhecida são filtrados silenciosamente", () => {
    const unlocks = [unlock("first_step", 5), unlock("ghost_key_removed", 3)];
    const j = computeUserJourney(user(), [session("s1",5)], [att("s1",5)], unlocks);
    expect(j.unlockedAchievements).toHaveLength(1);
    expect(j.unlockedAchievements[0].key).toBe("first_step");
  });

  it("duração: 90s → 2min, 25s → 0min (Math.round)", () => {
    const sessions = [session("s1", 5), session("s2", 3)];
    const atts = [att("s1", 5, 90), att("s2", 3, 25)];
    const j = computeUserJourney(user(), sessions, atts, []);
    const s1 = j.recentAttendances.find((a) => a.sessionId === "s1");
    const s2 = j.recentAttendances.find((a) => a.sessionId === "s2");
    expect(s1?.durationMin).toBe(2);
    expect(s2?.durationMin).toBe(0);
  });

  it("user com church/team vazios: retorna strings vazias sem quebrar", () => {
    const u = user({ church: "", team: "", subTeam: "" });
    const j = computeUserJourney(u, [session("s1",5)], [att("s1",5)], []);
    expect(j.user.church).toBe("");
    expect(j.user.team).toBe("");
  });
});
```

- [ ] **Step 2:** Rodar — deve falhar (módulo inexistente).
  `npx vitest run src/features/engagement/lib/__tests__/user-journey.test.ts`

- [ ] **Step 3:** Criar `src/features/engagement/lib/user-journey.ts`:

```ts
import { computeUserEngagementStats, type SessionLike, type AttendanceLike } from "./user-stats";
import { ACHIEVEMENTS_VIEW } from "./achievements";
import type { UserLike, UnlockLike } from "./admin-insights";
import { extractBookName } from "@/shared/lib/bible-utils";
import type { IconId, UserEngagementStats } from "./types";

export interface JourneyAttendance {
  sessionId: string;
  joinTime: Date;
  duration: number; // segundos
}

export interface JourneyRecentAttendance {
  sessionId: string;
  date: string; // ISO
  chapterRef: string;
  durationMin: number;
}

export interface JourneyUnlockedAchievement {
  key: string;
  title: string;
  description: string;
  iconId: IconId;
  unlockedAt: string; // ISO
}

export interface JourneyBook { name: string; count: number; }

export interface UserJourney {
  user: {
    id: string; name: string; email: string;
    church: string; team: string; subTeam: string;
    createdAt: string;
  };
  stats: UserEngagementStats;
  unlockedAchievements: JourneyUnlockedAchievement[];
  recentAttendances: JourneyRecentAttendance[];
  booksParticipated: JourneyBook[];
  computedAt: string;
}

export function computeUserJourney(
  user: UserLike,
  sessions: SessionLike[],
  attendances: JourneyAttendance[],
  unlocks: UnlockLike[],
): UserJourney {
  const now = Date.now();

  const stats = computeUserEngagementStats(sessions, attendances);

  // Conquistas: correlacionar com catálogo, filtrar desconhecidas, ordenar desc
  const unlockedAchievements: JourneyUnlockedAchievement[] = unlocks
    .map((u) => {
      const cat = ACHIEVEMENTS_VIEW.find((a) => a.key === u.key);
      if (!cat) return null;
      return {
        key: cat.key,
        title: cat.title,
        description: cat.description,
        iconId: cat.iconId,
        unlockedAt: u.unlockedAt.toISOString(),
      };
    })
    .filter((x): x is JourneyUnlockedAchievement => x !== null)
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));

  // Recent attendances: ordenar primeiro (por session.date desc, joinTime desc como tiebreaker),
  // depois mapear com dados de session, top 20
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const sortedAtts = [...attendances]
    .filter((a) => sessionById.has(a.sessionId))
    .sort((a, b) => {
      const sa = sessionById.get(a.sessionId)!;
      const sb = sessionById.get(b.sessionId)!;
      return sb.date.getTime() - sa.date.getTime() || b.joinTime.getTime() - a.joinTime.getTime();
    });

  const recentAttendances: JourneyRecentAttendance[] = sortedAtts.slice(0, 20).map((a) => {
    const s = sessionById.get(a.sessionId)!;
    return {
      sessionId: a.sessionId,
      date: s.date.toISOString(),
      chapterRef: s.chapterRef ?? "",
      durationMin: Math.round(a.duration / 60),
    };
  });

  // Livros participados
  const attendedSessionIds = new Set(attendances.map((a) => a.sessionId));
  const bookCounts = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== "COMPLETED") continue;
    if (!attendedSessionIds.has(s.id)) continue;
    const book = extractBookName(s.chapterRef ?? "");
    bookCounts.set(book, (bookCounts.get(book) ?? 0) + 1);
  }
  const booksParticipated: JourneyBook[] = [...bookCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      church: user.church,
      team: user.team,
      subTeam: user.subTeam,
      createdAt: user.createdAt.toISOString(),
    },
    stats,
    unlockedAchievements,
    recentAttendances,
    booksParticipated,
    computedAt: new Date(now).toISOString(),
  };
}
```

- [ ] **Step 4:** `npx vitest run src/features/engagement/lib/__tests__/user-journey.test.ts` — 8 passed.

- [ ] **Step 5:** `npm run test:unit` — 34+ passed (26 anteriores + 8 novos).

- [ ] **Step 6:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 7:** Commit:
```bash
git add src/features/engagement/lib/user-journey.ts src/features/engagement/lib/__tests__/user-journey.test.ts
git commit -m "feat(engagement): util computeUserJourney (jornada individual)"
```

---

## Task 2: Endpoint `GET /api/admin/users/:id/journey`

**Files:** Create `src/app/api/admin/users/[id]/journey/route.ts`

- [ ] **Step 1:** Ler rota admin existente com param dinâmico para copiar o padrão. Referência canônica: `src/app/api/admin/users/[id]/zoom-identifiers/route.ts` (confirma `params: Promise<{ id: string }>` para Next.js 16). Nota: essa rota usa `isAdmin()` artesanal — **não copiar esse padrão**; usar `requireRole("ADMIN")` que é o guard canônico do projeto.

- [ ] **Step 2:** Criar:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";
import { computeUserJourney } from "@/features/engagement/lib/user-journey";
import { PipelineStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("ADMIN");
  if (!guard.authorized) return guard.response;

  const { id } = await params;

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, name: true, email: true,
      church: true, team: true, subTeam: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [attendances, sessions, unlocks] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId: id },
      select: { sessionId: true, joinTime: true, duration: true },
    }),
    prisma.session.findMany({
      where: { status: PipelineStatus.COMPLETED, date: { gte: user.createdAt } },
      select: { id: true, status: true, chapterRef: true, date: true },
    }),
    prisma.userAchievement.findMany({
      where: { userId: id },
      select: { userId: true, key: true, unlockedAt: true },
    }),
  ]);

  // `computeUserJourney` recebe `UserLike`; adicionamos whatsapp=null no shape (não usado mas satisfaz o tipo).
  const journey = computeUserJourney(
    { ...user, whatsapp: null },
    sessions.map((s) => ({ ...s, status: s.status as string })),
    attendances,
    unlocks,
  );

  return NextResponse.json(journey, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
```

- [ ] **Step 3:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 4:** Commit:
```bash
git add "src/app/api/admin/users/[id]/journey/route.ts"
git commit -m "feat(api): endpoint GET /api/admin/users/:id/journey"
```

---

## Task 3: Modal `UserJourneyModal` (Client)

**Files:** Create `src/features/engagement/components/UserJourneyModal.tsx`

Reusa modal pattern de `admin/page.tsx:1425` (fixed overlay + centralized container). Zero CSS novo.

- [ ] **Step 1:** Criar:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { UserJourney } from "../lib/user-journey";
import { BadgeIcon } from "./BadgeIcon";
import { timeAgoPtBR } from "../lib/time-utils";

interface Props { userId: string; onClose: () => void; }

export function UserJourneyModal({ userId, onClose }: Props) {
  const [data, setData] = useState<UserJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${encodeURIComponent(userId)}/journey`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((json: UserJourney) => setData(json))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Jornada do usuário"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: "var(--radius-xl)",
          maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto",
          padding: 24, border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data ? data.user.name : "Carregando…"}
            </div>
            {data && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {data.user.email} {data.user.church && `· ${data.user.church}`} {data.user.team && `· ${data.user.team}`}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: 8, padding: "6px 10px", cursor: "pointer",
              color: "var(--text)", fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {loading && <div style={{ color: "var(--text-muted)" }}>Carregando jornada…</div>}
        {error && <div style={{ color: "var(--accent)" }}>Erro: {error}</div>}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Stats */}
            <div className="stats-row" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <div className="stat-card">
                <div className="section-title">Streak atual</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{data.stats.currentStreak}</div>
              </div>
              <div className="stat-card">
                <div className="section-title">Melhor streak</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{data.stats.bestStreak}</div>
              </div>
              <div className="stat-card">
                <div className="section-title">Presenças</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{data.stats.totalAttended}</div>
              </div>
              <div className="stat-card">
                <div className="section-title">Frequência</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{Math.round(data.stats.frequencyPct * 100)}%</div>
              </div>
            </div>

            {/* Conquistas */}
            <div className="card" style={{ padding: 18 }}>
              <div className="section-title">Conquistas</div>
              {data.unlockedAchievements.length === 0 ? (
                <p style={{ color: "var(--text-muted)", margin: 0 }}>Ainda não desbloqueou conquistas.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.unlockedAchievements.map((a) => (
                    <li key={a.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ color: "var(--accent)" }}><BadgeIcon id={a.iconId} /></div>
                      <div style={{ flex: 1 }}>
                        <strong>{a.title}</strong>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.description}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{timeAgoPtBR(new Date(a.unlockedAt))}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Timeline de presenças */}
            <div className="card" style={{ padding: 18 }}>
              <div className="section-title">Presenças recentes</div>
              {data.recentAttendances.length === 0 ? (
                <p style={{ color: "var(--text-muted)", margin: 0 }}>Sem histórico de presença.</p>
              ) : (
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th scope="col">Data</th>
                      <th scope="col">Capítulo</th>
                      <th scope="col">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentAttendances.map((a) => (
                      <tr key={a.sessionId}>
                        <td>{new Date(a.date).toLocaleDateString("pt-BR")}</td>
                        <td>{a.chapterRef || "—"}</td>
                        <td>{a.durationMin} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Livros participados */}
            <div className="card" style={{ padding: 18 }}>
              <div className="section-title">Livros participados</div>
              {data.booksParticipated.length === 0 ? (
                <p style={{ color: "var(--text-muted)", margin: 0 }}>Sem histórico de presença.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.booksParticipated.map((b) => (
                    <li key={b.name} style={{
                      padding: "6px 12px", borderRadius: 999,
                      border: "1px solid var(--border)",
                      fontSize: 13, color: "var(--text)",
                    }}>
                      {b.name} <strong style={{ color: "var(--accent)" }}>· {b.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
              Atualizado {timeAgoPtBR(new Date(data.computedAt))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 3:** Commit:
```bash
git add src/features/engagement/components/UserJourneyModal.tsx
git commit -m "feat(engagement): UserJourneyModal client component"
```

---

## Task 4: Integrar modal no painel admin

**Files:** Modify `src/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1:** Ler a aba "Usuários" do arquivo e localizar a tabela/lista de usuários. Identificar o padrão de coluna de ações.

- [ ] **Step 2:** Adicionar imports no topo:
```ts
import { UserJourneyModal } from "@/features/engagement/components/UserJourneyModal";
```

- [ ] **Step 3:** Adicionar estado no componente principal do admin (junto dos outros `useState` — por volta da linha 117):
```ts
const [journeyUserId, setJourneyUserId] = useState<string | null>(null);
```

- [ ] **Step 4:** Na tabela da aba "Usuários", adicionar botão "Ver Jornada" em cada linha. Seguir o padrão dos botões existentes (ícone + texto, estilo `.btn-outline` ou similar). Ex:
```tsx
<button
  onClick={() => setJourneyUserId(u.id)}
  className="btn-outline"
  title="Ver jornada"
  style={{ padding: "4px 10px", fontSize: 13 }}
>
  Ver Jornada
</button>
```

- [ ] **Step 5:** No componente `EngagementTab` (criado na feature anterior), adicionar prop `onSelectUser: (id: string) => void` e tornar os nomes da tabela "Top Streaks" e "Em Risco" clicáveis. Assinatura: `function EngagementTab({ onSelectUser }: { onSelectUser: (id: string) => void })`. No JSX, atualizar:
```tsx
<td>
  <button
    onClick={() => onSelectUser(t.userId)}
    style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit", textAlign: "left" }}
  >
    {t.name}
  </button>
</td>
```
e o mesmo para a tabela "Em Risco" (`a.userId` / `a.name`). Onde `EngagementTab` é invocado (`{tab === "engagement" && <EngagementTab />}`), mudar para `{tab === "engagement" && <EngagementTab onSelectUser={setJourneyUserId} />}`.

**Padrão final (single source of truth):**
- `journeyUserId` mora no componente `AdminPage` (pai), único lugar de state.
- `EngagementTab` agora recebe prop: `function EngagementTab({ onSelectUser }: { onSelectUser: (id: string) => void })`.
- Aba Usuários usa `setJourneyUserId` direto (está no mesmo componente do state).
- Uma única instância de `<UserJourneyModal>` renderizada no final do JSX do `AdminPage` — jamais duplicar.

- [ ] **Step 6:** No final do JSX onde modais existentes são renderizados, adicionar:
```tsx
{journeyUserId && (
  <UserJourneyModal userId={journeyUserId} onClose={() => setJourneyUserId(null)} />
)}
```

- [ ] **Step 7:** Garantir que `globals.css` NÃO foi tocado:
  `git diff --name-only HEAD` deve listar apenas `src/app/(dashboard)/admin/page.tsx`.

- [ ] **Step 8:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 9:** Commit:
```bash
git add "src/app/(dashboard)/admin/page.tsx"
git commit -m "feat(admin): botao Ver Jornada na aba Usuarios e Engajamento"
```

---

## Task 5: E2E Playwright (rodar pós-deploy)

**Files:** Create `tests/e2e/user-journey.spec.ts`

- [ ] **Step 1:** Criar:

```ts
import { test, expect } from "@playwright/test";

test.describe("Admin — Jornada Individual", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.ADMIN_EMAIL || "");
    await page.fill("#password", process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
    await page.goto("/admin");
  });

  test("abre modal de jornada a partir da aba Usuários", async ({ page }) => {
    await page.getByRole("button", { name: "Usuários", exact: true }).click();
    await page.getByRole("button", { name: /ver jornada/i }).first().click();
    await expect(page.getByRole("dialog", { name: /jornada/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Conquistas")).toBeVisible();
  });

  test("fechar modal com botão X e com overlay", async ({ page }) => {
    await page.getByRole("button", { name: "Usuários", exact: true }).click();
    await page.getByRole("button", { name: /ver jornada/i }).first().click();
    const dialog = page.getByRole("dialog", { name: /jornada/i });
    await expect(dialog).toBeVisible();

    // Fechar via botão X
    await page.getByRole("button", { name: "Fechar" }).click();
    await expect(dialog).not.toBeVisible();

    // Reabrir e fechar via overlay (click fora)
    await page.getByRole("button", { name: /ver jornada/i }).first().click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(dialog).not.toBeVisible();
  });
});
```

- [ ] **Step 2:** Commit:
```bash
git add tests/e2e/user-journey.spec.ts
git commit -m "test(e2e): admin jornada individual do usuario"
```

---

## Task 6: Validação final

- [ ] `npm run test:unit` → 34+ passed.
- [ ] `npx tsc --noEmit` → sem erros.
- [ ] `npm run lint` → sem erros novos.
- [ ] `git diff <commit-pre-feature> HEAD -- src/app/globals.css` → vazio.
- [ ] `git status` → clean.

---

## Commits esperados

1. `feat(engagement): util computeUserJourney (jornada individual)`
2. `feat(api): endpoint GET /api/admin/users/:id/journey`
3. `feat(engagement): UserJourneyModal client component`
4. `feat(admin): botao Ver Jornada na aba Usuarios e Engajamento`
5. `test(e2e): admin jornada individual do usuario`

Total: 5 commits.
