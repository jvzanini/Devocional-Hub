"use client";
import { useEffect, useState } from "react";
import type { UserJourney } from "../lib/user-journey";
import { BadgeIcon } from "./BadgeIcon";
import { timeAgoPtBR } from "../lib/time-utils";

export function MyJourneySection() {
  const [data, setData] = useState<UserJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/journey")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((json: UserJourney) => setData(json))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <section className="card" aria-label="Minha jornada" style={{ padding: 24, marginTop: 24 }}>
      <div className="section-title">Minha Jornada</div>
      <p style={{ color: "var(--text-muted)", margin: 0 }}>Carregando…</p>
    </section>
  );
  if (error) return (
    <section className="card" aria-label="Minha jornada" style={{ padding: 24, marginTop: 24 }}>
      <div className="section-title">Minha Jornada</div>
      <p style={{ color: "var(--accent)", margin: 0 }}>Erro: {error}</p>
    </section>
  );
  if (!data) return null;

  const totalAttended = data.stats.totalAttended;

  if (totalAttended === 0) {
    return (
      <section className="card" aria-label="Minha jornada" style={{ padding: 24, marginTop: 24 }}>
        <div className="section-title">Minha Jornada</div>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Sua jornada começa no próximo devocional. 🌱
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Minha jornada" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="section-title" style={{ marginBottom: 0 }}>Minha Jornada</div>

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
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{totalAttended}</div>
        </div>
        <div className="stat-card">
          <div className="section-title">Frequência</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{Math.round(data.stats.frequencyPct * 100)}%</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div className="section-title">Conquistas</div>
        {data.unlockedAchievements.length === 0 ? (
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Ainda não desbloqueou conquistas. Continue firme!</p>
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
    </section>
  );
}
