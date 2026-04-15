"use client";
import { useEffect, useState } from "react";
import type { UserJourney } from "../lib/user-journey";
import { BadgeIcon } from "./BadgeIcon";
import { timeAgoPtBR } from "../lib/time-utils";

interface Props { userId: string; onClose: () => void; }

export function UserJourneyModal({ userId, onClose }: Props) {
  const [data, setData] = useState<UserJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${encodeURIComponent(userId)}/journey`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((json: UserJourney) => setData(json))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Jornada do usuário"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: "var(--radius-xl)",
          maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto",
          padding: 24, border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data ? data.user.name : "Carregando…"}
            </div>
            {data && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {data.user.email} {data.user.church && `· ${data.user.church}`} {data.user.team && `· ${data.user.team}`}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: 8, padding: "6px 10px", cursor: "pointer",
              color: "var(--text)", fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {loading && <div style={{ color: "var(--text-muted)" }}>Carregando jornada…</div>}
        {error && <div style={{ color: "var(--accent)" }}>Erro: {error}</div>}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="stats-row" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <div className="stat-card">
                <div className="section-title">Streak atual</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{data.stats.currentStreak}</div>
              </div>
              <div className="stat-card">
                <div className="section-title">Melhor streak</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{data.stats.bestStreak}</div>
              </div>
              <div className="stat-card">
                <div className="section-title">Presenças</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{data.stats.totalAttended}</div>
              </div>
              <div className="stat-card">
                <div className="section-title">Frequência</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{Math.round(data.stats.frequencyPct * 100)}%</div>
              </div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="section-title">Conquistas</div>
              {data.unlockedAchievements.length === 0 ? (
                <p style={{ color: "var(--text-muted)", margin: 0 }}>Ainda não desbloqueou conquistas.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.unlockedAchievements.map((a) => (
                    <li key={a.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ color: "var(--accent)" }}><BadgeIcon id={a.iconId} /></div>
                      <div style={{ flex: 1 }}>
                        <strong>{a.title}</strong>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.description}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{timeAgoPtBR(new Date(a.unlockedAt))}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="section-title">Presenças recentes</div>
              {data.recentAttendances.length === 0 ? (
                <p style={{ color: "var(--text-muted)", margin: 0 }}>Sem histórico de presença.</p>
              ) : (
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th scope="col">Data</th>
                      <th scope="col">Capítulo</th>
                      <th scope="col">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentAttendances.map((a) => (
                      <tr key={a.sessionId}>
                        <td>{new Date(a.date).toLocaleDateString("pt-BR")}</td>
                        <td>{a.chapterRef || "—"}</td>
                        <td>{a.durationMin} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="section-title">Livros participados</div>
              {data.booksParticipated.length === 0 ? (
                <p style={{ color: "var(--text-muted)", margin: 0 }}>Sem histórico de presença.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.booksParticipated.map((b) => (
                    <li key={b.name} style={{
                      padding: "6px 12px", borderRadius: 999,
                      border: "1px solid var(--border)",
                      fontSize: 13, color: "var(--text)",
                    }}>
                      {b.name} <strong style={{ color: "var(--accent)" }}>· {b.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
              Atualizado {timeAgoPtBR(new Date(data.computedAt))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
