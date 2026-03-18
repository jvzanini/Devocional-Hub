import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DocType, PipelineStatus } from "@prisma/client";

const DOC_CFG: Record<DocType, { label: string; color: string; bg: string; border: string }> = {
  TRANSCRIPT_RAW: { label: "Transcrição Bruta", color: "text-stone-600", bg: "bg-stone-50", border: "border-stone-200" },
  TRANSCRIPT_CLEAN: { label: "Transcrição Limpa", color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  BIBLE_TEXT: { label: "Texto Bíblico (NVI)", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  INFOGRAPHIC: { label: "Infográfico", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  SLIDES: { label: "Slides", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
};

const STATUS_CFG: Record<PipelineStatus, { label: string; variant: "success" | "error" | "warning" | "info" }> = {
  COMPLETED: { label: "Concluído", variant: "success" },
  ERROR: { label: "Erro no pipeline", variant: "error" },
  RUNNING: { label: "Processando...", variant: "warning" },
  PENDING: { label: "Pendente", variant: "info" },
};

function fmtSize(b: number | null): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const s = await prisma.session.findUnique({
    where: { id },
    include: { documents: { orderBy: { createdAt: "asc" } } },
  });
  if (!s) notFound();

  const st = STATUS_CFG[s.status];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-stone-900 text-sm truncate">{s.chapterRef || "Devocional"}</h1>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">{formatDate(s.date)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        {s.status === "ERROR" && s.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-700 mb-1">Erro no pipeline</p>
            <p className="text-sm text-red-600 font-mono bg-red-100/50 px-3 py-2 rounded-lg break-all">{s.errorMessage}</p>
          </div>
        )}

        {s.summary && (
          <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Resumo</h2>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{s.summary}</p>
          </section>
        )}

        {s.participants.length > 0 && (
          <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Participantes ({s.participants.length})</h2>
            <div className="flex flex-wrap gap-2">
              {s.participants.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-stone-50 text-stone-600 px-2.5 py-1 rounded-lg border border-stone-200 font-medium">
                  <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">{p.charAt(0).toUpperCase()}</span>
                  {p}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Arquivos</h2>
          {s.documents.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">Nenhum arquivo gerado ainda.</p>
          ) : (
            <div className="space-y-2">
              {s.documents.map((doc) => {
                const c = DOC_CFG[doc.type];
                return (
                  <a key={doc.id} href={`/api/files/${doc.id}`} download={doc.fileName}
                    className={`flex items-center justify-between p-3 rounded-xl ${c.bg} border ${c.border} hover:opacity-90 transition-opacity group cursor-pointer`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center shrink-0`}>
                        <svg className={`w-4 h-4 ${c.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${c.color}`}>{c.label}</p>
                        <p className="text-[11px] text-stone-400 truncate">{doc.fileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.fileSize && <span className="text-[11px] text-stone-400">{fmtSize(doc.fileSize)}</span>}
                      <svg className="h-4 w-4 text-stone-300 group-hover:text-amber-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Informações</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-stone-400">Reunião Zoom</dt>
              <dd className="text-stone-600 font-mono text-xs bg-stone-50 px-2 py-0.5 rounded">{s.zoomMeetingId}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-stone-400">Gravação</dt>
              <dd className="text-stone-600 font-mono text-xs bg-stone-50 px-2 py-0.5 rounded">{s.zoomRecordingId || "—"}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-stone-400">Criado em</dt>
              <dd className="text-stone-600 text-xs">{formatDateTime(s.createdAt)}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
