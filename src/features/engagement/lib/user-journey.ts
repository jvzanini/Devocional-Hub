import { computeUserEngagementStats, type SessionLike } from "./user-stats";
import { ACHIEVEMENTS_VIEW } from "./achievements";
import type { UserLike, UnlockLike } from "./admin-insights";
import { extractBookName } from "@/shared/lib/bible-utils";
import type { IconId, UserEngagementStats } from "./types";

export interface JourneyAttendance {
  sessionId: string;
  joinTime: Date;
  duration: number; // segundos
}

export interface JourneyRecentAttendance {
  sessionId: string;
  date: string;
  chapterRef: string;
  durationMin: number;
}

export interface JourneyUnlockedAchievement {
  key: string;
  title: string;
  description: string;
  iconId: IconId;
  unlockedAt: string;
}

export interface JourneyBook { name: string; count: number; }

export interface UserJourney {
  user: {
    id: string; name: string; email: string;
    church: string; team: string; subTeam: string;
    createdAt: string;
  };
  stats: UserEngagementStats;
  unlockedAchievements: JourneyUnlockedAchievement[];
  recentAttendances: JourneyRecentAttendance[];
  booksParticipated: JourneyBook[];
  computedAt: string;
}

export function computeUserJourney(
  user: UserLike,
  sessions: SessionLike[],
  attendances: JourneyAttendance[],
  unlocks: UnlockLike[],
): UserJourney {
  const now = Date.now();

  const stats = computeUserEngagementStats(sessions, attendances);

  const unlockedAchievements: JourneyUnlockedAchievement[] = unlocks
    .map((u) => {
      const cat = ACHIEVEMENTS_VIEW.find((a) => a.key === u.key);
      if (!cat) return null;
      return {
        key: cat.key,
        title: cat.title,
        description: cat.description,
        iconId: cat.iconId,
        unlockedAt: u.unlockedAt.toISOString(),
      };
    })
    .filter((x): x is JourneyUnlockedAchievement => x !== null)
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const sortedAtts = [...attendances]
    .filter((a) => sessionById.has(a.sessionId))
    .sort((a, b) => {
      const sa = sessionById.get(a.sessionId)!;
      const sb = sessionById.get(b.sessionId)!;
      return sb.date.getTime() - sa.date.getTime() || b.joinTime.getTime() - a.joinTime.getTime();
    });

  const recentAttendances: JourneyRecentAttendance[] = sortedAtts.slice(0, 20).map((a) => {
    const s = sessionById.get(a.sessionId)!;
    return {
      sessionId: a.sessionId,
      date: s.date.toISOString(),
      chapterRef: s.chapterRef ?? "",
      durationMin: Math.round(a.duration / 60),
    };
  });

  const attendedSessionIds = new Set(attendances.map((a) => a.sessionId));
  const bookCounts = new Map<string, number>();
  for (const s of sessions) {
    if (s.status !== "COMPLETED") continue;
    if (!attendedSessionIds.has(s.id)) continue;
    const book = extractBookName(s.chapterRef ?? "");
    bookCounts.set(book, (bookCounts.get(book) ?? 0) + 1);
  }
  const booksParticipated: JourneyBook[] = [...bookCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      church: user.church,
      team: user.team,
      subTeam: user.subTeam,
      createdAt: user.createdAt.toISOString(),
    },
    stats,
    unlockedAchievements,
    recentAttendances,
    booksParticipated,
    computedAt: new Date(now).toISOString(),
  };
}
