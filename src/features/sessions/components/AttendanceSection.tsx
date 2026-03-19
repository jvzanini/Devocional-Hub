"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface AttendanceData {
  joinTime: string;
  session: { date: string; chapterRef: string; status: string };
}

interface AttendanceStats {
  totalAttended: number;
  totalSessions: number;
  percentage: number;
}

interface ApiResponse {
  attendances: AttendanceData[];
  stats: AttendanceStats;
}

interface WeekChartData {
  name: string;
  percentual: number;
}

interface Props {
  userId: string;
}

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const firstDayWeekday = (firstDay.getDay() + 6) % 7; // Segunda = 0
  return Math.ceil((dayOfMonth + firstDayWeekday) / 7);
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Segunda = 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function AttendanceSection({ userId }: Props) {
  const [attendances, setAttendances] = useState<AttendanceData[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [weeklyPercent, setWeeklyPercent] = useState(0);
  const [monthlyPercent, setMonthlyPercent] = useState(0);
  const [chartData, setChartData] = useState<WeekChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/attendance?userId=${userId}`);
        if (!res.ok) throw new Error("Erro ao buscar presenças");
        const data: ApiResponse = await res.json();

        setAttendances(data.attendances);
        setStats(data.stats);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Calcular % semanal
        const weekStart = getStartOfWeek(now);
        const weekEnd = getEndOfWeek(weekStart);
        const weekSessions = data.attendances.filter((a) => {
          const d = new Date(a.session.date);
          return d >= weekStart && d <= weekEnd;
        });
        const weekTotal = weekSessions.length;
        const weekSessionsCount = data.attendances.filter((a) => {
          const d = new Date(a.session.date);
          return d >= weekStart && d <= weekEnd && a.session.status === "COMPLETED";
        }).length;

        // Contar sessões únicas da semana (pelo date)
        const uniqueWeekDates = new Set(
          data.attendances
            .filter((a) => {
              const d = new Date(a.session.date);
              return d >= weekStart && d <= weekEnd;
            })
            .map((a) => a.session.date)
        );
        const weekSessionCount = uniqueWeekDates.size || 1;
        setWeeklyPercent(weekTotal > 0 ? Math.round((weekTotal / weekSessionCount) * 100) : 0);

        // Calcular % mensal
        const monthAttendances = data.attendances.filter((a) => {
          const d = new Date(a.session.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const uniqueMonthDates = new Set(monthAttendances.map((a) => a.session.date));
        const monthSessionCount = uniqueMonthDates.size || 1;
        setMonthlyPercent(
          monthAttendances.length > 0
            ? Math.round((monthAttendances.length / monthSessionCount) * 100)
            : 0
        );

        // Dados do gráfico: 4 semanas do mês atual
        const weeks: WeekChartData[] = [];
        for (let w = 1; w <= 4; w++) {
          const weekAttendances = monthAttendances.filter((a) => {
            const d = new Date(a.session.date);
            return getWeekOfMonth(d) === w;
          });
          const weekDates = new Set(weekAttendances.map((a) => a.session.date));
          const sessionsInWeek = weekDates.size;
          const pct = sessionsInWeek > 0 ? Math.round((weekAttendances.length / sessionsInWeek) * 100) : 0;
          weeks.push({ name: `Sem ${w}`, percentual: pct });
        }
        setChartData(weeks);
      } catch (err) {
        console.error("Erro ao carregar presenças:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="section-card" style={{ padding: 18 }}>
        <div
          style={{
            height: 20,
            width: 180,
            backgroundColor: "#e7e5e4",
            borderRadius: 8,
            marginBottom: 16,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div className="attendance-stats">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 80,
                backgroundColor: "#f5f5f4",
                borderRadius: 12,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
        <div
          style={{
            height: 280,
            backgroundColor: "#f5f5f4",
            borderRadius: 12,
            marginTop: 16,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div className="section-card" style={{ padding: 18 }}>
      <h3
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "#1c1917",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#d97706",
            display: "inline-block",
          }}
        />
        Presenças
      </h3>

      <div className="attendance-stats">
        {/* Total de presenças */}
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: 14,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "#78716c", marginBottom: 4 }}>Total de Presenças</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#1c1917", margin: 0 }}>
            {stats?.totalAttended ?? 0}
          </p>
          <p style={{ fontSize: 13, color: "#78716c", marginTop: 4 }}>
            de {stats?.totalSessions ?? 0} sessões
          </p>
        </div>

        {/* % Semanal */}
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: 14,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "#78716c", marginBottom: 4 }}>Frequência Semanal</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#d97706", margin: 0 }}>
            {weeklyPercent}%
          </p>
          <p style={{ fontSize: 13, color: "#78716c", marginTop: 4 }}>esta semana</p>
        </div>

        {/* % Mensal */}
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 12,
            padding: 14,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "#78716c", marginBottom: 4 }}>Frequência Mensal</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#d97706", margin: 0 }}>
            {monthlyPercent}%
          </p>
          <p style={{ fontSize: 13, color: "#78716c", marginTop: 4 }}>este mês</p>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div style={{ marginTop: 20 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1c1917", marginBottom: 12 }}>
          Presença por Semana
        </p>
        <div className="chart-container">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 13, fill: "#78716c" }}
                  axisLine={{ stroke: "#e7e5e4" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 13, fill: "#78716c" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Presença"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e7e5e4",
                    borderRadius: 10,
                    fontSize: 13,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  cursor={{ fill: "rgba(217, 119, 6, 0.08)" }}
                />
                <Bar
                  dataKey="percentual"
                  fill="#fbbf24"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  stroke="#d97706"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#78716c",
                fontSize: 14,
              }}
            >
              Nenhum dado de presença disponível
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
