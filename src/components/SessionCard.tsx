"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DocType, PipelineStatus } from "@prisma/client";

interface Document {
  id: string;
  type: DocType;
  fileName: string;
  fileSize: number | null;
}

interface SessionCardProps {
  session: {
    id: string;
    date: string | Date;
    chapterRef: string;
    summary: string;
    participants: string[];
    status: PipelineStatus;
    documents: Document[];
  };
}

const statusConfig: Record<PipelineStatus, { label: string; variant: "success" | "error" | "warning" | "info"; dot: string }> = {
  COMPLETED: { label: "Concluído", variant: "success", dot: "bg-[var(--color-success)]" },
  ERROR: { label: "Erro", variant: "error", dot: "bg-[var(--color-error)]" },
  RUNNING: { label: "Processando", variant: "warning", dot: "bg-[var(--color-warning)] animate-pulse-subtle" },
  PENDING: { label: "Pendente", variant: "info", dot: "bg-[var(--color-info)]" },
};

export function SessionCard({ session }: SessionCardProps) {
  const status = statusConfig[session.status];
  const hasSlides = session.documents.some((d) => d.type === "SLIDES");
  const hasInfographic = session.documents.some((d) => d.type === "INFOGRAPHIC");
  const docCount = session.documents.length;

  return (
    <Link href={`/session/${session.id}`} className="block group cursor-pointer">
      <div
        className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 transition-all duration-200 hover:border-[var(--color-primary-lighter)]/50 flex gap-4"
        style={{ boxShadow: "var(--shadow-card)" }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
      >
        {/* Status indicator */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <div className={`w-2 h-2 rounded-full ${status.dot}`} />
          <div className={`w-0.5 flex-1 rounded-full ${
            session.status === "COMPLETED" ? "bg-emerald-200" :
            session.status === "ERROR" ? "bg-red-200" :
            session.status === "RUNNING" ? "bg-amber-200" :
            "bg-[var(--color-border)]"
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1.5">
            <time className="text-xs text-[var(--color-text-muted)] font-medium">
              {formatDate(session.date)}
            </time>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-[var(--color-text)] text-[15px] leading-snug mb-1 group-hover:text-[var(--color-primary)] transition-colors duration-200">
            {session.chapterRef || "Capítulo não identificado"}
          </h3>

          {/* Summary */}
          {session.summary && (
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed mb-3">
              {session.summary}
            </p>
          )}

          {/* Error hint */}
          {session.status === "ERROR" && !session.summary && (
            <p className="text-sm text-[var(--color-error)] mb-3">
              Ocorreu um erro ao processar este devocional
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2.5 border-t border-[var(--color-border-light)]">
            <div className="flex items-center gap-1.5">
              {hasSlides && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-[var(--color-accent-surface)] text-[var(--color-accent)] px-2 py-0.5 rounded-md font-medium border border-violet-200">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3" /></svg>
                  Slides
                </span>
              )}
              {hasInfographic && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md font-medium border border-orange-200">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" /></svg>
                  Infográfico
                </span>
              )}
              {docCount > 0 && !hasSlides && !hasInfographic && (
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  <svg className="w-3 h-3 inline mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  {docCount} arquivo(s)
                </span>
              )}
              {docCount === 0 && session.status !== "ERROR" && (
                <span className="text-[11px] text-[var(--color-text-muted)]">Sem arquivos</span>
              )}
            </div>

            {session.participants.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  {session.participants.slice(0, 3).map((p, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--color-primary-lighter)] to-[var(--color-primary)] border-2 border-white flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">{p.charAt(0).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-[var(--color-text-muted)] font-medium">{session.participants.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
