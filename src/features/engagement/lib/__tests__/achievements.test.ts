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
