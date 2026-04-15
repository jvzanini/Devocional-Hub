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
  it("CSV injection: = prefixa apóstrofo, sem aspas", () => {
    expect(escapeCsvField("=SUM(A:A)")).toBe("'=SUM(A:A)");
  });
  it("CSV injection: + prefixa apóstrofo", () => {
    expect(escapeCsvField("+5511999998888")).toBe("'+5511999998888");
  });
  it("CSV injection: @ e -", () => {
    expect(escapeCsvField("@hack()")).toBe("'@hack()");
    expect(escapeCsvField("-2+3")).toBe("'-2+3");
  });
  it("CSV injection + vírgula: apóstrofo E aspas", () => {
    expect(escapeCsvField("=A,B")).toBe('"\'=A,B"');
  });
  it("número negativo como number: apenas converte", () => {
    expect(escapeCsvField(-5)).toBe("-5");
  });
});

describe("toCsv", () => {
  it("cabeçalho + linhas separadas por \\r\\n", () => {
    const csv = toCsv(["A", "B"], [["1", "2"], ["3", "4"]]);
    expect(csv).toBe("A,B\r\n1,2\r\n3,4");
  });
  it("escape aplicado em cada célula", () => {
    const csv = toCsv(["Nome"], [["Silva, Maria"]]);
    expect(csv).toBe('Nome\r\n"Silva, Maria"');
  });
});

describe("buildTopStreaksCsv", () => {
  it("header correto + data YYYY-MM-DD em TZ Brasil", () => {
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
    expect(buildTopStreaksCsv(rows)).toMatch(/Ana,,,0,0,1,$/);
  });
});

describe("buildAtRiskCsv", () => {
  it("label pt-BR e WhatsApp com + prefixado", () => {
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
