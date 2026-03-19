"use client";

import { useState } from "react";

interface Props {
  zoomMeetingId: string;
  zoomLink: string;
}

function generateICS(zoomLink: string): string {
  // Recurring daily event at 6:00 AM São Paulo time
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DevocionalHub//PT",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "DTSTART;TZID=America/Sao_Paulo:20260101T060000",
    "RRULE:FREQ=DAILY",
    "DURATION:PT1H",
    "SUMMARY:Devocional Diário",
    "DESCRIPTION:Devocional diário via Zoom\\n" + zoomLink,
    "URL:" + zoomLink,
    "LOCATION:" + zoomLink,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Devocional em 10 minutos!",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function AddToCalendarButton({ zoomMeetingId, zoomLink }: Props) {
  const [open, setOpen] = useState(false);

  function downloadICS() {
    const ics = generateICS(zoomLink);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "devocional-diario.ics";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function openGoogleCalendar() {
    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", "Devocional Diário");
    url.searchParams.set("details", `Devocional diário via Zoom\n${zoomLink}`);
    url.searchParams.set("location", zoomLink);
    url.searchParams.set("recur", "RRULE:FREQ=DAILY");
    window.open(url.toString(), "_blank");
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 12,
          border: "1px solid #e7e5e4",
          backgroundColor: "#ffffff",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          color: "#44403c",
          transition: "all 0.15s",
        }}
      >
        <svg style={{ width: 18, height: 18, color: "#d97706" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        Adicionar à Agenda
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          backgroundColor: "#ffffff",
          borderRadius: 14,
          border: "1px solid #e7e5e4",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          padding: 8,
          zIndex: 20,
          minWidth: 220,
          animation: "fadeIn 150ms ease-out",
        }}>
          <button
            onClick={openGoogleCalendar}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "#44403c",
              textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fafaf9")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 16 }}>G</span>
            </div>
            Google Calendar
          </button>

          <button
            onClick={downloadICS}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "#44403c",
              textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fafaf9")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#f5f5f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg style={{ width: 16, height: 16, color: "#57534e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            Apple / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  );
}
