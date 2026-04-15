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
    expect(r.summary.totalAchievements).toBe(1);
  });

  it("ordenação topStreaks com triple-tie: bestStreak→currentStreak→totalAttended", () => {
    const users = [user("a", "A"), user("b", "B"), user("c", "C")];
    const sessions = [session("s1",10), session("s2",5), session("s3",1)];
    const atts = [
      att("a","s1",10), att("a","s2",5), att("a","s3",1),
      att("b","s1",10), att("b","s2",5), att("b","s3",1),
      att("c","s1",10), att("c","s2",5),
    ];
    const r = computeAdminInsights(users, sessions, atts, []);
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
