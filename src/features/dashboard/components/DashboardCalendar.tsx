"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatChapterLabel } from "@/features/bible/lib/bible-abbreviations";

interface PlanDay { chapters: string; bookAbbr: string; completed: boolean; bookName?: string; }

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

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startDay = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function goToday() {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
  }

  const today = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const closePopover = useCallback(() => {
    setSelectedDay(null);
    setDaySummary(null);
  }, []);

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

  function isPastDate(key: string): boolean {
    return key < today;
  }

  function isFutureDate(key: string): boolean {
    return key > today;
  }

  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  return (
    <div className="calendar-container">
      {/* Header */}
      <div className="calendar-header">
        <span className="calendar-title">
          {MONTHS[month]} {year}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="btn-ghost"
              style={{ padding: "6px 14px", minHeight: 36, fontSize: 13 }}
            >
              Hoje
            </button>
          )}
          <button onClick={prev} aria-label="Mês anterior" className="btn-icon" style={{ width: 36, height: 36 }}>
            <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={next} aria-label="Próximo mês" className="btn-icon" style={{ width: 36, height: 36 }}>
            <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="calendar-weekdays">
        {DAYS.map(d => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const key = toDateKey(year, month, day);
          const hasDev = devSet.has(key);
          const isToday = key === today;
          const sessionId = dateToSessionId[key];
          const planDay = planDays[key];
          const past = isPastDate(key);
          const future = isFutureDate(key);

          // Determinar classe do cell
          const classes = [
            "calendar-cell",
            isToday ? "calendar-today" : "",
            hasDev && past ? "has-devotional-past" : "",
            hasDev && future ? "has-devotional-future" : "",
            hasDev && isToday ? "has-devotional-today" : "",
            !hasDev && planDay && future ? "has-plan-future" : "",
            !hasDev && planDay && past ? "has-plan-past" : "",
            (hasDev || planDay) ? "clickable" : "",
          ].filter(Boolean).join(" ");

          // Gerar label de legenda
          let label = "";
          if (planDay) {
            const bookName = planDay.bookName || planDay.bookAbbr;
            label = formatChapterLabel(bookName, planDay.chapters);
          }

          const cellContent = (
            <div
              className={classes}
              onClick={!hasDev && planDay ? () => handleDayClick(key) : undefined}
            >
              <span className="calendar-day-number">{day}</span>
              {label && (
                <div className="calendar-cell-label" style={{
                  color: hasDev
                    ? (past ? "var(--text-muted)" : "#fff")
                    : (planDay?.completed ? "var(--success)" : "var(--text-muted)"),
                  fontSize: 9,
                  fontWeight: 600,
                  lineHeight: 1,
                  marginTop: 2,
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}>
                  {label}
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

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-light)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(135deg, var(--accent), var(--accent-hover))" }} />
          Futuro (agendado)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: "2px solid var(--accent)", backgroundColor: "transparent" }} />
          Realizado
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: "3px solid var(--success)", backgroundColor: "var(--accent-light)" }} />
          Hoje
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "var(--surface-hover)", border: "1px solid var(--border)" }} />
          Plano de leitura
        </div>
      </div>

      {/* Day Summary Popover */}
      {selectedDay && (
        <div
          ref={popoverRef}
          className="day-summary-popover"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)" }}>
                {planDays[selectedDay]?.bookAbbr} — Cap. {planDays[selectedDay]?.chapters}
              </div>
              <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </div>
            </div>
            <button onClick={closePopover} className="btn-icon" style={{ width: 32, height: 32 }}>
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {summaryLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14 }}>
              <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Gerando resumo...
            </div>
          ) : (
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {daySummary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
