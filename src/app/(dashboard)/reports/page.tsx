"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─── Types ────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  userId: string;
  joinTime: string;
  leaveTime: string;
  duration: number;
  user: { id: string; name: string; email: string; church: string; team: string; subTeam: string };
  session: { id: string; date: string; chapterRef: string };
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  church: string;
  team: string;
  subTeam: string;
  active: boolean;
}

interface WeeklyData {
  name: string;
  presenças: number;
}

interface UserStats {
  userId: string;
  name: string;
  attendances: number;
  frequency: number;
  lastPresence: string;
}

// ─── SVG Icons ────────────────────────────────────────

function IconChart({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-4 4 4 6-6" />
    </svg>
  );
}

function IconFilter({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  );
}

function IconCheck({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconPeople({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function IconDownload({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const AVATAR_COLORS = [
  "#e57373", "#f06292", "#ba68c8", "#9575cd", "#7986cb",
  "#64b5f6", "#4fc3f7", "#4dd0e1", "#4db6ac", "#81c784",
  "#aed581", "#dce775", "#ffd54f", "#ffb74d", "#ff8a65",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getFrequencyColor(pct: number): string {
  if (pct >= 75) return "var(--success)";
  if (pct >= 50) return "var(--accent)";
  return "var(--error)";
}

function getWeekNumber(date: Date): number {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  return Math.ceil((dayOfMonth + startOfMonth.getDay()) / 7);
}

// ─── Page Component ──────────────────────────────────

export default function ReportsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Filter states
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [filterUser, setFilterUser] = useState("");
  const [filterChurch, setFilterChurch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");

  // Data states
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Computed unique values for filter dropdowns
  const churches = Array.from(new Set(users.map(u => u.church).filter(Boolean))).sort();
  const teams = Array.from(new Set(users.map(u => u.team).filter(Boolean))).sort();

  // Year options (current year + 2 previous)
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear];

  // ─── Fetch users ─────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
    }
  }, []);

  // ─── Fetch attendance ────────────────────────────

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;
      const params = new URLSearchParams({ month: monthStr });
      if (filterUser) params.set("userId", filterUser);
      if (filterChurch) params.set("church", filterChurch);
      if (filterTeam) params.set("team", filterTeam);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // API returns array (admin all users) or { attendances, stats } (specific user)
        const records: AttendanceRecord[] = Array.isArray(data) ? data : data.attendances || [];
        setAttendances(records);
      }
    } catch (err) {
      console.error("Erro ao buscar presenças:", err);
    } finally {
      setLoading(false);
    }
  }, [year, month, filterUser, filterChurch, filterTeam]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // ─── Computed stats ──────────────────────────────

  const totalAttendances = attendances.length;

  const uniqueMembers = new Set(attendances.map(a => a.user?.id || a.userId)).size;

  const uniqueSessions = new Set(attendances.map(a => a.session?.id)).size;

  const avgFrequency = uniqueSessions > 0 && uniqueMembers > 0
    ? Math.round((totalAttendances / (uniqueMembers * uniqueSessions)) * 100)
    : 0;

  // ─── Weekly chart data ───────────────────────────

  const weeklyData: WeeklyData[] = (() => {
    const weeks: Record<number, number> = {};
    for (const att of attendances) {
      const date = new Date(att.joinTime || att.session?.date);
      const week = getWeekNumber(date);
      weeks[week] = (weeks[week] || 0) + 1;
    }
    const maxWeek = Math.max(5, ...Object.keys(weeks).map(Number));
    const result: WeeklyData[] = [];
    for (let w = 1; w <= maxWeek; w++) {
      result.push({ name: `Sem ${w}`, presenças: weeks[w] || 0 });
    }
    return result;
  })();

  // ─── User detail table ──────────────────────────

  const userStatsMap = new Map<string, UserStats>();
  for (const att of attendances) {
    const uid = att.user?.id || att.userId;
    const name = att.user?.name || "Desconhecido";
    if (!userStatsMap.has(uid)) {
      userStatsMap.set(uid, {
        userId: uid,
        name,
        attendances: 0,
        frequency: 0,
        lastPresence: att.joinTime || att.session?.date || "",
      });
    }
    const stats = userStatsMap.get(uid)!;
    stats.attendances += 1;
    const attDate = att.joinTime || att.session?.date || "";
    if (attDate > stats.lastPresence) stats.lastPresence = attDate;
  }

  const userStatsList = Array.from(userStatsMap.values())
    .map(u => ({
      ...u,
      frequency: uniqueSessions > 0 ? Math.round((u.attendances / uniqueSessions) * 100) : 0,
    }))
    .sort((a, b) => b.attendances - a.attendances);

  // ─── Export CSV ──────────────────────────────────

  function handleExport() {
    const headers = ["Membro", "Presenças", "Frequência (%)", "Última Presença"];
    const rows = userStatsList.map(u => [
      u.name,
      u.attendances.toString(),
      u.frequency.toString(),
      u.lastPresence ? formatDate(u.lastPresence) : "-",
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Computed extras ────────────────────────────

  const topMember = userStatsList.length > 0 ? userStatsList[0] : null;
  const avgDuration = attendances.length > 0
    ? Math.round(attendances.reduce((sum, a) => sum + (a.duration || 0), 0) / attendances.length / 60)
    : 0;

  // ─── Render ──────────────────────────────────────

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>Relatórios</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="input-field"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ width: 110 }}
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{ width: 150 }}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
          <button
            className="btn-outline"
            onClick={handleExport}
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            <IconDownload size={16} />
            Exportar
          </button>
        </div>
      </div>

      {/* Top grid: Filters + Stats */}
      <div className="reports-top-grid">
        {/* Filters card */}
        <div className="section-card">
          <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <IconFilter size={14} />
            Filtros
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Usuário Específico</label>
              <select
                className="input-field"
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                style={{ width: "100%", fontSize: 14 }}
              >
                <option value="">Todos os usuários</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Igreja</label>
              <select
                className="input-field"
                value={filterChurch}
                onChange={e => setFilterChurch(e.target.value)}
                style={{ width: "100%", fontSize: 14 }}
              >
                <option value="">Todas</option>
                {churches.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Equipe</label>
              <select
                className="input-field"
                value={filterTeam}
                onChange={e => setFilterTeam(e.target.value)}
                style={{ width: "100%", fontSize: 14 }}
              >
                <option value="">Todas</option>
                {teams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="reports-stats-row">
          <div className="reports-stat-card">
            <div style={{ color: "var(--success)", marginBottom: 10 }}>
              <IconCheck size={28} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Total Presenças
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
              {loading ? "..." : totalAttendances}
            </div>
          </div>

          <div className="reports-stat-card">
            <div style={{ color: "var(--text-secondary)", marginBottom: 10 }}>
              <IconPeople size={28} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Membros Únicos
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
              {loading ? "..." : uniqueMembers}
            </div>
          </div>

          <div className="reports-stat-card">
            <div style={{ color: "var(--accent)", marginBottom: 10 }}>
              <IconChart size={28} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Freq. Média
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
              {loading ? "..." : `${avgFrequency}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Summary insights row */}
      {!loading && userStatsList.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div className="section-card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>Sessões no mês</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{uniqueSessions}</div>
          </div>
          {topMember && (
            <div className="section-card" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>Membro mais presente</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{topMember.name}</div>
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{topMember.attendances} presenças</div>
            </div>
          )}
          {avgDuration > 0 && (
            <div className="section-card" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>Duração média</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>{avgDuration}min</div>
            </div>
          )}
          <div className="section-card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>Período</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{MONTH_NAMES[month - 1]} {year}</div>
          </div>
        </div>
      )}

      {/* Chart section */}
      <div className="reports-chart-card">
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 20px" }}>
          Presenças por Semana
        </h2>
        <div style={{ width: "100%", height: 280 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
              Carregando...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-muted)", fontSize: 13 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 13 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    color: "var(--text)",
                    fontSize: 14,
                    padding: "10px 14px",
                    boxShadow: "var(--shadow-md)",
                  }}
                  cursor={{ fill: "var(--surface-hover)" }}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Bar dataKey="presenças" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table section */}
      <div className="reports-table-card">
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 20px" }}>
          Detalhamento por Usuário
        </h2>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Carregando...</div>
        ) : userStatsList.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            Nenhuma presença registrada neste período.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="reports-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Membro</th>
                  <th style={{ textAlign: "center" }}>Presenças</th>
                  <th style={{ textAlign: "left", minWidth: 180 }}>Frequência</th>
                  <th style={{ textAlign: "right" }}>Última Presença</th>
                </tr>
              </thead>
              <tbody>
                {userStatsList.map(u => (
                  <tr key={u.userId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          className="avatar-sm"
                          style={{ backgroundColor: getAvatarColor(u.name) }}
                        >
                          {getInitials(u.name)}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                      {u.attendances}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(u.frequency, 100)}%`,
                              backgroundColor: getFrequencyColor(u.frequency),
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: getFrequencyColor(u.frequency), minWidth: 40, textAlign: "right" }}>
                          {u.frequency}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontSize: 13, color: "var(--text-secondary)" }}>
                      {u.lastPresence ? formatDate(u.lastPresence) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
