import type { TopStreakRow, AtRiskRow, DistributionRow } from "./admin-insights";
import { LEVEL_LABEL } from "./risk-labels";
import { toBrazilDate } from "./time-utils";

const DANGEROUS_PREFIXES = new Set(["=", "+", "-", "@", "\t", "\r"]);

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return String(value);

  let text = value;
  if (text.length > 0 && DANGEROUS_PREFIXES.has(text[0])) {
    text = "'" + text;
  }

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
