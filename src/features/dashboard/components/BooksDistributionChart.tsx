"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface BookData {
  name: string;
  sessions: number;
}

interface BooksDistributionChartProps {
  data: BookData[];
}

const COLORS = [
  "#f5a623", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#f97316", "#06b6d4", "#84cc16", "#e11d48",
  "#6366f1", "#14b8a6", "#f59e0b", "#64748b", "#a855f7",
  "#22c55e", "#0ea5e9", "#d946ef", "#fb923c", "#2dd4bf",
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: BookData & { percent: number };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  const percent = entry.payload.percent;
  return (
    <div
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
        {entry.name}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
        {entry.value} sessões ({percent.toFixed(1)}%)
      </p>
    </div>
  );
}

export function BooksDistributionChart({ data }: BooksDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 14,
        }}
      >
        Nenhum devocional concluído ainda.
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.sessions, 0);
  const chartData = data.map((d) => ({
    ...d,
    percent: total > 0 ? (d.sessions / total) * 100 : 0,
  }));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
      {/* Gráfico com total no centro */}
      <div style={{ width: 180, height: 180, flexShrink: 0, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="sessions"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={50}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  style={{ outline: "none", cursor: "pointer" }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>sessões</div>
        </div>
      </div>

      {/* Legenda integrada com barras de proporção */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {chartData.slice(0, 10).map((entry, index) => (
            <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS[index % COLORS.length], flexShrink: 0 }} />
              <span style={{ color: "var(--text)", fontWeight: 500, fontSize: 14, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {entry.name}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {entry.sessions}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 12, flexShrink: 0, width: 38, textAlign: "right" }}>
                {entry.percent.toFixed(0)}%
              </span>
            </div>
          ))}
          {chartData.length > 10 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", paddingTop: 4 }}>
              +{chartData.length - 10} outro{chartData.length - 10 !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
