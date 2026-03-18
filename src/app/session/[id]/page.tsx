import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DocType, PipelineStatus } from "@prisma/client";

const DOC_LABELS: Record<DocType, { label: string; color: string; bg: string; border: string }> = {
  TRANSCRIPT_RAW: { label: "Transcricao Bruta", color: "text-stone-600", bg: "bg-stone-50", border: "border-stone-200" },
  TRANSCRIPT_CLEAN: { label: "Transcricao Limpa", color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  BIBLE_TEXT: { label: "Texto Biblico (NVI)", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  INFOGRAPHIC: { label: "Infografico", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  SLIDES: { label: "Slides", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
};

const STATUS_CONFIG: Record<PipelineStatus, { label: string; variant: "success" | "error" | "warning" | "info" }> = {
  COMPLETED: { label: "Concluido", variant: "success" },
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

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const devSession = await prisma.session.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!devSession) notFound();

  const status = STATUS_CONFIG[devSession.status];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100/50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-stone-900 text-sm truncate">
                {devSession.chapterRef || "Devocional"}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">{formatDate(devSession.date)}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Erro */}
        {devSession.status === "ERROR" && devSession.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-1.5">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm font-semibold text-red-700">Erro no pipeline</p>
            </div>
            <p className="text-sm text-red-600 font-mono bg-red-100/50 px-3 py-2 rounded-lg">{devSession.errorMessage}</p>
          </div>
        )}

        {/* Resumo */}
        {devSession.summary && (
          <div className="bg-white border border-stone-200/80 rounded-xl p-5 shadow-sm animate-slide-up">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Resumo</h2>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
              {devSession.summary}
            </p>
          </div>
        )}

        {/* Participantes */}
        {devSession.participants.length > 0 && (
          <div className="bg-white border border-stone-200/80 rounded-xl p-5 shadow-sm animate-slide-up" style={{ animationDelay: "50ms" }}>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
              Participantes ({devSession.participants.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {devSession.participants.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs bg-stone-50 text-stone-600 px-2.5 py-1 rounded-lg border border-stone-200 font-medium"
                >
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-[9px] font-bold text-white">
                    {p.charAt(0).toUpperCase()}
                  </span>
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Documentos */}
        <div className="bg-white border border-stone-200/80 rounded-xl p-5 shadow-sm animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Arquivos</h2>

          {devSession.documents.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">Nenhum arquivo gerado ainda.</p>
          ) : (
            <div className="space-y-2">
              {devSession.documents.map((doc) => {
                const config = DOC_LABELS[doc.type];
                return (
                  <a
                    key={doc.id}
                    href={`/api/files/${doc.id}`}
                    download={doc.fileName}
                    className={`flex items-center justify-between p-3 rounded-xl ${config.bg} border ${config.border} hover:shadow-md transition-all group`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center shrink-0`}>
                        <svg className={`w-4 h-4 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${config.color}`}>
                          {config.label}
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">{doc.fileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.fileSize && (
                        <span className="text-[11px] text-stone-400">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      )}
                      <svg
                        className="h-4 w-4 text-stone-300 group-hover:text-amber-600 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Metadados */}
        <div className="bg-white border border-stone-200/80 rounded-xl p-5 shadow-sm animate-slide-up" style={{ animationDelay: "150ms" }}>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Informacoes</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-stone-400">Reuniao Zoom</dt>
              <dd className="text-stone-600 font-mono text-xs bg-stone-50 px-2 py-0.5 rounded">{devSession.zoomMeetingId}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-stone-400">Gravacao</dt>
              <dd className="text-stone-600 font-mono text-xs bg-stone-50 px-2 py-0.5 rounded">{devSession.zoomRecordingId || "—"}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-stone-400">Criado em</dt>
              <dd className="text-stone-600 text-xs">{formatDateTime(devSession.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
