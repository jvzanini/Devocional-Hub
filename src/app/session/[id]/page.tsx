import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DocType, PipelineStatus } from "@prisma/client";

const DOC_LABELS: Record<DocType, { label: string; icon: string; color: string; bg: string; border: string }> = {
  TRANSCRIPT_RAW: { label: "Transcri\u00e7\u00e3o Bruta", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z", color: "text-[var(--color-text-secondary)]", bg: "bg-[var(--color-muted)]", border: "border-[var(--color-border)]" },
  TRANSCRIPT_CLEAN: { label: "Transcri\u00e7\u00e3o Limpa", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-[var(--color-info)]", bg: "bg-[var(--color-info-surface)]", border: "border-blue-200" },
  BIBLE_TEXT: { label: "Texto B\u00edblico (NVI)", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25", color: "text-[var(--color-primary)]", bg: "bg-[var(--color-primary-surface)]", border: "border-amber-200" },
  INFOGRAPHIC: { label: "Infogr\u00e1fico", icon: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  SLIDES: { label: "Slides", icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3", color: "text-[var(--color-accent)]", bg: "bg-[var(--color-accent-surface)]", border: "border-violet-200" },
};

const STATUS_CONFIG: Record<PipelineStatus, { label: string; variant: "success" | "error" | "warning" | "info" }> = {
  COMPLETED: { label: "Conclu\u00eddo", variant: "success" },
  ERROR: { label: "Erro no pipeline", variant: "error" },
  RUNNING: { label: "Processando...", variant: "warning" },
  PENDING: { label: "Pendente", variant: "info" },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const devSession = await prisma.session.findUnique({
    where: { id },
    include: { documents: { orderBy: { createdAt: "asc" } } },
  });

  if (!devSession) notFound();
  const status = STATUS_CONFIG[devSession.status];

  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      {/* Header */}
      <header className="bg-[var(--color-card)]/90 backdrop-blur-md border-b border-[var(--color-border-light)] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Voltar ao dashboard"
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-muted)] transition-all duration-200 cursor-pointer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-[var(--color-text)] text-sm truncate">
                {devSession.chapterRef || "Devocional"}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{formatDate(devSession.date)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        {/* Error */}
        {devSession.status === "ERROR" && devSession.errorMessage && (
          <div role="alert" className="bg-[var(--color-error-surface)] border border-red-200 rounded-[var(--radius-md)] p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-4 h-4 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm font-semibold text-[var(--color-error)]">Erro no pipeline</p>
            </div>
            <p className="text-sm text-[var(--color-error)]/80 font-mono bg-red-100/50 px-3 py-2 rounded-[var(--radius-sm)] break-all">{devSession.errorMessage}</p>
          </div>
        )}

        {/* Summary */}
        {devSession.summary && (
          <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 animate-slide-up" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Resumo</h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{devSession.summary}</p>
          </section>
        )}

        {/* Participants */}
        {devSession.participants.length > 0 && (
          <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 animate-slide-up" style={{ boxShadow: "var(--shadow-sm)", animationDelay: "40ms" }}>
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              Participantes ({devSession.participants.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {devSession.participants.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] font-medium">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--color-primary-lighter)] to-[var(--color-primary)] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                    {p.charAt(0).toUpperCase()}
                  </span>
                  {p}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Documents */}
        <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 animate-slide-up" style={{ boxShadow: "var(--shadow-sm)", animationDelay: "80ms" }}>
          <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Arquivos</h2>
          {devSession.documents.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">Nenhum arquivo gerado ainda.</p>
          ) : (
            <div className="space-y-2">
              {devSession.documents.map((doc) => {
                const config = DOC_LABELS[doc.type];
                return (
                  <a
                    key={doc.id}
                    href={`/api/files/${doc.id}`}
                    download={doc.fileName}
                    className={`flex items-center justify-between p-3 rounded-[var(--radius-md)] ${config.bg} border ${config.border} hover:brightness-[0.97] transition-all duration-200 group cursor-pointer`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-[var(--radius-sm)] ${config.bg} border ${config.border} flex items-center justify-center shrink-0`}>
                        <svg className={`w-4 h-4 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate">{doc.fileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.fileSize && <span className="text-[11px] text-[var(--color-text-muted)]">{formatFileSize(doc.fileSize)}</span>}
                      <svg className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* Metadata */}
        <section className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 animate-slide-up" style={{ boxShadow: "var(--shadow-sm)", animationDelay: "120ms" }}>
          <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Informa\u00e7\u00f5es</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-[var(--color-text-muted)]">Reuni\u00e3o Zoom</dt>
              <dd className="text-[var(--color-text-secondary)] font-mono text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-[var(--radius-sm)]">{devSession.zoomMeetingId}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-[var(--color-text-muted)]">Grava\u00e7\u00e3o</dt>
              <dd className="text-[var(--color-text-secondary)] font-mono text-xs bg-[var(--color-bg-subtle)] px-2 py-0.5 rounded-[var(--radius-sm)]">{devSession.zoomRecordingId || "\u2014"}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-[var(--color-text-muted)]">Criado em</dt>
              <dd className="text-[var(--color-text-secondary)] text-xs">{formatDateTime(devSession.createdAt)}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
