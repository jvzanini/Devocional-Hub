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
    const sessions = [session("a", 10), session("b", 5), session("c", 2)];
    const atts = [att("a", 10), att("b", 5)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(2);
  });

  it("currentStreak mantém se última COMPLETED foi há <36h e usuário ainda não compareceu", () => {
    const sessions = [session("a", 10), session("b", 5), session("c", 1)];
    const atts = [att("a", 10), att("b", 5)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.currentStreak).toBe(2);
  });

  it("currentStreak=0 quando última <36h mas penúltima também teve falta", () => {
    const sessions = [session("a", 10), session("b", 5), session("c", 1)];
    const atts = [att("a", 10)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(1);
  });

  it("bestStreak > currentStreak em duas runs distintas", () => {
    const sessions = [
      session("a", 30), session("b", 25), session("c", 20),
      session("d", 15),
      session("e", 10), session("f", 5),
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
    expect(s.booksReadCount).toBe(2);
  });

  it("lastAttendedAt = max(joinTime)", () => {
    const sessions = [session("a", 5), session("b", 1)];
    const atts = [att("a", 5), att("b", 1)];
    const s = computeUserEngagementStats(sessions, atts);
    expect(s.lastAttendedAt?.getTime()).toBeCloseTo(atts[1].joinTime.getTime(), -2);
  });
});
