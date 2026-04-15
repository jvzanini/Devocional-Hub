# Minhas Conquistas no Perfil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`. Zero CSS novo.

**Goal:** Seção "Minha Jornada" em `/profile` com histórico completo de engajamento do próprio usuário.

**Spec:** `docs/superpowers/specs/2026-04-15-minhas-conquistas-perfil-design.md`

---

## Mapa de Arquivos

**Criar:**
- `src/app/api/me/journey/route.ts` — endpoint auth-only.
- `src/features/engagement/components/MyJourneySection.tsx` — Client.
- `tests/e2e/my-journey-profile.spec.ts`

**Modificar:**
- `src/features/engagement/lib/user-journey.ts` — adicionar `fetchUserJourney(userId)`.
- `src/app/api/admin/users/[id]/journey/route.ts` — delegar para `fetchUserJourney`.
- `src/app/(dashboard)/profile/page.tsx` — integrar `<MyJourneySection />`.

---

## Task 1: Helper compartilhado `fetchUserJourney`

**Files:**
- Modify: `src/features/engagement/lib/user-journey.ts`
- Modify: `src/app/api/admin/users/[id]/journey/route.ts`

- [ ] **Step 1:** Em `user-journey.ts`, adicionar após o `computeUserJourney`:

```ts
import { prisma } from "@/shared/lib/db";
import { PipelineStatus } from "@prisma/client";

export async function fetchUserJourney(userId: string): Promise<UserJourney | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true, name: true, email: true,
      church: true, team: true, subTeam: true, createdAt: true,
    },
  });
  if (!user) return null;

  const [attendances, sessions, unlocks] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId },
      select: { sessionId: true, joinTime: true, duration: true },
    }),
    prisma.session.findMany({
      where: { status: PipelineStatus.COMPLETED, date: { gte: user.createdAt } },
      select: { id: true, status: true, chapterRef: true, date: true },
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { userId: true, key: true, unlockedAt: true },
    }),
  ]);

  return computeUserJourney(
    { ...user, whatsapp: null },
    sessions.map((s) => ({ ...s, status: s.status as string })),
    attendances,
    unlocks,
  );
}
```

- [ ] **Step 2:** Refatorar `src/app/api/admin/users/[id]/journey/route.ts` para chamar `fetchUserJourney`:

```ts
import { NextResponse } from "next/server";
import { requireRole } from "@/features/permissions/lib/permission-guard";
import { fetchUserJourney } from "@/features/engagement/lib/user-journey";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("ADMIN");
  if (!guard.authorized) return guard.response;

  const { id } = await params;
  const journey = await fetchUserJourney(id);
  if (!journey) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(journey, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
```

- [ ] **Step 3:** `npm run test:unit` — 51+ passed (sanity check — não mudou util puro).

- [ ] **Step 4:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 5:** Commit:
```bash
git add src/features/engagement/lib/user-journey.ts "src/app/api/admin/users/[id]/journey/route.ts"
git commit -m "refactor(engagement): fetchUserJourney compartilhado entre rotas"
```

---

## Task 2: Endpoint `/api/me/journey`

**Files:** Create `src/app/api/me/journey/route.ts`

- [ ] **Step 1:** Criar:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { fetchUserJourney } from "@/features/engagement/lib/user-journey";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const journey = await fetchUserJourney(userId);
  if (!journey) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(journey, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
```

- [ ] **Step 2:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 3:** Commit:
```bash
git add src/app/api/me/journey/route.ts
git commit -m "feat(api): endpoint GET /api/me/journey (auth-only)"
```

---

## Task 3: Component `MyJourneySection`

**Files:** Create `src/features/engagement/components/MyJourneySection.tsx`

- [ ] **Step 1:** Criar:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { UserJourney } from "../lib/user-journey";
import { BadgeIcon } from "./BadgeIcon";
import { timeAgoPtBR } from "../lib/time-utils";

export function MyJourneySection() {
  const [data, setData] = useState<UserJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/journey")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((json: UserJourney) => setData(json))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <section className="card" aria-label="Minha jornada" style={{ padding: 24, marginTop: 24 }}>
      <div className="section-title">Minha Jornada</div>
      <p style={{ color: "var(--text-muted)", margin: 0 }}>Carregando…</p>
    </section>
  );
  if (error) return (
    <section className="card" aria-label="Minha jornada" style={{ padding: 24, marginTop: 24 }}>
      <div className="section-title">Minha Jornada</div>
      <p style={{ color: "var(--accent)", margin: 0 }}>Erro: {error}</p>
    </section>
  );
  if (!data) return null;

  const totalAttended = data.stats.totalAttended;

  if (totalAttended === 0) {
    return (
      <section className="card" aria-label="Minha jornada" style={{ padding: 24, marginTop: 24 }}>
        <div className="section-title">Minha Jornada</div>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Sua jornada começa no próximo devocional. 🌱
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Minha jornada" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="section-title" style={{ marginBottom: 0 }}>Minha Jornada</div>

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
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{totalAttended}</div>
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
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Ainda não desbloqueou conquistas. Continue firme!</p>
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

      {/* Timeline */}
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

      {/* Livros */}
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
    </section>
  );
}
```

- [ ] **Step 2:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 3:** Commit:
```bash
git add src/features/engagement/components/MyJourneySection.tsx
git commit -m "feat(engagement): MyJourneySection para a pagina de perfil"
```

---

## Task 4: Integrar em `/profile`

**File:** Modify `src/app/(dashboard)/profile/page.tsx`

- [ ] **Step 1:** Ler o arquivo. Identificar onde a última seção do perfil termina (geralmente antes do fechamento do wrapper principal).

- [ ] **Step 2:** Adicionar import no topo:
```ts
import { MyJourneySection } from "@/features/engagement/components/MyJourneySection";
```

- [ ] **Step 3:** Adicionar `<MyJourneySection />` ao final do JSX da página, após as outras seções e antes do fechamento do wrapper principal.

- [ ] **Step 4:** `git diff --name-only HEAD` — deve listar apenas `profile/page.tsx`.

- [ ] **Step 5:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 6:** Commit:
```bash
git add "src/app/(dashboard)/profile/page.tsx"
git commit -m "feat(profile): integra secao Minha Jornada"
```

---

## Task 5: E2E Playwright

**File:** Create `tests/e2e/my-journey-profile.spec.ts`

- [ ] **Step 1:** Criar:

```ts
import { test, expect } from "@playwright/test";

test.describe("Perfil — Minha Jornada", () => {
  test("seção Minha Jornada visível no /profile", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.ADMIN_EMAIL || "");
    await page.fill("#password", process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
    await page.goto("/profile");

    await expect(page.getByText("Minha Jornada")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Streak atual")).toBeVisible();
    await expect(page.getByText("Conquistas")).toBeVisible();
    await expect(page.getByText("Presenças recentes")).toBeVisible();
  });

  test("endpoint /api/me/journey retorna 401 sem sessão", async ({ browser }) => {
    const ctx = await browser.newContext();
    const response = await ctx.request.get("/api/me/journey");
    expect(response.status()).toBe(401);
    await ctx.close();
  });
});
```

- [ ] **Step 2:** Commit:
```bash
git add tests/e2e/my-journey-profile.spec.ts
git commit -m "test(e2e): perfil minha jornada + guard 401"
```

---

## Task 6: Validação

- [ ] `npm run test:unit` → 51+ passed.
- [ ] `npx tsc --noEmit` → limpo.
- [ ] `npm run lint` → sem erros novos.
- [ ] `git diff <sha-pre-feature> HEAD -- src/app/globals.css` → vazio.

---

## Commits esperados

1. `refactor(engagement): fetchUserJourney compartilhado entre rotas`
2. `feat(api): endpoint GET /api/me/journey (auth-only)`
3. `feat(engagement): MyJourneySection para a pagina de perfil`
4. `feat(profile): integra secao Minha Jornada`
5. `test(e2e): perfil minha jornada + guard 401`

Total: 5 commits.
