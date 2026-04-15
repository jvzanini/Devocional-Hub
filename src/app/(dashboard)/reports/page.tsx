"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";

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
  const [filterSubTeam, setFilterSubTeam] = useState("");
  const [filterBook, setFilterBook] = useState("");

  // Toggle states
  const [chartMode, setChartMode] = useState<"week" | "month">("week");
  const [tableMode, setTableMode] = useState<"weekly" | "monthly" | "yearly">("monthly");

  // Data states
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("MEMBER");

  // Buscar role do usuário logado
  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.role) setUserRole(data.role); })
      .catch(() => {});
  }, []);

  const isAdminUser = ["SUPER_ADMIN", "ADMIN"].includes(userRole);

  // Computed unique values for filter dropdowns
  const churches = Array.from(new Set(users.map(u => u.church).filter(Boolean))).sort();
  const teams = Array.from(new Set(users.map(u => u.team).filter(Boolean))).sort();
  const subTeams = Array.from(new Set(users.map(u => u.subTeam).filter(Boolean))).sort();

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

  // ─── Books from sessions ────────────────────────

  const books = Array.from(
    new Set(
      attendances
        .map(a => {
          const ref = a.session?.chapterRef || "";
          const match = ref.match(/^(.+?)\s+\d/);
          return match ? match[1].trim() : ref.trim();
        })
        .filter(Boolean)
    )
  ).sort();

  // ─── Filter attendances by book & subTeam ──────

  const filteredAttendances = attendances.filter(a => {
    if (filterSubTeam && a.user?.subTeam !== filterSubTeam) return false;
    if (filterBook) {
      const ref = a.session?.chapterRef || "";
      const match = ref.match(/^(.+?)\s+\d/);
      const bookName = match ? match[1].trim() : ref.trim();
      if (bookName !== filterBook) return false;
    }
    return true;
  });

  // ─── Computed stats ──────────────────────────────

  const totalAttendances = filteredAttendances.length;

  const uniqueMembers = new Set(filteredAttendances.map(a => a.user?.id || a.userId)).size;

  const uniqueSessions = new Set(filteredAttendances.map(a => a.session?.id)).size;

  const avgFrequency = uniqueSessions > 0 && uniqueMembers > 0
    ? Math.round((totalAttendances / (uniqueMembers * uniqueSessions)) * 100)
    : 0;

  // ─── Weekly chart data ───────────────────────────

  const chartData: WeeklyData[] = (() => {
    if (chartMode === "month") {
      const months: Record<number, number> = {};
      for (const att of filteredAttendances) {
        const date = new Date(att.joinTime || att.session?.date);
        const m = date.getMonth();
        months[m] = (months[m] || 0) + 1;
      }
      return MONTH_NAMES.map((name, i) => ({
        name: name.substring(0, 3),
        presenças: months[i] || 0,
      })).filter(d => d.presenças > 0 || true);
    }
    const weeks: Record<number, number> = {};
    for (const att of filteredAttendances) {
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

  // ─── Line chart data (frequency evolution) ────

  const frequencyLineData = (() => {
    if (chartMode === "month") {
      const monthSessions: Record<number, Set<string>> = {};
      const monthMembers: Record<number, Set<string>> = {};
      const monthAttendances: Record<number, number> = {};
      for (const att of filteredAttendances) {
        const date = new Date(att.joinTime || att.session?.date);
        const m = date.getMonth();
        if (!monthSessions[m]) monthSessions[m] = new Set();
        if (!monthMembers[m]) monthMembers[m] = new Set();
        monthSessions[m].add(att.session?.id || "");
        monthMembers[m].add(att.user?.id || att.userId);
        monthAttendances[m] = (monthAttendances[m] || 0) + 1;
      }
      return MONTH_NAMES.map((name, i) => {
        const sess = monthSessions[i]?.size || 0;
        const memb = monthMembers[i]?.size || 0;
        const att = monthAttendances[i] || 0;
        const freq = sess > 0 && memb > 0 ? Math.round((att / (memb * sess)) * 100) : 0;
        return { name: name.substring(0, 3), frequência: freq };
      });
    }
    const weekSessions: Record<number, Set<string>> = {};
    const weekMembers: Record<number, Set<string>> = {};
    const weekAttendances: Record<number, number> = {};
    for (const att of filteredAttendances) {
      const date = new Date(att.joinTime || att.session?.date);
      const w = getWeekNumber(date);
      if (!weekSessions[w]) weekSessions[w] = new Set();
      if (!weekMembers[w]) weekMembers[w] = new Set();
      weekSessions[w].add(att.session?.id || "");
      weekMembers[w].add(att.user?.id || att.userId);
      weekAttendances[w] = (weekAttendances[w] || 0) + 1;
    }
    const maxWeek = Math.max(5, ...Object.keys(weekAttendances).map(Number));
    const result = [];
    for (let w = 1; w <= maxWeek; w++) {
      const sess = weekSessions[w]?.size || 0;
      const memb = weekMembers[w]?.size || 0;
      const att = weekAttendances[w] || 0;
      const freq = sess > 0 && memb > 0 ? Math.round((att / (memb * sess)) * 100) : 0;
      result.push({ name: `Sem ${w}`, frequência: freq });
    }
    return result;
  })();

  // ─── User detail table ──────────────────────────

  const userStatsMap = new Map<string, UserStats>();
  for (const att of filteredAttendances) {
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
  const avgDuration = filteredAttendances.length > 0
    ? Math.round(filteredAttendances.reduce((sum, a) => sum + (a.duration || 0), 0) / filteredAttendances.length / 60)
    : 0;

  // ─── Render ──────────────────────────────────────

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>Relatórios</h1>
      </div>

      {/* Filtros em linha horizontal */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
        <select className="input-field" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100, fontSize: 13 }}>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input-field" value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 130, fontSize: 13 }}>
          {MONTH_NAMES.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
        </select>
        <select className="input-field" value={filterBook} onChange={e => setFilterBook(e.target.value)} style={{ width: 130, fontSize: 13 }}>
          <option value="">Livro: Todos</option>
          {books.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {isAdminUser && (
          <>
            <select className="input-field" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ width: 160, fontSize: 13 }}>
              <option value="">Usuário: Todos</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select className="input-field" value={filterChurch} onChange={e => setFilterChurch(e.target.value)} style={{ width: 130, fontSize: 13 }}>
              <option value="">Igreja: Todas</option>
              {churches.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input-field" value={filterTeam} onChange={e => setFilterTeam(e.target.value)} style={{ width: 130, fontSize: 13 }}>
              <option value="">Equipe: Todas</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="input-field" value={filterSubTeam} onChange={e => setFilterSubTeam(e.target.value)} style={{ width: 130, fontSize: 13 }}>
              <option value="">SubEquipe: Todas</option>
              {subTeams.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </>
        )}
        <button className="btn-outline" onClick={handleExport} style={{ borderColor: "var(--accent)", color: "var(--accent)", fontSize: 13 }}>
          <IconDownload size={14} />
          Exportar
        </button>
      </div>

      {/* Stats cards (4 cards) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="reports-stat-card">
          <div style={{ color: "var(--success)", marginBottom: 10 }}><IconCheck size={28} /></div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Total Presenças</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{loading ? "..." : totalAttendances}</div>
        </div>
        <div className="reports-stat-card">
          <div style={{ color: "var(--text-secondary)", marginBottom: 10 }}><IconPeople size={28} /></div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Membros Únicos</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{loading ? "..." : uniqueMembers}</div>
        </div>
        <div className="reports-stat-card">
          <div style={{ color: "var(--accent)", marginBottom: 10 }}><IconChart size={28} /></div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Freq. Média</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>{loading ? "..." : `${avgFrequency}%`}</div>
        </div>
        <div className="reports-stat-card">
          <div style={{ color: "var(--text-secondary)", marginBottom: 10 }}>
            <svg width={28} height={28} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Duração Média</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{loading ? "..." : `${avgDuration}min`}</div>
        </div>
      </div>

      {/* Chart section */}
      <div className="reports-chart-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            Presenças por {chartMode === "week" ? "Semana" : "Mês"}
          </h2>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setChartMode("week")}
              style={{
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: chartMode === "week" ? "var(--accent)" : "var(--surface)",
                color: chartMode === "week" ? "#fff" : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              Semana
            </button>
            <button
              onClick={() => setChartMode("month")}
              style={{
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                borderLeft: "1px solid var(--border)",
                cursor: "pointer",
                backgroundColor: chartMode === "month" ? "var(--accent)" : "var(--surface)",
                color: chartMode === "month" ? "#fff" : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              Mês
            </button>
          </div>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
              Carregando...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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

      {/* Line chart — Frequency evolution */}
      <div className="reports-chart-card" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 20px" }}>
          Evolução da Frequência (%)
        </h2>
        <div style={{ width: "100%", height: 260 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
              Carregando...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={frequencyLineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
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
                  formatter={(value) => [`${value}%`, "Frequência"]}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="frequência"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--accent)", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table section */}
      <div className="reports-table-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            Detalhamento por Usuário
          </h2>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
            {(["weekly", "monthly", "yearly"] as const).map((mode, i) => (
              <button
                key={mode}
                onClick={() => setTableMode(mode)}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                  backgroundColor: tableMode === mode ? "var(--accent)" : "var(--surface)",
                  color: tableMode === mode ? "#fff" : "var(--text-muted)",
                  transition: "all 0.2s",
                }}
              >
                {mode === "weekly" ? "Semanal" : mode === "monthly" ? "Mensal" : "Anual"}
              </button>
            ))}
          </div>
        </div>

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
