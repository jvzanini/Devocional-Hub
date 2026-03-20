"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface BookSession {
  id: string;
  chapterRef: string;
  summary: string;
  date: string;
  status: string;
  documentsCount: number;
  participantsCount: number;
}

interface BookData {
  name: string;
  code: string;
  abbr: string;
  testament: string;
  order: number;
  totalChapters: number;
  color: string;
  sessionCount: number;
  progress: number;
  sessions: BookSession[];
}

interface BooksPageClientProps {
  books: BookData[];
}

function ProgressCircle({ progress, size = 48 }: { progress: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
}

export function BooksPageClient({ books }: BooksPageClientProps) {
  const booksWithSessions = useMemo(
    () => books.filter((b) => b.sessionCount > 0),
    [books]
  );

  const [selectedBookCode, setSelectedBookCode] = useState<string>(
    booksWithSessions[0]?.code || books[0]?.code || ""
  );
  const [search, setSearch] = useState("");

  const selectedBook = useMemo(
    () => books.find((b) => b.code === selectedBookCode) || booksWithSessions[0] || books[0],
    [books, booksWithSessions, selectedBookCode]
  );

  const filteredSessions = useMemo(() => {
    if (!selectedBook) return [];
    const q = search.toLowerCase().trim();
    if (!q) return selectedBook.sessions;
    return selectedBook.sessions.filter(
      (s) =>
        s.chapterRef.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q)
    );
  }, [selectedBook, search]);

  const studiedCount = booksWithSessions.length;

  if (!selectedBook) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
        Nenhum devocional registrado ainda.
      </div>
    );
  }

  return (
    <div className="books-layout">
      {/* ─── LEFT PANEL: Lista de livros ─── */}
      <div className="books-sidebar">
        <div style={{ marginBottom: 20 }}>
          <div className="section-title">Devocional</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            {studiedCount} livro{studiedCount !== 1 ? "s" : ""} estudado{studiedCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", maxHeight: "calc(100vh - 240px)" }}>
          {booksWithSessions.map((book) => (
            <div
              key={book.code}
              className={`book-list-item${book.code === selectedBookCode ? " active" : ""}`}
              onClick={() => {
                setSelectedBookCode(book.code);
                setSearch("");
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: book.code === selectedBookCode ? 600 : 500,
                  color: book.code === selectedBookCode ? "var(--text)" : "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {book.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {book.sessionCount} devociona{book.sessionCount !== 1 ? "is" : "l"}
                </div>
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--accent)",
                flexShrink: 0,
                marginLeft: 8,
              }}>
                {book.progress}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── RIGHT PANEL: Conteúdo do livro ─── */}
      <div className="books-content">
        {/* Header do livro */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "var(--accent-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg style={{ width: 22, height: 22, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
                  {selectedBook.name}
                </h1>
                <span className="badge badge-info">
                  {selectedBook.testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}
                </span>
              </div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
                {selectedBook.sessionCount} devociona{selectedBook.sessionCount !== 1 ? "is" : "l"} · {selectedBook.sessions.filter(s => s.status === "COMPLETED").length} concluído{selectedBook.sessions.filter(s => s.status === "COMPLETED").length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Progress area */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div className="section-title" style={{ marginBottom: 2 }}>Progresso</div>
              <span style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
                {selectedBook.progress}%
              </span>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ProgressCircle progress={selectedBook.progress} size={56} />
              <span style={{
                position: "absolute",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
              }}>
                {selectedBook.sessions.filter(s => s.status === "COMPLETED").length}/{selectedBook.totalChapters}
              </span>
            </div>
          </div>
        </div>

        {/* Barra de busca */}
        <div style={{ position: "relative", marginBottom: 24 }}>
          <svg
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 18,
              height: 18,
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por capítulo ou tema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Grid de sessões */}
        {filteredSessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <svg style={{ width: 40, height: 40, margin: "0 auto 12px", color: "var(--text-muted)", opacity: 0.5 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
              {search ? "Nenhum devocional encontrado para essa busca." : "Nenhum devocional registrado para este livro."}
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}>
            {filteredSessions.map((s) => (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="book-card"
              >
                <div className="book-card-header">
                  <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>
                    {s.chapterRef || "Devocional"}
                  </span>
                  {s.status === "COMPLETED" && (
                    <span className="badge badge-success" style={{ fontSize: 11 }}>
                      Concluído
                    </span>
                  )}
                  {s.status === "RUNNING" && (
                    <span className="badge badge-warning" style={{ fontSize: 11 }}>
                      Processando
                    </span>
                  )}
                </div>
                <div className="book-card-body">
                  {s.summary && (
                    <p style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      margin: "0 0 12px",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}>
                      {s.summary}
                    </p>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {new Date(s.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                    </span>

                    <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      {s.participantsCount}
                    </span>

                    {s.documentsCount > 0 && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        {s.documentsCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
