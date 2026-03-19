"use client";

import { useState } from "react";

interface CalendarProps {
  /** ISO date strings (YYYY-MM-DD) that have devocionais */
  datesWithDevotional: string[];
  /** Map of date string to session id for navigation */
  dateToSessionId: Record<string, string>;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function DashboardCalendar({ datesWithDevotional, dateToSessionId }: CalendarProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const devSet = new Set(datesWithDevotional);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const today = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="section-card" style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={prev} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e7e5e4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c" }}>
          <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#1c1917" }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={next} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e7e5e4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c" }}>
          <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day names */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#a8a29e", padding: "4px 0" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const key = toDateKey(year, month, day);
          const hasDev = devSet.has(key);
          const isToday = key === today;
          const sessionId = dateToSessionId[key];

          const cellContent = (
            <div
              style={{
                textAlign: "center",
                padding: "10px 0",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: isToday ? 700 : 500,
                color: hasDev ? "#ffffff" : isToday ? "#d97706" : "#44403c",
                background: hasDev ? "linear-gradient(135deg, #d97706, #b45309)" : isToday ? "#fffbeb" : "transparent",
                cursor: hasDev ? "pointer" : "default",
                border: isToday && !hasDev ? "2px solid #fde68a" : "2px solid transparent",
                transition: "all 0.15s",
                position: "relative" as const,
              }}
            >
              {day}
              {hasDev && (
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#ffffff", margin: "4px auto 0", opacity: 0.7 }} />
              )}
            </div>
          );

          if (hasDev && sessionId) {
            return (
              <a key={key} href={`/session/${sessionId}`} style={{ textDecoration: "none" }}>
                {cellContent}
              </a>
            );
          }

          return <div key={key}>{cellContent}</div>;
        })}
      </div>
    </div>
  );
}
