import { prisma } from "@/shared/lib/db";
import { computeUserEngagementStats, type SessionLike } from "./user-stats";
import { evaluateAchievements } from "./achievements";
import { persistUnlocks } from "./achievement-sync";
import type { EngagementResult } from "./types";

/**
 * Orquestra cálculo de stats + persistência de conquistas.
 * Recebe sessões já carregadas (single-fetch) e carrega apenas `Attendance` do usuário.
 * Regra de segurança: userId sempre vem de session.user.id server-side.
 */
export async function getUserEngagementStats(
  userId: string,
  sessionsAlreadyLoaded: SessionLike[]
): Promise<EngagementResult> {
  const [attendances, existingBefore] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId },
      select: { sessionId: true, joinTime: true },
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { key: true, unlockedAt: true },
    }),
  ]);

  const stats = computeUserEngagementStats(sessionsAlreadyLoaded, attendances);
  const hasPreExisting = existingBefore.length > 0;

  const evaluated = evaluateAchievements(stats);
  const { allUnlocked, newlyUnlockedKeys } = await persistUnlocks(userId, evaluated, existingBefore);

  const silent = !hasPreExisting && stats.totalAttended >= 2;

  return {
    stats,
    allUnlocked,
    newlyUnlockedKeys: silent ? [] : newlyUnlockedKeys,
    silent,
  };
}
