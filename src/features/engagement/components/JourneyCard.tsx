import type { UserEngagementStats } from "../lib/types";
import { ACHIEVEMENTS, ACHIEVEMENTS_VIEW } from "../lib/achievements";
import { BadgeGrid } from "./BadgeGrid";
import { timeAgoPtBR } from "../lib/time-utils";

interface Props {
  stats: UserEngagementStats;
  unlocked: { key: string; unlockedAt: Date }[];
  recentlyUnlockedKeys?: string[];
}

export function JourneyCard({ stats, unlocked, recentlyUnlockedKeys }: Props) {
  const unlockedKeys = new Set(unlocked.map((u) => u.key));
  const lastUnlock =
    unlocked.length > 0
      ? [...unlocked].sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())[0]
      : null;
  const lastAch = lastUnlock ? ACHIEVEMENTS.find((a) => a.key === lastUnlock.key) : null;
  const nextTarget = ACHIEVEMENTS.find((a) => !unlockedKeys.has(a.key));

  return (
    <section className="card" aria-label="Sua jornada" style={{ padding: 24, marginBottom: 24 }}>
      <div className="section-title" style={{ marginBottom: 16 }}>
        Sua Jornada
      </div>

      {stats.totalAttended === 0 ? (
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Sua jornada começa no próximo devocional. 🌱
        </p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              marginBottom: 20,
              alignItems: "baseline",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--accent)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {stats.currentStreak}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 6 }}>
                em sequência
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {stats.bestStreak}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 6 }}>
                melhor
              </span>
            </div>
            <div>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {stats.totalAttended}
              </span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 6 }}>
                devocionais
              </span>
            </div>
          </div>

          <BadgeGrid
            catalog={ACHIEVEMENTS_VIEW}
            unlockedKeys={Array.from(unlockedKeys)}
            recentlyUnlockedKeys={recentlyUnlockedKeys}
          />

          {lastAch && lastUnlock && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
              Última conquista:{" "}
              <strong style={{ color: "var(--text)" }}>{lastAch.title}</strong> ·{" "}
              {timeAgoPtBR(lastUnlock.unlockedAt)}
            </div>
          )}
          {!lastAch && nextTarget && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
              Próxima meta:{" "}
              <strong style={{ color: "var(--text)" }}>{nextTarget.title}</strong>
            </div>
          )}
        </>
      )}
    </section>
  );
}
