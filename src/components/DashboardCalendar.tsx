"use client";

import { useState } from "react";

interface PlanDay { chapters: string; bookAbbr: string; completed: boolean; }

interface CalendarProps {
  datesWithDevotional: string[];
  dateToSessionId: Record<string, string>;
  planDays?: Record<string, PlanDay>;
}

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function DashboardCalendar({ datesWithDevotional, dateToSessionId, planDays = {} }: CalendarProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const devSet = new Set(datesWithDevotional);

  // Start on Monday
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startDay = (firstDayOfMonth + 6) % 7; // Monday = 0
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
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="section-card" style={{ padding: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={prev} aria-label="Mês anterior" className="btn-icon">
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#1c1917" }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={next} aria-label="Próximo mês" className="btn-icon">
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day names */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 6 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#a8a29e", padding: 3 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const key = toDateKey(year, month, day);
          const hasDev = devSet.has(key);
          const isToday = key === today;
          const sessionId = dateToSessionId[key];
          const planDay = planDays[key];

          const cellContent = (
            <div
              style={{
                textAlign: "center",
                padding: planDay ? "6px 2px 4px" : "8px 2px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: isToday ? 700 : 500,
                color: hasDev ? "#ffffff" : isToday ? "#d97706" : "#44403c",
                background: hasDev ? "linear-gradient(135deg, #d97706, #b45309)" : isToday ? "#fffbeb" : "transparent",
                cursor: hasDev ? "pointer" : "default",
                border: isToday && !hasDev ? "2px solid #fde68a" : "2px solid transparent",
                transition: "all 0.15s",
                minHeight: planDay ? 48 : 36,
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span>{day}</span>
              {hasDev && !planDay && (
                <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#ffffff", marginTop: 2, opacity: 0.7 }} />
              )}
              {planDay && !hasDev && (
                <div style={{
                  fontSize: 9, fontWeight: 600, marginTop: 1, lineHeight: 1,
                  color: planDay.completed ? "#059669" : "#a8a29e",
                }}>
                  {planDay.bookAbbr} {planDay.chapters.split("-")[0]}
                </div>
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
