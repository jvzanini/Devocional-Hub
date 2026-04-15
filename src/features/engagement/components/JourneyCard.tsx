import type { UserEngagementStats } from "../lib/types";
import { ACHIEVEMENTS, ACHIEVEMENTS_VIEW } from "../lib/achievements";
import { BadgeGrid } from "./BadgeGrid";
import { timeAgoPtBR } from "../lib/time-utils";

interface Props {
  stats: UserEngagementStats;
  unlocked: { key: string; unlockedAt: Date }[];
}

export function JourneyCard({ stats, unlocked }: Props) {
  const unlockedKeys = new Set(unlocked.map((u) => u.key));
  const lastUnlock = unlocked.length > 0
    ? [...unlocked].sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())[0]
    : null;
  const lastAchievement = lastUnlock ? ACHIEVEMENTS.find((a) => a.key === lastUnlock.key) : null;
  const nextTarget = ACHIEVEMENTS.find((a) => !unlockedKeys.has(a.key));

  if (stats.totalAttended === 0) {
    return (
      <section className="journey-card" aria-label="Sua jornada">
        <div className="journey-card__title">Sua Jornada</div>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Sua jornada começa no próximo devocional. Esperamos você! 🌱
        </p>
      </section>
    );
  }

  return (
    <section className="journey-card" aria-label="Sua jornada">
      <div className="journey-card__title">Sua Jornada</div>

      <div className="journey-card__stats">
        <div className="journey-card__stat" aria-label={`Streak atual: ${stats.currentStreak}`}>
          🔥 <strong>{stats.currentStreak}</strong> em sequência
        </div>
        <div className="journey-card__stat" aria-label={`Melhor streak: ${stats.bestStreak}`}>
          ⭐ Melhor: <strong>{stats.bestStreak}</strong>
        </div>
        <div className="journey-card__stat" aria-label={`Total de presenças: ${stats.totalAttended}`}>
          📘 <strong>{stats.totalAttended}</strong> devocionais
        </div>
      </div>

      <BadgeGrid
        catalog={ACHIEVEMENTS_VIEW}
        unlockedKeys={Array.from(unlockedKeys)}
      />

      {lastAchievement && lastUnlock && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
          Última conquista: <strong style={{ color: "var(--text)" }}>{lastAchievement.title}</strong> · {timeAgoPtBR(lastUnlock.unlockedAt)}
        </div>
      )}
      {!lastAchievement && nextTarget && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
          Próxima meta: <strong style={{ color: "var(--text)" }}>{nextTarget.title}</strong>
        </div>
      )}
    </section>
  );
}
