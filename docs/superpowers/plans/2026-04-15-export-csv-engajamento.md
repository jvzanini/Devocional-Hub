# Export CSV Engajamento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`. Zero classe CSS nova. Reusa `.btn-outline`.

**Goal:** 3 botões "Baixar CSV" nas seções da aba Engajamento (Top Streaks, Em Risco, Distribuição), geração client-side com UTF-8 BOM, RFC 4180, proteção contra CSV injection.

**Spec:** `docs/superpowers/specs/2026-04-15-export-csv-engajamento-design.md`

---

## Mapa de Arquivos

**Criar:**
- `src/features/engagement/lib/risk-labels.ts` — constante `LEVEL_LABEL` compartilhada.
- `src/features/engagement/lib/csv-export.ts` — utils puros + `downloadCsv`.
- `src/features/engagement/lib/__tests__/csv-export.test.ts`
- `tests/e2e/engagement-csv-export.spec.ts`

**Modificar:**
- `src/app/(dashboard)/admin/page.tsx` — extrair `LEVEL_LABEL` inline → importar do novo módulo; adicionar 3 botões "Baixar CSV".

---

## Task 1: Refactor `LEVEL_LABEL` → módulo compartilhado

**Files:**
- Create: `src/features/engagement/lib/risk-labels.ts`
- Modify: `src/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1:** Criar `src/features/engagement/lib/risk-labels.ts`:

```ts
import type { RiskLevel } from "./admin-insights";

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  attention: "Atenção",
  dormant: "Adormecido",
  lost: "Perdido",
};
```

- [ ] **Step 2:** Em `src/app/(dashboard)/admin/page.tsx`, localizar a declaração inline `const LEVEL_LABEL: Record<RiskLevel, string> = { ... }` e **remover**. Adicionar import no topo:
```ts
import { LEVEL_LABEL } from "@/features/engagement/lib/risk-labels";
```
Remover também o `RiskLevel` do import existente se ele só era usado para tipar `LEVEL_LABEL` local (verificar no arquivo).

- [ ] **Step 3:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 4:** Commit:
```bash
git add src/features/engagement/lib/risk-labels.ts "src/app/(dashboard)/admin/page.tsx"
git commit -m "refactor(engagement): extrai LEVEL_LABEL para risk-labels compartilhado"
```

---

## Task 2: Utils CSV puros + TDD

**Files:**
- Create: `src/features/engagement/lib/csv-export.ts`
- Create: `src/features/engagement/lib/__tests__/csv-export.test.ts`

- [ ] **Step 1 (TDD):** Criar `src/features/engagement/lib/__tests__/csv-export.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  escapeCsvField, toCsv,
  buildTopStreaksCsv, buildAtRiskCsv, buildDistributionCsv,
} from "../csv-export";
import type { TopStreakRow, AtRiskRow, DistributionRow } from "../admin-insights";

describe("escapeCsvField", () => {
  it("string simples: sem aspas", () => {
    expect(escapeCsvField("João")).toBe("João");
  });
  it("vírgula: envolve em aspas", () => {
    expect(escapeCsvField("Silva, Maria")).toBe('"Silva, Maria"');
  });
  it("aspas duplas: duplica e envolve", () => {
    expect(escapeCsvField('Ele disse "oi"')).toBe('"Ele disse ""oi"""');
  });
  it("quebra de linha: envolve em aspas", () => {
    expect(escapeCsvField("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });
  it("null/undefined: string vazia", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });
  it("CSV injection: = vira com apóstrofo prefixado e envolto em aspas", () => {
    // Char = está no set de injection E também aciona envolver em aspas por ser prefixo perigoso;
    // mas o apóstrofo sozinho não exige aspas. Só forçar envolver quando RFC 4180 exige (,|"|\n|\r).
    // Ou seja: "=SUM(A:A)" vira "'=SUM(A:A)" e, como não tem , " \n \r, NÃO envolve.
    expect(escapeCsvField("=SUM(A:A)")).toBe("'=SUM(A:A)");
  });
  it("CSV injection com WhatsApp: +5511... vira '+5511...", () => {
    expect(escapeCsvField("+5511999998888")).toBe("'+5511999998888");
  });
  it("CSV injection com @ e -", () => {
    expect(escapeCsvField("@hack()")).toBe("'@hack()");
    expect(escapeCsvField("-2+3")).toBe("'-2+3");
  });
  it("CSV injection + vírgula: apóstrofo E aspas", () => {
    expect(escapeCsvField("=A,B")).toBe('"\'=A,B"');
  });
  it("número negativo passado como number (não string): apenas converte", () => {
    // Números brutos não são tratados como injection (não são string)
    expect(escapeCsvField(-5)).toBe("-5");
  });
});

describe("toCsv", () => {
  it("produz cabeçalho + linhas com \\r\\n", () => {
    const csv = toCsv(["A", "B"], [["1", "2"], ["3", "4"]]);
    expect(csv).toBe("A,B\r\n1,2\r\n3,4");
  });
  it("escape aplicado em cada célula", () => {
    const csv = toCsv(["Nome"], [["Silva, Maria"]]);
    expect(csv).toBe('Nome\r\n"Silva, Maria"');
  });
});

describe("buildTopStreaksCsv", () => {
  it("header correto + linha com data YYYY-MM-DD", () => {
    const rows: TopStreakRow[] = [{
      userId: "u1", name: "João", church: "IC", team: "A",
      bestStreak: 5, currentStreak: 3, totalAttended: 10,
      lastAttendedAt: new Date("2026-04-14T15:00:00Z"),
    }];
    const csv = buildTopStreaksCsv(rows);
    expect(csv).toContain("Nome,Igreja,Equipe,Streak Atual,Melhor Streak,Total de Presenças,Última Presença");
    expect(csv).toContain("João,IC,A,3,5,10,2026-04-14");
  });
  it("lastAttendedAt aceita string ISO (vindo de JSON)", () => {
    const rows: TopStreakRow[] = [{
      userId: "u1", name: "B", church: "", team: "",
      bestStreak: 1, currentStreak: 0, totalAttended: 1,
      lastAttendedAt: "2026-04-10T10:00:00.000Z" as unknown as Date,
    }];
    expect(buildTopStreaksCsv(rows)).toContain("2026-04-10");
  });

  it("lastAttendedAt null → campo vazio", () => {
    const rows: TopStreakRow[] = [{
      userId: "u1", name: "Ana", church: "", team: "",
      bestStreak: 0, currentStreak: 0, totalAttended: 1,
      lastAttendedAt: null,
    }];
    expect(buildTopStreaksCsv(rows)).toMatch(/Ana,,,0,0,1,\r?\n?$/);
  });
});

describe("buildAtRiskCsv", () => {
  it("usa label pt-BR e escapa WhatsApp com +", () => {
    const rows: AtRiskRow[] = [{
      userId: "u1", name: "Pedro", church: "IC", team: "A",
      whatsapp: "+5511999998888", level: "dormant",
      lastAttendedAt: new Date("2026-03-14T10:00:00Z"), bestStreak: 4,
    }];
    const csv = buildAtRiskCsv(rows);
    expect(csv).toContain("Nível,Nome,Igreja,Equipe,Melhor Streak,Última Presença,WhatsApp");
    expect(csv).toContain("Adormecido,Pedro,IC,A,4,2026-03-14,'+5511999998888");
  });
});

describe("buildDistributionCsv", () => {
  it("clampa pct em 100%", () => {
    const rows: DistributionRow[] = [{
      key: "first_step", title: "Primeiro Passo", description: "—",
      count: 10, pct: 1.5,
    }];
    expect(buildDistributionCsv(rows)).toContain("Primeiro Passo,—,10,100%");
  });
});
```

- [ ] **Step 2:** Rodar — deve falhar.
  `npx vitest run src/features/engagement/lib/__tests__/csv-export.test.ts`

- [ ] **Step 3:** Criar `src/features/engagement/lib/csv-export.ts`:

```ts
import type { TopStreakRow, AtRiskRow, DistributionRow } from "./admin-insights";
import { LEVEL_LABEL } from "./risk-labels";
import { toBrazilDate } from "./time-utils";

const DANGEROUS_PREFIXES = new Set(["=", "+", "-", "@", "\t", "\r"]);

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  // Números e booleans passam direto (stringify simples, sem risco de injection)
  if (typeof value !== "string") return String(value);

  let text = value;
  // CSV injection: se começar com char perigoso, prefixar apóstrofo
  if (text.length > 0 && DANGEROUS_PREFIXES.has(text[0])) {
    text = "'" + text;
  }

  // RFC 4180 escape
  const needsQuotes = /[",\r\n]/.test(text);
  if (needsQuotes) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(headers: string[], rows: (unknown[])[]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\r\n");
}

function dateOrEmpty(d: Date | string | null | undefined): string {
  if (!d) return "";
  // Tolera string ISO vinda de JSON (endpoint serializa Date → string)
  const asDate = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(asDate.getTime())) return "";
  return toBrazilDate(asDate);
}

export function buildTopStreaksCsv(rows: TopStreakRow[]): string {
  return toCsv(
    ["Nome", "Igreja", "Equipe", "Streak Atual", "Melhor Streak", "Total de Presenças", "Última Presença"],
    rows.map((r) => [
      r.name, r.church, r.team,
      r.currentStreak, r.bestStreak, r.totalAttended,
      dateOrEmpty(r.lastAttendedAt),
    ]),
  );
}

export function buildAtRiskCsv(rows: AtRiskRow[]): string {
  return toCsv(
    ["Nível", "Nome", "Igreja", "Equipe", "Melhor Streak", "Última Presença", "WhatsApp"],
    rows.map((r) => [
      LEVEL_LABEL[r.level], r.name, r.church, r.team,
      r.bestStreak, dateOrEmpty(r.lastAttendedAt),
      r.whatsapp ?? "",
    ]),
  );
}

export function buildDistributionCsv(rows: DistributionRow[]): string {
  return toCsv(
    ["Conquista", "Descrição", "Usuários", "Percentual"],
    rows.map((r) => [
      r.title, r.description, r.count,
      `${Math.round(Math.min(r.pct, 1) * 100)}%`,
    ]),
  );
}

/**
 * Side-effect: dispara download no browser. BOM UTF-8 aplicado internamente.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4:** Rodar testes — 13+ passed.

- [ ] **Step 5:** `npm run test:unit` → 47+ passed.

- [ ] **Step 6:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 7:** Commit:
```bash
git add src/features/engagement/lib/csv-export.ts src/features/engagement/lib/__tests__/csv-export.test.ts
git commit -m "feat(engagement): utils CSV com protecao contra injection"
```

---

## Task 3: Integrar botões no `EngagementTab`

**File:** Modify `src/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1:** Localizar `EngagementTab` (já existe do commit `9b7260e`).

- [ ] **Step 2:** Adicionar imports (se ainda não houver):
```ts
import {
  buildTopStreaksCsv, buildAtRiskCsv, buildDistributionCsv, downloadCsv,
} from "@/features/engagement/lib/csv-export";
import { toBrazilDate } from "@/features/engagement/lib/time-utils";
```

- [ ] **Step 3:** Para cada uma das 3 seções (Top Streaks, Distribuição, Em Risco), adicionar um `<button className="btn-outline">` no header da seção. Padrão sugerido:

Top Streaks: envolver o `<div className="section-title">Top Streaks</div>` num flex com o botão:
```tsx
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
  <div className="section-title" style={{ margin: 0 }}>Top Streaks</div>
  <button
    className="btn-outline"
    onClick={() => downloadCsv(
      buildTopStreaksCsv(data.topStreaks),
      `devocional-top-streaks-${toBrazilDate(new Date())}.csv`,
    )}
    style={{ padding: "4px 12px", fontSize: 13 }}
    disabled={data.topStreaks.length === 0}
  >
    Baixar CSV
  </button>
</div>
```

Distribuição: análogo, com `buildDistributionCsv(data.distribution)` e filename `devocional-conquistas-${toBrazilDate(new Date())}.csv`.

Em Risco: o header já é um flex (vindo da feature anterior que mostra "mostrando X de Y"). Adicionar o botão nesse mesmo header OU criar um flex secundário. Manter contagem visível:
```tsx
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
  <div className="section-title" style={{ margin: 0 }}>Usuários em Risco</div>
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    {data.summary.atRisk > data.atRisk.length && (
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
        mostrando {data.atRisk.length} de {data.summary.atRisk} (mais prioritários)
      </span>
    )}
    <button
      className="btn-outline"
      onClick={() => downloadCsv(
        buildAtRiskCsv(data.atRisk),
        `devocional-em-risco-${toBrazilDate(new Date())}.csv`,
      )}
      style={{ padding: "4px 12px", fontSize: 13 }}
      disabled={data.atRisk.length === 0}
    >
      Baixar CSV
    </button>
  </div>
</div>
```

- [ ] **Step 4:** `git diff --name-only HEAD` — deve listar apenas `admin/page.tsx` (e talvez `risk-labels.ts` se ainda não commitado).

- [ ] **Step 5:** Garantir `globals.css` NÃO mudou: `git diff HEAD~1 HEAD -- src/app/globals.css` vazio.

- [ ] **Step 6:** `npx tsc --noEmit` — sem erros.

- [ ] **Step 7:** Commit:
```bash
git add "src/app/(dashboard)/admin/page.tsx"
git commit -m "feat(admin): botoes Baixar CSV nas tabelas de engajamento"
```

---

## Task 4: E2E Playwright

**File:** Create `tests/e2e/engagement-csv-export.spec.ts`

- [ ] **Step 1:** Criar:

```ts
import { test, expect } from "@playwright/test";

test.describe("Admin — Export CSV Engajamento", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.ADMIN_EMAIL || "");
    await page.fill("#password", process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
    await page.goto("/admin");
    await page.getByRole("button", { name: /engajamento/i }).click();
  });

  test("download CSV de Top Streaks", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    // clicar no primeiro botão "Baixar CSV" (o da seção Top Streaks — é o 1º card)
    const topCard = page.getByText("Top Streaks").locator("..");
    await topCard.getByRole("button", { name: /baixar csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("top-streaks");
    expect(download.suggestedFilename()).toContain(".csv");
  });
});
```

- [ ] **Step 2:** Commit:
```bash
git add tests/e2e/engagement-csv-export.spec.ts
git commit -m "test(e2e): export CSV de engajamento"
```

---

## Task 5: Validação final

- [ ] `npm run test:unit` → 47+ passed.
- [ ] `npx tsc --noEmit` → sem erros.
- [ ] `npm run lint` → sem erros novos.
- [ ] `git diff <sha-pre-feature> HEAD -- src/app/globals.css` → vazio.

---

## Commits esperados

1. `refactor(engagement): extrai LEVEL_LABEL para risk-labels compartilhado`
2. `feat(engagement): utils CSV com protecao contra injection`
3. `feat(admin): botoes Baixar CSV nas tabelas de engajamento`
4. `test(e2e): export CSV de engajamento`

Total: 4 commits.
