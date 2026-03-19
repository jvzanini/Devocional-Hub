"use client";

import { useState } from "react";
import Link from "next/link";

interface BookSession {
  id: string;
  chapterRef: string;
  date: string;
  summary: string;
  status: string;
}

interface BibleBook {
  name: string;
  sessions: BookSession[];
}

interface Props {
  books: BibleBook[];
}

const BOOK_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  "Gênesis": { bg: "#ecfdf5", border: "#a7f3d0", accent: "#059669" },
  "Êxodo": { bg: "#eff6ff", border: "#bfdbfe", accent: "#2563eb" },
  "Salmos": { bg: "#ede9fe", border: "#c4b5fd", accent: "#7c3aed" },
  "Provérbios": { bg: "#fff7ed", border: "#fed7aa", accent: "#ea580c" },
  "Isaías": { bg: "#fef2f2", border: "#fecaca", accent: "#dc2626" },
  "Mateus": { bg: "#fffbeb", border: "#fde68a", accent: "#d97706" },
  "Marcos": { bg: "#f0fdf4", border: "#bbf7d0", accent: "#16a34a" },
  "Lucas": { bg: "#faf5ff", border: "#e9d5ff", accent: "#9333ea" },
  "João": { bg: "#eff6ff", border: "#bfdbfe", accent: "#2563eb" },
  "Atos": { bg: "#fff1f2", border: "#fecdd3", accent: "#e11d48" },
  "Romanos": { bg: "#f0f9ff", border: "#bae6fd", accent: "#0284c7" },
  "Apocalipse": { bg: "#fdf2f8", border: "#fbcfe8", accent: "#db2777" },
};

const DEFAULT_COLOR = { bg: "var(--surface-hover)", border: "var(--border)", accent: "var(--text-muted)" };

function getColor(bookName: string) {
  return BOOK_COLORS[bookName] || DEFAULT_COLOR;
}

export function BibleBooksGrid({ books }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {books.map((book) => {
          const color = getColor(book.name);
          const isExpanded = expanded === book.name;

          return (
            <div key={book.name}>
              <button
                onClick={() => setExpanded(isExpanded ? null : book.name)}
                style={{
                  width: "100%",
                  padding: "18px 16px",
                  borderRadius: 10,
                  border: `2px solid ${isExpanded ? color.accent : color.border}`,
                  backgroundColor: color.bg,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  boxShadow: isExpanded ? `0 6px 16px ${color.accent}18` : "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: color.accent, marginBottom: 4 }}>
                      {book.name}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                      {book.sessions.length} devocional{book.sessions.length !== 1 ? "is" : ""}
                    </div>
                  </div>
                  <svg
                    style={{
                      width: 20,
                      height: 20,
                      color: color.accent,
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                      transition: "transform 0.2s",
                    }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8, animation: "fadeIn 200ms ease-out" }}>
                  {book.sessions.map((s) => (
                    <Link
                      key={s.id}
                      href={`/session/${s.id}`}
                      style={{
                        display: "block",
                        padding: "14px 16px",
                        borderRadius: 8,
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                        textDecoration: "none",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                            {s.chapterRef}
                          </div>
                          {s.summary && (
                            <div style={{
                              fontSize: 13, color: "var(--text-secondary)", marginTop: 4,
                              overflow: "hidden", display: "-webkit-box",
                              WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
                            }}>
                              {s.summary}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {new Date(s.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </div>
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%", marginTop: 6, marginLeft: "auto",
                            backgroundColor: s.status === "COMPLETED" ? "var(--success)" : s.status === "ERROR" ? "var(--error)" : "var(--warning)",
                          }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {books.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
          <svg style={{ width: 40, height: 40, margin: "0 auto 12px", color: "var(--text-muted)", opacity: 0.5 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p style={{ fontSize: 16, fontWeight: 500 }}>Nenhum devocional processado ainda</p>
          <p style={{ fontSize: 14, marginTop: 6, color: "var(--text-muted)" }}>Os devocionais aparecerão aqui organizados por livro</p>
        </div>
      )}
    </div>
  );
}
