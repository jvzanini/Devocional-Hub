# Engajamento & Streaks v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` para implementar este plan task-a-task (lei absoluta do projeto — ver CLAUDE.md §Leis Absolutas). UI sempre via `ui-ux-pro-max`. Steps usam checkbox (`- [ ]`) para tracking.

**Goal:** Entregar o sistema "Sua Jornada" — widget no dashboard com streak atual, melhor streak, conquistas persistentes e toast de celebração — derivando tudo de `Attendance` sem dependências externas.

**Architecture:** Feature isolada em `src/features/engagement/` (lib + components). Estatísticas computadas em util puro + persistência idempotente em nova tabela `UserAchievement`. Dashboard SSR chama orquestrador que reaproveita `sessions` já carregadas (zero double-fetch). Toasts no client com dedupe via `localStorage`. Feature flag via `AppSetting` com default permissivo.

**Tech Stack:** Next.js 16 App Router, Prisma 5 + PostgreSQL, Vitest (novo devDep) + tsx (já existe), Playwright (já existe), React 19 Server Components + Client Components, Tailwind v4 (apenas via `globals.css` — nunca `@theme inline`).

**Spec:** `docs/superpowers/specs/2026-04-15-engajamento-streaks-design.md`

---

## Mapa de Arquivos

**Criar:**
- `src/shared/lib/bible-utils.ts` — `extractBookName(chapterRef)` reutilizado.
- `src/features/engagement/lib/types.ts` — tipos `UserEngagementStats`, `Achievement`, retorno do orquestrador.
- `src/features/engagement/lib/achievements.ts` — catálogo fixo + `evaluateAchievements(stats)`.
- `src/features/engagement/lib/user-stats.ts` — `computeUserEngagementStats(userId, sessions, attendances)` puro.
- `src/features/engagement/lib/achievement-sync.ts` — `persistUnlocks(userId, keys)` idempotente.
- `src/features/engagement/lib/feature-flag.ts` — `getEngagementEnabled()` async.
- `src/features/engagement/lib/time-utils.ts` — `toBrazilDate`, `timeAgoPtBR`.
- `src/features/engagement/lib/orchestrator.ts` — `getUserEngagementStats(userId, sessions)`.
- `src/features/engagement/components/JourneyCard.tsx` — Server Component principal.
- `src/features/engagement/components/BadgeGrid.tsx` — Client Component (hover/tooltip).
- `src/features/engagement/components/AchievementToast.tsx` — Client Component (localStorage dedupe).
- `src/features/engagement/lib/__tests__/user-stats.test.ts` — testes unit Vitest.
- `src/features/engagement/lib/__tests__/achievements.test.ts` — testes unit Vitest.
- `tests/e2e/engagement.spec.ts` — E2E Playwright.
- `vitest.config.ts` — configuração do test runner.

**Modificar:**
- `prisma/schema.prisma` — adiciona `UserAchievement` + relation em `User`.
- `package.json` — adiciona `vitest` devDep + script `test:unit`.
- `src/app/(dashboard)/page.tsx` — remove `extractBookName` local (importa de `bible-utils`), integra `JourneyCard` + `AchievementToast`.
- `src/app/(dashboard)/books/page.tsx` — importa `extractBookName` de `bible-utils`.
- `src/app/globals.css` — classes novas (`.journey-card`, `.badge-circle`, `.badge-locked`, `.achievement-toast` + `@keyframes` glow).
- `src/app/(dashboard)/admin/page.tsx` — expõe toggle `engagementEnabled` (pequeno ajuste na aba Configurações/Settings).
- `CLAUDE.md` — documenta feature + convenção da flag no final.

---

## Task 0: Refactor `extractBookName` para módulo compartilhado

**Files:**
- Create: `src/shared/lib/bible-utils.ts`
- Modify: `src/app/(dashboard)/page.tsx:8-13,130`
- Modify: `src/app/(dashboard)/books/page.tsx:7-12,46`

- [ ] **Step 1: Criar o módulo compartilhado**

Conteúdo de `src/shared/lib/bible-utils.ts`:

```ts
export function extractBookName(chapterRef: string): string {
  if (!chapterRef) return "Outros";
  const match = chapterRef.match(/^(\d?\s?[A-Za-zÀ-ú]+)/);
  if (match) return match[1].trim();
  return chapterRef.split(" ")[0] || "Outros";
}
```

- [ ] **Step 2: Atualizar `dashboard/page.tsx`**

Remover a função local (linhas 8–13). Adicionar import no topo:

```ts
import { extractBookName } from "@/shared/lib/bible-utils";
```

A chamada na linha 130 continua idêntica.

- [ ] **Step 3: Atualizar `books/page.tsx`**

Remover a função local (linhas 7–12). Adicionar import no topo:

```ts
import { extractBookName } from "@/shared/lib/bible-utils";
```

A chamada na linha 46 continua idêntica.

- [ ] **Step 4: Verificar nenhum outro consumidor existe**

Run: `grep -rn "function extractBookName" src`
Expected: nenhum resultado (só as chamadas a `extractBookName(...)`).

- [ ] **Step 5: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/bible-utils.ts src/app/\(dashboard\)/page.tsx src/app/\(dashboard\)/books/page.tsx
git commit -m "refactor(shared): extrair extractBookName para bible-utils"
```

---

## Task 1: Adicionar Vitest ao projeto

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Instalar vitest**

Run: `npm install --save-dev --legacy-peer-deps vitest@^2`
Expected: `vitest` adicionado a `devDependencies` (nota: `tsx` já existe).

- [ ] **Step 2: Adicionar script `test:unit`**

Editar `package.json` — adicionar dentro de `scripts`:

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

- [ ] **Step 3: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 4: Confirmar que vitest NÃO vaza para runtime Docker**

Run: `grep -E "COPY.*vitest" Dockerfile`
Expected: sem resultado. Dockerfile copia apenas node_modules selecionados para o stage `runner` — vitest fica só no `deps`/`builder` e não é copiado.

- [ ] **Step 5: Smoke test**

Run: `npx vitest run --passWithNoTests`
Expected: exit 0, "No test files found" ou similar.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(test): adiciona vitest como unit test runner"
```

---

## Task 2: Schema Prisma — `UserAchievement`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar relação em `User`**

Localizar o bloco `model User { ... }` (linhas 12–32 atualmente) e adicionar após `passwordResets PasswordResetToken[]`:

```prisma
  achievements    UserAchievement[]
```

- [ ] **Step 2: Adicionar o modelo `UserAchievement`**

Imediatamente após o `model User`:

```prisma
model UserAchievement {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  key        String
  unlockedAt DateTime @default(now())

  @@unique([userId, key])
  @@index([userId])
  @@index([userId, unlockedAt])
}
```

- [ ] **Step 3: Validar schema**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" sem erros.

- [ ] **Step 4: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros; tipo `UserAchievement` disponível via `@prisma/client`.

- [ ] **Step 5: Nota sobre `prisma db push` + rollback**

Run (apenas informacional): `echo "db push roda no docker-entrypoint.sh com --skip-generate; nada a fazer localmente"`
Expected: nada — a migração será aplicada automaticamente no deploy (CLAUDE.md §Gotchas).

**Rollback manual (se necessário):** como é ADD TABLE only, rollback é trivial via `psql` no container PostgreSQL:
```sql
DROP TABLE "UserAchievement";
```
App continua operacional mesmo com a tabela ausente graças ao try/catch na Task 12. Feature apenas desaparece do dashboard.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): adiciona UserAchievement para conquistas por usuario"
```

---

## Task 3: Tipos e catálogo de conquistas

**Files:**
- Create: `src/features/engagement/lib/types.ts`
- Create: `src/features/engagement/lib/achievements.ts`
- Create: `src/features/engagement/lib/__tests__/achievements.test.ts`

- [ ] **Step 1: Criar `types.ts`**

```ts
export interface UserEngagementStats {
  totalAttended: number;
  totalSessionsCompleted: number;
  frequencyPct: number;            // 0..1
  currentStreak: number;
  bestStreak: number;
  lastAttendedAt: Date | null;
  booksReadCount: number;
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  iconId: IconId;
  criterion: (s: UserEngagementStats) => boolean;  // usada APENAS no server; nunca atravessar fronteira Client.
}

/** Subset seguro de Achievement para atravessar fronteira Server→Client (sem função). */
export interface AchievementView {
  key: string;
  title: string;
  description: string;
  iconId: IconId;
}

export type IconId =
  | "footprints"
  | "flame3"
  | "flame7"
  | "flame15"
  | "medal10"
  | "medal30"
  | "bookOpen";

export interface EngagementResult {
  stats: UserEngagementStats;
  allUnlocked: { key: string; unlockedAt: Date }[];
  newlyUnlockedKeys: string[];
  silent: boolean;
}
```

- [ ] **Step 2: Criar `achievements.ts` (catálogo + avaliador)**

```ts
import type { Achievement, UserEngagementStats } from "./types";

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: "first_step",
    title: "Primeiro Passo",
    description: "Presente em seu primeiro devocional.",
    iconId: "footprints",
    criterion: (s) => s.totalAttended >= 1,
  },
  {
    key: "streak_3",
    title: "Três em Sequência",
    description: "3 devocionais consecutivos.",
    iconId: "flame3",
    criterion: (s) => s.bestStreak >= 3,
  },
  {
    key: "streak_7",
    title: "Semana Fiel",
    description: "7 devocionais consecutivos.",
    iconId: "flame7",
    criterion: (s) => s.bestStreak >= 7,
  },
  {
    key: "streak_15",
    title: "Constância",
    description: "15 devocionais consecutivos.",
    iconId: "flame15",
    criterion: (s) => s.bestStreak >= 15,
  },
  {
    key: "faithful_10",
    title: "Presente 10x",
    description: "10 devocionais no total.",
    iconId: "medal10",
    criterion: (s) => s.totalAttended >= 10,
  },
  {
    key: "faithful_30",
    title: "Presente 30x",
    description: "30 devocionais no total.",
    iconId: "medal30",
    criterion: (s) => s.totalAttended >= 30,
  },
  {
    key: "book_explorer",
    title: "Explorador da Palavra",
    description: "Participou de devocionais de 5 livros diferentes.",
    iconId: "bookOpen",
    criterion: (s) => s.booksReadCount >= 5,
  },
];

export function evaluateAchievements(stats: UserEngagementStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.criterion(stats)).map((a) => a.key);
}

/** Serializável para Client Components — remove `criterion`. */
export const ACHIEVEMENTS_VIEW: import("./types").AchievementView[] = ACHIEVEMENTS.map(({ criterion, ...rest }) => rest);
```

- [ ] **Step 3: Escrever testes primeiro (TDD) — `__tests__/achievements.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { evaluateAchievements, ACHIEVEMENTS } from "../achievements";
import type { UserEngagementStats } from "../types";

function baseStats(overrides: Partial<UserEngagementStats> = {}): UserEngagementStats {
  return {
    totalAttended: 0,
    totalSessionsCompleted: 0,
    frequencyPct: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastAttendedAt: null,
    booksReadCount: 0,
    ...overrides,
  };
}

describe("evaluateAchievements", () => {
  it("retorna vazio para usuário sem atividade", () => {
    expect(evaluateAchievements(baseStats())).toEqual([]);
  });

  it("desbloqueia first_step com 1 presença", () => {
    expect(evaluateAchievements(baseStats({ totalAttended: 1 }))).toContain("first_step");
  });

  it("desbloqueia streak_3 por bestStreak, não currentStreak", () => {
    const stats = baseStats({ bestStreak: 3, currentStreak: 0 });
    expect(evaluateAchievements(stats)).toContain("streak_3");
  });

  it("desbloqueia streak_7 e streak_3 simultaneamente em bestStreak=7", () => {
    const keys = evaluateAchievements(baseStats({ bestStreak: 7 }));
    expect(keys).toContain("streak_3");
    expect(keys).toContain("streak_7");
  });

  it("desbloqueia book_explorer com 5+ livros", () => {
    expect(evaluateAchievements(baseStats({ booksReadCount: 5 }))).toContain("book_explorer");
  });

  it("todas as keys do catálogo são únicas", () => {
    const keys = ACHIEVEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 4: Rodar testes — devem passar**

Run: `npx vitest run src/features/engagement/lib/__tests__/achievements.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/features/engagement
git commit -m "feat(engagement): catalogo de conquistas e avaliador puro"
```

---

## Task 4: Util de estatísticas — `user-stats.ts`

**Files:**
- Create: `src/features/engagement/lib/user-stats.ts`
- Create: `src/features/engagement/lib/__tests__/user-stats.test.ts`

**Regra:** função **pura** (sem I/O). Recebe dados já carregados.

- [ ] **Step 1: Escrever os testes primeiro (TDD)**

`src/features/engagement/lib/__tests__/user-stats.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeUserEngagementStats } from "../user-stats";
import type { SessionLike, AttendanceLike } from "../user-stats";

function session(id: string, daysAgo: number, status: "COMPLETED" | "PENDING" = "COMPLETED", chapterRef = "Mateus 1"): SessionLike {
  return { id, status, chapterRef, date: new Date(Date.now() - daysAgo * 86400_000) };
}
function att(sessionId: string, joinDaysAgo: number): AttendanceLike {
  return { sessionId, joinTime: new Date(Date.now() - joinDaysAgo * 86400_000) };
}

describe("computeUserEngagementStats", () => {
  it("zero tudo quando não há sessões nem presenças", () => {
    const s = computeUserEngagementStats([], []);
    expect(s.totalAttended).toBe(0);
    expect(s.bestStreak).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(s.frequencyPct).toBe(0);
    expect(s.booksReadCount).toBe(0);
  });

  it("ignora sessões não-COMPLETED", () => {
    const s = computeUserEngagementStats(
      [session("a", 2, "PENDING"), session("b", 1, "COMPLETED")],
      [att("a", 2)]
    );
    expect(s.totalSessionsCompleted).toBe(1);
    expect(s.totalAttended).toBe(0);
  });

  it("currentStreak=N quando presente em N sessões finais consecutivas", () => {
    const sessions = [session("a", 10), session("b", 5), session("c", 1)];
    const atts = [att("a", 10), att("b", 5), att("c", 1)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.currentStreak).toBe(3);
    expect(s.bestStreak).toBe(3);
  });

  it("currentStreak zera após miss > 36h da última COMPLETED", () => {
    // Última COMPLETED foi há 2 dias (>36h) e usuário faltou
    const sessions = [session("a", 10), session("b", 5), session("c", 2)];
    const atts = [att("a", 10), att("b", 5)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(2);
  });

  it("currentStreak mantém se última COMPLETED foi há <36h e usuário ainda não compareceu", () => {
    const sessions = [session("a", 10), session("b", 5), session("c", 1)]; // c há 1 dia = 24h <36h
    const atts = [att("a", 10), att("b", 5)]; // não veio em c
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.currentStreak).toBe(2);
  });

  it("currentStreak=0 quando última <36h mas penúltima também teve falta", () => {
    const sessions = [session("a", 10), session("b", 5), session("c", 1)];
    const atts = [att("a", 10)]; // só veio na primeira
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(1);
  });

  it("bestStreak > currentStreak em duas runs distintas", () => {
    const sessions = [
      session("a", 30), session("b", 25), session("c", 20), // run 1: 3
      session("d", 15),                                      // gap (miss)
      session("e", 10), session("f", 5),                     // run 2: 2
    ];
    const atts = [att("a", 30), att("b", 25), att("c", 20), att("e", 10), att("f", 5)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.bestStreak).toBe(3);
    expect(s.currentStreak).toBe(2);
  });

  it("frequencyPct em [0,1]", () => {
    const sessions = [session("a", 2), session("b", 1)];
    const atts = [att("a", 2)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.frequencyPct).toBeCloseTo(0.5);
  });

  it("booksReadCount conta livros distintos das sessões com presença", () => {
    const sessions = [
      session("a", 5, "COMPLETED", "Mateus 1"),
      session("b", 4, "COMPLETED", "Marcos 2"),
      session("c", 3, "COMPLETED", "Mateus 3"),
      session("d", 2, "COMPLETED", "Lucas 4"),
    ];
    const atts = [att("a", 5), att("b", 4), att("c", 3)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.booksReadCount).toBe(2); // Mateus + Marcos (não Lucas — sem presença)
  });

  it("lastAttendedAt = max(joinTime)", () => {
    const sessions = [session("a", 5), session("b", 1)];
    const atts = [att("a", 5), att("b", 1)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.lastAttendedAt?.getTime()).toBeCloseTo(atts[1].joinTime.getTime(), -2);
  });
});
```

- [ ] **Step 2: Rodar testes — devem FALHAR**

Run: `npx vitest run src/features/engagement/lib/__tests__/user-stats.test.ts`
Expected: erro de import ("cannot find module ../user-stats").

- [ ] **Step 3: Implementar `user-stats.ts`**

```ts
import type { UserEngagementStats } from "./types";
import { extractBookName } from "@/shared/lib/bible-utils";

export interface SessionLike {
  id: string;
  status: string;
  chapterRef: string | null;
  date: Date;
}

export interface AttendanceLike {
  sessionId: string;
  joinTime: Date;
}

const TOLERANCE_MS = 36 * 60 * 60 * 1000; // 36h

export function computeUserEngagementStats(
  sessions: SessionLike[],
  attendances: AttendanceLike[]
): UserEngagementStats {
  const completedAsc = [...sessions]
    .filter((s) => s.status === "COMPLETED")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const attendedSet = new Set(attendances.map((a) => a.sessionId));

  const totalSessionsCompleted = completedAsc.length;
  const totalAttended = attendances.length;
  const frequencyPct = totalSessionsCompleted > 0 ? totalAttended / totalSessionsCompleted : 0;

  // bestStreak: maior run contínua
  let bestStreak = 0;
  let runBest = 0;
  for (const s of completedAsc) {
    if (attendedSet.has(s.id)) {
      runBest++;
      if (runBest > bestStreak) bestStreak = runBest;
    } else {
      runBest = 0;
    }
  }

  // currentStreak: run terminando na última COMPLETED com tolerância de 36h
  let currentStreak = 0;
  if (completedAsc.length > 0) {
    const last = completedAsc[completedAsc.length - 1];
    const tailAttended = attendedSet.has(last.id);
    const ageMs = Date.now() - last.date.getTime();
    const effective = tailAttended
      ? completedAsc
      : ageMs < TOLERANCE_MS
      ? completedAsc.slice(0, -1) // ignora a última sessão "em tolerância"
      : [];
    let run = 0;
    for (let i = effective.length - 1; i >= 0; i--) {
      if (attendedSet.has(effective[i].id)) run++;
      else break;
    }
    currentStreak = run;
  }

  const attendedCompletedIds = new Set(
    completedAsc.filter((s) => attendedSet.has(s.id)).map((s) => s.id)
  );
  const books = new Set<string>();
  for (const s of completedAsc) {
    if (attendedCompletedIds.has(s.id)) {
      books.add(extractBookName(s.chapterRef || ""));
    }
  }
  const booksReadCount = books.size;

  const lastAttendedAt =
    attendances.length > 0
      ? new Date(Math.max(...attendances.map((a) => a.joinTime.getTime())))
      : null;

  return {
    totalAttended,
    totalSessionsCompleted,
    frequencyPct,
    currentStreak,
    bestStreak,
    lastAttendedAt,
    booksReadCount,
  };
}
```

- [ ] **Step 4: Rodar testes — devem PASSAR**

Run: `npx vitest run src/features/engagement/lib/__tests__/user-stats.test.ts`
Expected: 10 passed.

- [ ] **Step 5: Rodar todos os unit tests**

Run: `npm run test:unit`
Expected: 16+ passed (incluindo achievements.test.ts).

- [ ] **Step 6: Commit**

```bash
git add src/features/engagement
git commit -m "feat(engagement): computeUserEngagementStats com tolerancia 36h"
```

---

## Task 5: Feature flag + time utils

**Files:**
- Create: `src/features/engagement/lib/feature-flag.ts`
- Create: `src/features/engagement/lib/time-utils.ts`

- [ ] **Step 1: Criar `feature-flag.ts`**

```ts
import { prisma } from "@/shared/lib/db";

export async function getEngagementEnabled(): Promise<boolean> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: "engagementEnabled" } });
    if (!row) return true; // default: habilitado (linha ausente)
    return row.value !== "false";
  } catch {
    return true; // fail-safe
  }
}
```

- [ ] **Step 2: Criar `time-utils.ts`**

```ts
const TZ = "America/Sao_Paulo";

export function toBrazilDate(date: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date); // YYYY-MM-DD
}

export function timeAgoPtBR(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "agora";
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "há 1 hora" : `há ${hr} horas`;
  const day = Math.floor(hr / 24);
  if (day < 30) return day === 1 ? "há 1 dia" : `há ${day} dias`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return mo === 1 ? "há 1 mês" : `há ${mo} meses`;
  const yr = Math.floor(mo / 12);
  return yr === 1 ? "há 1 ano" : `há ${yr} anos`;
}
```

- [ ] **Step 3: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/features/engagement/lib/feature-flag.ts src/features/engagement/lib/time-utils.ts
git commit -m "feat(engagement): feature flag e utilitarios de tempo (TZ Brasil)"
```

---

## Task 6: Sync de conquistas (`achievement-sync.ts`)

**Files:**
- Create: `src/features/engagement/lib/achievement-sync.ts`

- [ ] **Step 1: Criar `achievement-sync.ts`**

```ts
import { prisma } from "@/shared/lib/db";

export interface ExistingUnlock {
  key: string;
  unlockedAt: Date;
}

/**
 * Persiste as conquistas desbloqueadas de forma idempotente.
 * - `existingBefore`: snapshot das conquistas já desbloqueadas (injetado pelo orquestrador
 *   para evitar double-fetch). Se omitido, busca aqui.
 * - Usa `createMany({ skipDuplicates: true })` para evitar race em uma única query.
 * - Após insert, refaz `findMany` para obter `unlockedAt` oficial e computa
 *   `newlyUnlockedKeys` como diff entre "depois" e "antes" — robusto a race real.
 */
export async function persistUnlocks(
  userId: string,
  evaluatedKeys: string[],
  existingBefore?: ExistingUnlock[]
): Promise<{ allUnlocked: ExistingUnlock[]; newlyUnlockedKeys: string[] }> {
  const before =
    existingBefore ??
    (await prisma.userAchievement.findMany({
      where: { userId },
      select: { key: true, unlockedAt: true },
    }));
  const beforeKeys = new Set(before.map((e) => e.key));
  const toCreate = evaluatedKeys.filter((k) => !beforeKeys.has(k));

  if (toCreate.length > 0) {
    await prisma.userAchievement.createMany({
      data: toCreate.map((key) => ({ userId, key })),
      skipDuplicates: true,
    });
  }

  const after = await prisma.userAchievement.findMany({
    where: { userId },
    select: { key: true, unlockedAt: true },
  });

  const newlyUnlockedKeys = after.filter((a) => !beforeKeys.has(a.key)).map((a) => a.key);

  return {
    allUnlocked: after,
    newlyUnlockedKeys,
  };
}
```

- [ ] **Step 2: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (o unique composite `userId_key` é gerado pelo Prisma).

- [ ] **Step 3: Commit**

```bash
git add src/features/engagement/lib/achievement-sync.ts
git commit -m "feat(engagement): persistencia idempotente de conquistas"
```

---

## Task 7: Orquestrador (`orchestrator.ts`)

**Files:**
- Create: `src/features/engagement/lib/orchestrator.ts`

- [ ] **Step 1: Criar `orchestrator.ts`**

```ts
import { prisma } from "@/shared/lib/db";
import { computeUserEngagementStats, type SessionLike } from "./user-stats";
import { evaluateAchievements } from "./achievements";
import { persistUnlocks } from "./achievement-sync";
import type { EngagementResult } from "./types";

/**
 * Orquestra cálculo de stats + persistência de conquistas.
 * Recebe sessões já carregadas (single-fetch) e carrega apenas `Attendance` do usuário.
 * Regra de segurança: userId sempre vem de session.user.id server-side.
 */
export async function getUserEngagementStats(
  userId: string,
  sessionsAlreadyLoaded: SessionLike[]
): Promise<EngagementResult> {
  // Duas queries paralelas: attendance + snapshot de conquistas
  const [attendances, existingBefore] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId },
      select: { sessionId: true, joinTime: true },
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { key: true, unlockedAt: true },
    }),
  ]);

  const stats = computeUserEngagementStats(sessionsAlreadyLoaded, attendances);
  const hasPreExisting = existingBefore.length > 0;

  const evaluated = evaluateAchievements(stats);
  const { allUnlocked, newlyUnlockedKeys } = await persistUnlocks(userId, evaluated, existingBefore);

  // Backfill silencioso: usuário antigo (sem UserAchievement prévio) com histórico (>=2 presenças)
  const silent = !hasPreExisting && stats.totalAttended >= 2;

  return {
    stats,
    allUnlocked,
    newlyUnlockedKeys: silent ? [] : newlyUnlockedKeys,
    silent,
  };
}
```

- [ ] **Step 2: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/features/engagement/lib/orchestrator.ts
git commit -m "feat(engagement): orquestrador com backfill silencioso"
```

---

## Task 8: Componentes visuais — CSS base

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Adicionar classes novas no final de `globals.css`**

Adicionar ao final do arquivo (antes de quaisquer `@media` finais ou no final absoluto):

```css
/* ─── Engagement (Sua Jornada) ─── */
.journey-card {
  background-color: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 24px;
  margin-bottom: 24px;
}

.journey-card__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

.journey-card__stats {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.journey-card__stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: var(--text);
}

.journey-card__stat strong {
  font-size: 24px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.journey-card__progress {
  margin-bottom: 18px;
}

.journey-card__progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.badge-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
}

.badge-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  background: linear-gradient(135deg, var(--surface), color-mix(in srgb, var(--accent) 14%, var(--surface)));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  position: relative;
  transition: transform 0.2s;
}

.badge-circle:hover {
  transform: scale(1.08);
}

.badge-locked {
  opacity: 0.4;
  border-color: var(--border);
  background: var(--surface);
  color: var(--text-muted);
}

.badge-locked::after {
  content: "🔒";
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 12px;
  background: var(--surface);
  border-radius: 50%;
  padding: 2px;
  line-height: 1;
}

.badge-recent {
  animation: badgeGlow 2s ease-out 1;
}

@keyframes badgeGlow {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 70%, transparent); }
  70% { box-shadow: 0 0 0 14px color-mix(in srgb, var(--accent) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

.achievement-toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  max-width: 320px;
  background: var(--surface);
  border: 1.5px solid var(--accent);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  color: var(--text);
  font-size: 14px;
  z-index: 9998;
  animation: toastSlideUp 0.35s ease-out;
}

@keyframes toastSlideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@media (max-width: 480px) {
  .badge-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .journey-card__stat strong { font-size: 20px; }
  .achievement-toast { left: 12px; right: 12px; max-width: unset; }
}
```

- [ ] **Step 2: Validar build de CSS**

Run: `npm run lint -- --max-warnings=0` (lint básico do projeto) ou apenas `npx tsc --noEmit`.
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(engagement): estilos do widget Sua Jornada e toast"
```

---

## Task 9: Componente `JourneyCard` (Server)

**Files:**
- Create: `src/features/engagement/components/JourneyCard.tsx`
- Create: `src/features/engagement/components/BadgeIcon.tsx`

> **Nota:** UI deve passar por refinamento via skill `ui-ux-pro-max` — a implementação abaixo é o baseline funcional; o refinamento visual fica para uma sub-task após commit inicial.

- [ ] **Step 1: Criar `BadgeIcon.tsx` (Server — SVGs inline)**

```tsx
import type { IconId } from "../lib/types";

export function BadgeIcon({ id, size = 24 }: { id: IconId; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (id) {
    case "footprints":
      return (<svg {...common}><path d="M4 16c.5-2 2-3 4-3s3.5 1 4 3-1 4-3 4-4-2-5-4z"/><path d="M14 8c.5-2 2-3 4-3s3.5 1 4 3-1 4-3 4-4-2-5-4z"/></svg>);
    case "flame3":
    case "flame7":
    case "flame15":
      return (<svg {...common}><path d="M12 2s4 5 4 9a4 4 0 11-8 0c0-2 1-3 2-4 0 0-1 3 1 4 2 1 3-2 1-5-1-1-1-2 0-4z"/></svg>);
    case "medal10":
    case "medal30":
      return (<svg {...common}><circle cx="12" cy="14" r="6"/><path d="M8 14l-2 8 6-3 6 3-2-8"/><path d="M7 5h10l-2 4H9z"/></svg>);
    case "bookOpen":
      return (<svg {...common}><path d="M2 4h8a3 3 0 013 3v13a2 2 0 00-2-2H2V4z"/><path d="M22 4h-8a3 3 0 00-3 3v13a2 2 0 012-2h9V4z"/></svg>);
  }
}
```

- [ ] **Step 2: Criar `JourneyCard.tsx`**

```tsx
import type { UserEngagementStats } from "../lib/types";
import { ACHIEVEMENTS, ACHIEVEMENTS_VIEW } from "../lib/achievements";
import { BadgeGrid } from "./BadgeGrid";
import { timeAgoPtBR } from "../lib/time-utils";

interface Props {
  stats: UserEngagementStats;
  unlocked: { key: string; unlockedAt: Date }[];
}

export function JourneyCard({ stats, unlocked }: Props) {
  const unlockedKeys = new Set(unlocked.map((u) => u.key));
  const lastUnlock = unlocked.length > 0
    ? [...unlocked].sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())[0]
    : null;
  const lastAchievement = lastUnlock ? ACHIEVEMENTS.find((a) => a.key === lastUnlock.key) : null;

  // próxima meta: primeiro critério não cumprido
  const nextTarget = ACHIEVEMENTS.find((a) => !unlockedKeys.has(a.key));

  if (stats.totalAttended === 0) {
    return (
      <section className="journey-card" aria-label="Sua jornada">
        <div className="journey-card__title">Sua Jornada</div>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Sua jornada começa no próximo devocional. Esperamos você! 🌱
        </p>
      </section>
    );
  }

  return (
    <section className="journey-card" aria-label="Sua jornada">
      <div className="journey-card__title">Sua Jornada</div>

      <div className="journey-card__stats">
        <div className="journey-card__stat" aria-label={`Streak atual: ${stats.currentStreak}`}>
          🔥 <strong>{stats.currentStreak}</strong> em sequência
        </div>
        <div className="journey-card__stat" aria-label={`Melhor streak: ${stats.bestStreak}`}>
          ⭐ Melhor: <strong>{stats.bestStreak}</strong>
        </div>
        <div className="journey-card__stat" aria-label={`Total de presenças: ${stats.totalAttended}`}>
          📘 <strong>{stats.totalAttended}</strong> devocionais
        </div>
      </div>

      <BadgeGrid
        catalog={ACHIEVEMENTS_VIEW}
        unlockedKeys={Array.from(unlockedKeys)}
      />

      {lastAchievement && lastUnlock && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
          Última conquista: <strong style={{ color: "var(--text)" }}>{lastAchievement.title}</strong> · {timeAgoPtBR(lastUnlock.unlockedAt)}
        </div>
      )}
      {!lastAchievement && nextTarget && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
          Próxima meta: <strong style={{ color: "var(--text)" }}>{nextTarget.title}</strong>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Criar stub de `BadgeGrid` para manter compilação limpa**

Criar `src/features/engagement/components/BadgeGrid.tsx` com stub mínimo — será enriquecido na Task 10:

```tsx
"use client";
import type { AchievementView } from "../lib/types";

interface Props {
  catalog: AchievementView[];
  unlockedKeys: string[];
  recentlyUnlockedKeys?: string[];
}

export function BadgeGrid(_props: Props) {
  return null;
}
```

- [ ] **Step 4: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (stub compila).

- [ ] **Step 5: Commit**

```bash
git add src/features/engagement/components/
git commit -m "feat(engagement): JourneyCard + BadgeIcon + stub BadgeGrid"
```

---

## Task 10: Enriquecer `BadgeGrid` (Client — stub → real)

**Files:**
- Modify: `src/features/engagement/components/BadgeGrid.tsx`

- [ ] **Step 1: Substituir o stub pelo componente completo**

```tsx
"use client";
import { useState } from "react";
import type { AchievementView } from "../lib/types";
import { BadgeIcon } from "./BadgeIcon";

interface Props {
  catalog: AchievementView[];
  unlockedKeys: string[];
  recentlyUnlockedKeys?: string[];
}

export function BadgeGrid({ catalog, unlockedKeys, recentlyUnlockedKeys = [] }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const unlocked = new Set(unlockedKeys);
  const recent = new Set(recentlyUnlockedKeys);

  return (
    <div className="badge-grid" role="list">
      {catalog.map((a) => {
        const isUnlocked = unlocked.has(a.key);
        const isRecent = recent.has(a.key);
        const classes = ["badge-circle"];
        if (!isUnlocked) classes.push("badge-locked");
        if (isRecent) classes.push("badge-recent");
        return (
          <div
            key={a.key}
            role="listitem"
            className={classes.join(" ")}
            aria-label={`${a.title} — ${isUnlocked ? "desbloqueada" : "bloqueada"}. ${a.description}`}
            tabIndex={0}
            onMouseEnter={() => setHovered(a.key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(a.key)}
            onBlur={() => setHovered(null)}
            style={{ position: "relative" }}
          >
            <BadgeIcon id={a.iconId} />
            {hovered === a.key && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                color: "var(--text)",
                whiteSpace: "nowrap",
                zIndex: 5,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}>
                {a.title}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (JourneyCard + BadgeGrid + BadgeIcon compilam juntos).

- [ ] **Step 3: Commit**

```bash
git add src/features/engagement/components/BadgeGrid.tsx
git commit -m "feat(engagement): BadgeGrid real (hover, tooltips, a11y)"
```

---

## Task 11: `AchievementToast` (Client + localStorage)

**Files:**
- Create: `src/features/engagement/components/AchievementToast.tsx`

- [ ] **Step 1: Criar `AchievementToast.tsx`**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS_VIEW } from "../lib/achievements";

const STORAGE_KEY = "devhub-achievement-seen";

interface Props {
  newlyUnlockedKeys: string[];
  silent: boolean;
  allUnlockedKeys: string[];
}

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSeen(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

export function AchievementToast({ newlyUnlockedKeys, silent, allUnlockedKeys }: Props) {
  const [toastKeys, setToastKeys] = useState<string[]>([]);
  const firedRef = useRef(false);
  const newKey = newlyUnlockedKeys.join("|") + "||" + String(silent);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const seen = readSeen();

    if (silent) {
      for (const k of allUnlockedKeys) seen.add(k);
      writeSeen(seen);
      return;
    }

    const unseen = newlyUnlockedKeys.filter((k) => !seen.has(k));
    if (unseen.length === 0) return;

    for (const k of unseen) seen.add(k);
    writeSeen(seen);
    setToastKeys(unseen);

    const t = setTimeout(() => setToastKeys([]), 5000);
    return () => clearTimeout(t);
  }, [newKey, silent, newlyUnlockedKeys, allUnlockedKeys]);

  if (toastKeys.length === 0) return null;

  if (toastKeys.length === 1) {
    const a = ACHIEVEMENTS_VIEW.find((x) => x.key === toastKeys[0]);
    return (
      <div className="achievement-toast" role="status" aria-live="polite">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>🎉 Nova conquista!</div>
        <div><strong>{a?.title ?? toastKeys[0]}</strong></div>
        {a && <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{a.description}</div>}
      </div>
    );
  }

  return (
    <div className="achievement-toast" role="status" aria-live="polite">
      <div style={{ fontWeight: 700, marginBottom: 4 }}>🎉 {toastKeys.length} conquistas desbloqueadas!</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        {toastKeys.map((k) => {
          const a = ACHIEVEMENTS_VIEW.find((x) => x.key === k);
          return <li key={k}>{a?.title ?? k}</li>;
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/features/engagement/components/AchievementToast.tsx
git commit -m "feat(engagement): toast de celebracao com dedupe via localStorage"
```

---

## Task 12: Integração no Dashboard

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Adicionar imports**

No topo de `src/app/(dashboard)/page.tsx`, adicionar (após imports existentes):

```ts
import { getUserEngagementStats } from "@/features/engagement/lib/orchestrator";
import { getEngagementEnabled } from "@/features/engagement/lib/feature-flag";
import { JourneyCard } from "@/features/engagement/components/JourneyCard";
import { AchievementToast } from "@/features/engagement/components/AchievementToast";
```

- [ ] **Step 2: Chamar orquestrador em paralelo + try/catch operacional**

Dentro de `DashboardPage`, após `const sessions = await prisma.session.findMany(...)` e antes de usar o resultado para outras coisas, calcular `userId` primeiro (a linha `const userId = ...` hoje está depois de várias queries; movê-la para logo após `const sessions = ...` se necessário).

Adicionar bloco com guard de segurança + try/catch (engagement nunca derruba dashboard):

```ts
  const userId = (session.user as { id?: string })?.id;

  type EngagementTuple = [boolean, Awaited<ReturnType<typeof getUserEngagementStats>> | null];
  let engagementTuple: EngagementTuple = [false, null];
  if (userId && userId.length > 0) {
    try {
      engagementTuple = await Promise.all([
        getEngagementEnabled(),
        getUserEngagementStats(userId, sessions.map((s) => ({
          id: s.id,
          status: s.status,
          chapterRef: s.chapterRef,
          date: s.date,
        }))),
      ]);
    } catch (err) {
      console.error("[engagement] erro ao carregar Sua Jornada — feature degradada:", err);
      engagementTuple = [false, null];
    }
  }
  const [engagementEnabled, engagement] = engagementTuple;
```

**Nota A1:** a spec pediu paralelizar com sessions/settings/dbUser/activePlan, mas reescrever todo o topo do dashboard sai do escopo desta V1. Engagement fica paralelizado **consigo mesmo** (attendance + engagement flag + achievements snapshot) via `Promise.all` dentro do orchestrator + aqui. Para paralelização total do dashboard, abrir issue separada.

- [ ] **Step 3: Renderizar `JourneyCard` e `AchievementToast`**

Localizar o fechamento do bloco `reading-banner` (comentário `{/* Zoom standalone (sem plano ativo) */}`). **Logo após** o bloco do Zoom standalone e **antes** do `{/* ─── Distribuição por Livro ─── */}`, inserir:

```tsx
      {engagementEnabled && engagement && (
        <>
          <JourneyCard stats={engagement.stats} unlocked={engagement.allUnlocked} />
          <AchievementToast
            newlyUnlockedKeys={engagement.newlyUnlockedKeys}
            silent={engagement.silent}
            allUnlockedKeys={engagement.allUnlocked.map((u) => u.key)}
          />
        </>
      )}
```

- [ ] **Step 4: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Dev smoke test (se possível)**

Run: `npm run dev`
Se o dev subir: abrir `http://localhost:3000`, logar e visualizar o card. Encerrar com Ctrl+C.
**Nota:** build local trava (CLAUDE.md §Build Local); apenas `npm run dev` é viável.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): integra widget Sua Jornada e toast de conquistas"
```

---

## Task 13: Refinamento visual via `ui-ux-pro-max`

**Files:**
- Modify: `src/features/engagement/components/JourneyCard.tsx`
- Modify: `src/features/engagement/components/BadgeGrid.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Invocar skill `ui-ux-pro-max`**

Prompt para a skill: "Refinar visualmente o componente `JourneyCard` + `BadgeGrid` no DevocionalHub. Stack: Next.js 16 + React 19 + Tailwind v4 (apenas via globals.css, nunca @theme inline). Design system atual usa `var(--accent)`, `var(--surface)`, `var(--text)`, `var(--text-muted)`, `var(--border)`, `var(--radius-xl)`, `var(--radius-lg)`. Tema principal é dark mode (#0c0c0e bg / #f5a623 accent goldenrod). Padrões existentes: ver `.reading-banner`, `.stat-card`, `.card` no globals.css. Restrição: nunca hardcode cores (#hex) em componentes; apenas var(). Mantenha classes já criadas (`.journey-card`, `.badge-circle`, etc). Adicione microinterações sutis, hierarquia visual, e polimento do espaçamento. Retorne CSS + TSX prontos."

Aplicar as sugestões recebidas. Se a skill propuser criar novos componentes fora do scope (ex: chart elaborado), rejeitar — V1 é minimalista.

- [ ] **Step 2: Revisar aderência a gotchas do CLAUDE.md**

Checar:
- ✅ Nenhum `@theme inline`
- ✅ Nenhuma cor hardcoded (#hex)
- ✅ Todas as classes novas estão em `globals.css`
- ✅ Responsividade em <480px mantida

- [ ] **Step 3: Validar tipos + smoke test**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/features/engagement/ src/app/globals.css
git commit -m "polish(engagement): refinamento visual via ui-ux-pro-max"
```

---

## Task 14: Toggle admin para `engagementEnabled`

**Files:**
- Modify: `src/app/(dashboard)/admin/page.tsx`

> **Nota:** o painel admin tem 7 abas; adicionar um toggle simples na aba de "Configurações" (ou equivalente — identificar ao abrir o arquivo). Se for complexo demais, documentar no `CLAUDE.md` que flag é setada via SQL e pular o toggle (fallback — menor risco, mas pior UX).

- [ ] **Step 1: Ler o arquivo `admin/page.tsx`**

Identificar a aba que cuida de `AppSetting` (provavelmente "Configurações", "Geral" ou similar). Ver como `mainSpeakerName`, `zoomMeetingId`, `aiModel` são exibidos/editados.

- [ ] **Step 2: Adicionar entrada para `engagementEnabled`**

Adicionar um campo boolean (checkbox/toggle) usando o mesmo padrão dos demais settings. Valor default visível = `true` (conforme §12.1 da spec — linha ausente = habilitado).

Exemplo (adaptar ao padrão existente):

```tsx
<div className="setting-row">
  <label>
    <input
      type="checkbox"
      checked={settings.engagementEnabled !== "false"}
      onChange={(e) => updateSetting("engagementEnabled", e.target.checked ? "true" : "false")}
    />
    <span>Ativar "Sua Jornada" (streaks + conquistas)</span>
  </label>
  <p className="setting-hint">Linha ausente = habilitado por padrão.</p>
</div>
```

- [ ] **Step 3: Validar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/admin/page.tsx
git commit -m "feat(admin): toggle engagementEnabled no painel"
```

---

## Task 15: Teste E2E (Playwright)

**Files:**
- Create: `tests/e2e/engagement.spec.ts`

- [ ] **Step 1: Criar `engagement.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test.describe("Engajamento — Sua Jornada", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', process.env.ADMIN_EMAIL || "");
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
  });

  test("widget Sua Jornada aparece no dashboard", async ({ page }) => {
    const card = page.getByRole("region", { name: "Sua jornada" });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "tests/e2e/screenshots/journey-card.png", fullPage: false });
  });

  test("badges renderizam", async ({ page }) => {
    const card = page.getByRole("region", { name: "Sua jornada" });
    const grid = card.getByRole("list");
    await expect(grid).toBeVisible();
    const badges = grid.getByRole("listitem");
    expect(await badges.count()).toBeGreaterThanOrEqual(7);
  });
});
```

- [ ] **Step 2: Instalar browsers do Playwright (se ainda não)**

Run: `npx playwright install chromium`
Expected: "chromium ... is already installed" ou novo download.

- [ ] **Step 3: Rodar E2E APÓS DEPLOY**

**IMPORTANTE:** o E2E é executado **após** o deploy em produção (ou contra `npm run dev` local com `PLAYWRIGHT_BASE_URL=http://localhost:3000`). Rodar antes do deploy testaria a versão antiga — seletores `region:sua jornada` falhariam em prod atual. O fluxo de CLAUDE.md §Processo exige: "Deploy assistido: acompanhar CI/CD, verificar HTTP 200, só chamar o usuário quando tudo estiver OK". E2E vai depois.

Quando executar:
```
npx playwright test tests/e2e/engagement.spec.ts --project="Desktop Chrome"
```
Expected: 2 passed. Requer `.env` com `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/engagement.spec.ts
git commit -m "test(e2e): valida widget Sua Jornada no dashboard"
```

---

## Task 16: Atualizar `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Adicionar seção no final do arquivo**

Inserir antes de `## Git` (ou equivalente seção final):

```markdown
## Engajamento & Streaks v1 (CONCLUIDO — 2026-04-15)

Widget "Sua Jornada" no dashboard com streak atual, melhor streak e 7 conquistas persistentes baseadas em `Attendance`.

### Arquitetura
- Feature: `src/features/engagement/`
- Util puro: `computeUserEngagementStats(sessions, attendances)` — currentStreak com tolerância de 36h
- Persistência: tabela `UserAchievement` (unique `userId + key`)
- Orquestrador: `getUserEngagementStats(userId, sessionsAlreadyLoaded)` — single-fetch
- Flag: `AppSetting.engagementEnabled` — linha ausente = habilitado

### Convenção da flag
- Lida via `getEngagementEnabled()` em `feature-flag.ts`
- `value="false"` desabilita; qualquer outro valor ou linha ausente = habilitado
- Toggle exposto no painel admin (aba Configurações)

### Backfill silencioso
- Usuário com `totalAttended >= 2` e sem `UserAchievement` pré-existente é tratado como "histórico" — conquistas são persistidas mas toast é suprimido
- `devhub-achievement-seen` em localStorage faz dedupe entre renders
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md consolida Engajamento & Streaks v1"
```

---

## Task 17: Validação final

- [ ] **Step 1: Rodar todos os testes**

Run: `npm run test:unit`
Expected: 16+ passed.

- [ ] **Step 2: Typecheck completo**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sem erros novos; warnings de código legado são aceitáveis.

- [ ] **Step 4: Verificar git status limpo**

Run: `git status`
Expected: working tree clean.

- [ ] **Step 5: Verificar commits**

Run: `git log --oneline -20`
Expected: série de commits da feature, cada um com mensagem clara.

- [ ] **Step 6: Pronto para PR/deploy**

Lembrar: deploy só após TODAS as etapas concluídas (CLAUDE.md §Processo de Desenvolvimento). Push para `main` aciona CI/CD automaticamente. Aguardar ~30s para container reiniciar. Validar HTTP 200 em `https://devocional.nexusai360.com`.

---

## Resumo dos Commits esperados

1. `refactor(shared): extrair extractBookName para bible-utils`
2. `chore(test): adiciona vitest como unit test runner`
3. `feat(db): adiciona UserAchievement para conquistas por usuario`
4. `feat(engagement): catalogo de conquistas e avaliador puro`
5. `feat(engagement): computeUserEngagementStats com tolerancia 36h`
6. `feat(engagement): feature flag e utilitarios de tempo (TZ Brasil)`
7. `feat(engagement): persistencia idempotente de conquistas`
8. `feat(engagement): orquestrador com backfill silencioso`
9. `feat(engagement): estilos do widget Sua Jornada e toast`
10. `feat(engagement): JourneyCard + BadgeGrid + BadgeIcon`
11. `feat(engagement): toast de celebracao com dedupe via localStorage`
12. `feat(dashboard): integra widget Sua Jornada e toast de conquistas`
13. `polish(engagement): refinamento visual via ui-ux-pro-max`
14. `feat(admin): toggle engagementEnabled no painel`
15. `test(e2e): valida widget Sua Jornada no dashboard`
16. `docs: CLAUDE.md consolida Engajamento & Streaks v1`

Total: 16 commits atômicos.
