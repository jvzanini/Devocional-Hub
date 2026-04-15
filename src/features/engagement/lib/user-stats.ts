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

  const completedIds = new Set(completedAsc.map((s) => s.id));
  const completedAttendances = attendances.filter((a) => completedIds.has(a.sessionId));
  const attendedSet = new Set(completedAttendances.map((a) => a.sessionId));

  const totalSessionsCompleted = completedAsc.length;
  const totalAttended = completedAttendances.length;
  const frequencyPct = totalSessionsCompleted > 0 ? totalAttended / totalSessionsCompleted : 0;

  // bestStreak: maior run contígua de presenças em sessões COMPLETED
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

  // currentStreak: run contígua a partir do final, com tolerância de 36h na última sessão
  let currentStreak = 0;
  if (completedAsc.length > 0) {
    const last = completedAsc[completedAsc.length - 1];
    const tailAttended = attendedSet.has(last.id);
    const ageMs = Date.now() - last.date.getTime();

    // Se o usuário não foi à última sessão e ela foi há <36h, ignora e avalia penúltima
    const effective = tailAttended
      ? completedAsc
      : ageMs < TOLERANCE_MS
      ? completedAsc.slice(0, -1)
      : [];

    let run = 0;
    for (let i = effective.length - 1; i >= 0; i--) {
      if (attendedSet.has(effective[i].id)) run++;
      else break;
    }
    currentStreak = run;
  }

  // booksReadCount: livros distintos em sessões COMPLETED onde o usuário compareceu
  const books = new Set<string>();
  for (const s of completedAsc) {
    if (attendedSet.has(s.id)) {
      books.add(extractBookName(s.chapterRef || ""));
    }
  }
  const booksReadCount = books.size;

  const lastAttendedAt =
    completedAttendances.length > 0
      ? new Date(Math.max(...completedAttendances.map((a) => a.joinTime.getTime())))
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
