import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DocType, PipelineStatus } from "@prisma/client";

const DOC_LABELS: Record<DocType, { label: string; icon: string; color: string }> = {
  TRANSCRIPT_RAW: { label: "Transcrição Bruta", icon: "📝", color: "text-gray-600" },
  TRANSCRIPT_CLEAN: { label: "Transcrição Limpa", icon: "✨", color: "text-blue-600" },
  BIBLE_TEXT: { label: "Texto Bíblico (NVI)", icon: "📖", color: "text-amber-600" },
  INFOGRAPHIC: { label: "Infográfico", icon: "🖼️", color: "text-orange-600" },
  SLIDES: { label: "Slides", icon: "📊", color: "text-purple-600" },
};

const STATUS_CONFIG: Record<PipelineStatus, { label: string; variant: "success" | "error" | "warning" | "info" }> = {
  COMPLETED: { label: "Concluído", variant: "success" },
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-gray-900">
                {devSession.chapterRef || "Devocional"}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-xs text-gray-400">{formatDate(devSession.date)}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Erro */}
        {devSession.status === "ERROR" && devSession.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-700 mb-1">Erro no pipeline</p>
            <p className="text-sm text-red-600 font-mono">{devSession.errorMessage}</p>
          </div>
        )}

        {/* Resumo */}
        {devSession.summary && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📋</span> Resumo
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {devSession.summary}
            </p>
          </div>
        )}

        {/* Participantes */}
        {devSession.participants.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>👥</span> Participantes ({devSession.participants.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {devSession.participants.map((p, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Documentos */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>📁</span> Arquivos
          </h2>

          {devSession.documents.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum arquivo gerado ainda.</p>
          ) : (
            <div className="space-y-2">
              {devSession.documents.map((doc) => {
                const config = DOC_LABELS[doc.type];
                return (
                  <a
                    key={doc.id}
                    href={`/api/files/${doc.id}`}
                    download={doc.fileName}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{config.icon}</span>
                      <div>
                        <p className={`text-sm font-medium ${config.color}`}>
                          {config.label}
                        </p>
                        <p className="text-xs text-gray-400">{doc.fileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.fileSize && (
                        <span className="text-xs text-gray-400">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      )}
                      <svg
                        className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Metadados */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>ℹ️</span> Informações
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Reunião Zoom</dt>
              <dd className="text-gray-700 font-mono text-xs">{devSession.zoomMeetingId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Gravação</dt>
              <dd className="text-gray-700 font-mono text-xs">{devSession.zoomRecordingId || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Criado em</dt>
              <dd className="text-gray-700">{formatDateTime(devSession.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
