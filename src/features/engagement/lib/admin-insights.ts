import { computeUserEngagementStats, type SessionLike, type AttendanceLike } from "./user-stats";
import { ACHIEVEMENTS_VIEW } from "./achievements";

export interface UserLike {
  id: string; name: string; email: string;
  church: string; team: string; subTeam: string;
  whatsapp: string | null;
  createdAt: Date;
  deletedAt?: Date | null;
  active?: boolean;
}

export interface UnlockLike { userId: string; key: string; unlockedAt: Date; }

export interface TopStreakRow {
  userId: string; name: string; church: string; team: string;
  bestStreak: number; currentStreak: number; totalAttended: number;
  lastAttendedAt: Date | null;
}
export interface DistributionRow {
  key: string; title: string; description: string;
  count: number; pct: number;
}
export type RiskLevel = "attention" | "dormant" | "lost";
export interface AtRiskRow {
  userId: string; name: string; church: string; team: string;
  whatsapp: string | null;
  level: RiskLevel;
  lastAttendedAt: Date;
  bestStreak: number;
}
export interface AdminInsights {
  summary: {
    activeCommunity: number;
    activeStreaks: number;
    atRisk: number;
    totalAchievements: number;
  };
  topStreaks: TopStreakRow[];
  distribution: DistributionRow[];
  atRisk: AtRiskRow[];
  computedAt: string;
}

const SEVEN_DAYS = 7 * 86400_000;
const THIRTY_DAYS = 30 * 86400_000;
const NINETY_DAYS = 90 * 86400_000;

function classifyRisk(
  lastAttendedAt: Date | null,
  bestStreak: number,
  now: number,
): RiskLevel | null {
  if (!lastAttendedAt) return null;
  if (bestStreak < 2) return null;
  const age = now - lastAttendedAt.getTime();
  // Se foi há menos de 7 dias, streak ainda ativo — não é risco
  if (age < SEVEN_DAYS) return null;
  if (age < THIRTY_DAYS) return "attention";
  if (age < NINETY_DAYS) return "dormant";
  return "lost";
}

const LEVEL_PRIORITY: Record<RiskLevel, number> = { dormant: 0, attention: 1, lost: 2 };

export function computeAdminInsights(
  users: UserLike[],
  sessions: SessionLike[],
  attendances: (AttendanceLike & { userId: string })[],
  unlocks: UnlockLike[],
): AdminInsights {
  const now = Date.now();

  const byUser = new Map<string, (AttendanceLike & { userId: string })[]>();
  for (const a of attendances) {
    const arr = byUser.get(a.userId) ?? [];
    arr.push(a);
    byUser.set(a.userId, arr);
  }

  const validUsers = users.filter(
    (u) => u.deletedAt == null && (u.active === undefined || u.active === true),
  );

  const topRows: TopStreakRow[] = [];
  const atRiskRows: AtRiskRow[] = [];
  let activeCommunity = 0;
  let activeStreaks = 0;

  for (const u of validUsers) {
    const userAtts = byUser.get(u.id) ?? [];
    const stats = computeUserEngagementStats(sessions, userAtts);

    if (stats.lastAttendedAt && now - stats.lastAttendedAt.getTime() < THIRTY_DAYS) {
      activeCommunity++;
    }
    if (stats.currentStreak >= 3) activeStreaks++;

    if (stats.totalAttended > 0) {
      topRows.push({
        userId: u.id, name: u.name, church: u.church, team: u.team,
        bestStreak: stats.bestStreak, currentStreak: stats.currentStreak,
        totalAttended: stats.totalAttended, lastAttendedAt: stats.lastAttendedAt,
      });
    }

    const level = classifyRisk(stats.lastAttendedAt, stats.bestStreak, now);
    if (level && stats.lastAttendedAt) {
      atRiskRows.push({
        userId: u.id, name: u.name, church: u.church, team: u.team,
        whatsapp: u.whatsapp, level,
        lastAttendedAt: stats.lastAttendedAt, bestStreak: stats.bestStreak,
      });
    }
  }

  topRows.sort((a, b) =>
    b.bestStreak - a.bestStreak
    || b.currentStreak - a.currentStreak
    || b.totalAttended - a.totalAttended
    || a.name.localeCompare(b.name, "pt-BR"),
  );
  const topStreaks = topRows.slice(0, 10);

  atRiskRows.sort((a, b) =>
    LEVEL_PRIORITY[a.level] - LEVEL_PRIORITY[b.level]
    || b.lastAttendedAt.getTime() - a.lastAttendedAt.getTime(),
  );
  const atRisk = atRiskRows.slice(0, 20);

  const unlocksByKey = new Map<string, number>();
  for (const u of unlocks) {
    unlocksByKey.set(u.key, (unlocksByKey.get(u.key) ?? 0) + 1);
  }
  const distribution: DistributionRow[] = ACHIEVEMENTS_VIEW.map((a) => {
    const count = unlocksByKey.get(a.key) ?? 0;
    const pct = activeCommunity > 0 ? count / activeCommunity : 0;
    return { key: a.key, title: a.title, description: a.description, count, pct };
  }).sort((a, b) => b.count - a.count);

  return {
    summary: {
      activeCommunity,
      activeStreaks,
      atRisk: atRiskRows.length,
      totalAchievements: unlocks.length,
    },
    topStreaks,
    distribution,
    atRisk,
    computedAt: new Date(now).toISOString(),
  };
}
