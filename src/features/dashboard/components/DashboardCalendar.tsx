"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [daySummary, setDaySummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const closePopover = useCallback(() => {
    setSelectedDay(null);
    setDaySummary(null);
  }, []);

  // Close popover on click outside or Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePopover();
    }
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closePopover();
      }
    }
    if (selectedDay) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [selectedDay, closePopover]);

  async function handleDayClick(key: string) {
    const planDay = planDays[key];
    if (!planDay) return;

    setSelectedDay(key);
    setDaySummary(null);
    setSummaryLoading(true);

    try {
      const res = await fetch(`/api/dashboard/day-summary?date=${key}`);
      if (res.ok) {
        const data = await res.json();
        setDaySummary(data.summary || "Resumo não disponível.");
      } else {
        setDaySummary("Não foi possível carregar o resumo.");
      }
    } catch {
      setDaySummary("Erro ao carregar resumo.");
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div className="section-card" style={{ padding: 18, position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={prev} aria-label="Mês anterior" className="btn-icon">
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#1c1917" }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={next} aria-label="Próximo mês" className="btn-icon">
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day names */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#a8a29e", padding: 3 }}>
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
          const planDay = planDays[key];

          const cellContent = (
            <div
              onClick={!hasDev && planDay ? () => handleDayClick(key) : undefined}
              style={{
                textAlign: "center",
                padding: planDay ? "6px 2px 4px" : "8px 2px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: isToday ? 700 : 500,
                color: hasDev ? "#ffffff" : isToday ? "#d97706" : "#44403c",
                background: hasDev ? "linear-gradient(135deg, #d97706, #b45309)" : isToday ? "#fffbeb" : "transparent",
                cursor: hasDev || planDay ? "pointer" : "default",
                border: isToday && !hasDev ? "2px solid #fde68a" : "2px solid transparent",
                transition: "all 0.15s",
                minHeight: planDay ? 50 : 40,
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
                  fontSize: 10, fontWeight: 600, marginTop: 1, lineHeight: 1,
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

      {/* Day Summary Popover */}
      {selectedDay && (
        <div ref={popoverRef} className="day-summary-popover" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1c1917" }}>
                {planDays[selectedDay]?.bookAbbr} — Cap. {planDays[selectedDay]?.chapters}
              </div>
              <div style={{ fontSize: 13, color: "#78716c" }}>
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </div>
            </div>
            <button onClick={closePopover} className="btn-icon" style={{ width: 28, height: 28 }}>
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {summaryLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#78716c", fontSize: 14 }}>
              <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Gerando resumo...
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "#44403c", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {daySummary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
