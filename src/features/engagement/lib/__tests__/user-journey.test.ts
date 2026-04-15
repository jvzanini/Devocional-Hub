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
    expect(j.recentAttendances[0].sessionId).toBe("b");
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
