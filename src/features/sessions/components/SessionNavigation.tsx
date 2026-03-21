"use client";

import { useRouter } from "next/navigation";

interface SessionNavigationProps {
  previousId: string | null;
  previousLabel: string | null;
  nextId: string | null;
  nextLabel: string | null;
}

export function SessionNavigation({
  previousId,
  previousLabel,
  nextId,
  nextLabel,
}: SessionNavigationProps) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={() => previousId && router.push(`/session/${previousId}`)}
        disabled={!previousId}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "6px 14px",
          borderRadius: 8,
          border: "1px solid var(--border, rgba(128,128,128,0.2))",
          background: "transparent",
          color: previousId ? "var(--accent)" : "var(--text-muted)",
          fontSize: 13,
          fontWeight: 500,
          cursor: previousId ? "pointer" : "not-allowed",
          opacity: previousId ? 1 : 0.4,
          transition: "background 0.15s",
        }}
        aria-label={previousLabel ? `Ir para ${previousLabel}` : "Sem sessão anterior"}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {previousLabel || "Anterior"}
      </button>

      <button
        onClick={() => nextId && router.push(`/session/${nextId}`)}
        disabled={!nextId}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "6px 14px",
          borderRadius: 8,
          border: "1px solid var(--border, rgba(128,128,128,0.2))",
          background: "transparent",
          color: nextId ? "var(--accent)" : "var(--text-muted)",
          fontSize: 13,
          fontWeight: 500,
          cursor: nextId ? "pointer" : "not-allowed",
          opacity: nextId ? 1 : 0.4,
          transition: "background 0.15s",
        }}
        aria-label={nextLabel ? `Ir para ${nextLabel}` : "Sem próxima sessão"}
      >
        {nextLabel || "Próximo"}
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
