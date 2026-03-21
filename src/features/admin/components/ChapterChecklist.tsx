"use client";

import { useCallback } from "react";

interface ChapterChecklistProps {
  chapters: { chapter: number; isComplete: boolean; isPartial: boolean; sessions: number }[];
  onToggleComplete: (chapter: number) => void;
  onTogglePartial: (chapter: number) => void;
}

function CheckmarkIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

export function ChapterChecklist({ chapters, onToggleComplete, onTogglePartial }: ChapterChecklistProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: () => void) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        action();
      }
    },
    []
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {chapters.map((ch) => {
        const isLocked = ch.isComplete && ch.isPartial && ch.sessions > 0;

        return (
          <div
            key={ch.chapter}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderRadius: 8,
              backgroundColor: ch.isComplete ? "var(--surface)" : "transparent",
              border: "1px solid var(--border)",
              transition: "background-color 0.15s ease",
            }}
          >
            {/* Lado esquerdo: checkbox grande + nome do capitulo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Checkbox grande (leitura completa) */}
              <div
                role="checkbox"
                aria-checked={ch.isComplete}
                aria-label={`Marcar capitulo ${ch.chapter} como lido`}
                tabIndex={isLocked ? -1 : 0}
                onClick={() => {
                  if (!isLocked) onToggleComplete(ch.chapter);
                }}
                onKeyDown={(e) => {
                  if (!isLocked) handleKeyDown(e, () => onToggleComplete(ch.chapter));
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: `2px solid ${ch.isComplete ? "var(--success)" : "var(--border)"}`,
                  backgroundColor: ch.isComplete ? "var(--success)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isLocked ? "default" : "pointer",
                  transition: "all 0.15s ease",
                  color: ch.isComplete ? "#fff" : "transparent",
                  flexShrink: 0,
                  opacity: isLocked ? 0.7 : 1,
                  position: "relative",
                }}
              >
                {ch.isComplete && <CheckmarkIcon size={14} />}
                {isLocked && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -4,
                      right: -4,
                      color: "var(--text)",
                      opacity: 0.5,
                    }}
                  >
                    <LockIcon />
                  </div>
                )}
              </div>

              {/* Nome do capitulo */}
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: ch.isComplete ? "var(--text)" : "var(--text)",
                  opacity: ch.isComplete ? 1 : 0.8,
                  textDecoration: isLocked ? "none" : "none",
                }}
              >
                Cap {ch.chapter}
              </span>
            </div>

            {/* Lado direito: checkbox parcial ou indicador de sessoes */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isLocked ? (
                /* Estado travado: mostra quantidade de sessoes */
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--accent)",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {ch.sessions} {ch.sessions === 1 ? "sessao" : "sessoes"}
                </span>
              ) : (
                /* Checkbox pequeno de leitura parcial */
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    role="checkbox"
                    aria-checked={ch.isPartial}
                    aria-label={`Marcar capitulo ${ch.chapter} como leitura parcial`}
                    tabIndex={0}
                    onClick={() => onTogglePartial(ch.chapter)}
                    onKeyDown={(e) => handleKeyDown(e, () => onTogglePartial(ch.chapter))}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `2px solid ${ch.isPartial ? "var(--accent)" : "var(--border)"}`,
                      backgroundColor: ch.isPartial ? "var(--accent)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      color: ch.isPartial ? "#fff" : "transparent",
                      flexShrink: 0,
                    }}
                  >
                    {ch.isPartial && <CheckmarkIcon size={10} />}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--text)",
                      opacity: 0.6,
                      whiteSpace: "nowrap",
                      userSelect: "none",
                    }}
                  >
                    Leitura Parcial
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
