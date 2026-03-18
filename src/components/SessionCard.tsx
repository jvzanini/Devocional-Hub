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

const statusConfig: Record<
  PipelineStatus,
  { label: string; variant: "success" | "error" | "warning" | "info"; dot: string }
> = {
  COMPLETED: { label: "Concluído", variant: "success", dot: "bg-emerald-500" },
  ERROR: { label: "Erro", variant: "error", dot: "bg-red-500" },
  RUNNING: { label: "Processando", variant: "warning", dot: "bg-amber-500 animate-pulse" },
  PENDING: { label: "Pendente", variant: "info", dot: "bg-sky-500" },
};

export function SessionCard({ session }: SessionCardProps) {
  const status = statusConfig[session.status];
  const hasSlides = session.documents.some((d) => d.type === "SLIDES");
  const hasInfographic = session.documents.some((d) => d.type === "INFOGRAPHIC");
  const docCount = session.documents.length;

  return (
    <Link href={`/session/${session.id}`} className="block group cursor-pointer">
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all duration-200 flex gap-4">
        {/* Status dot + line */}
        <div className="flex flex-col items-center gap-1 pt-1.5">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.dot}`} />
          <div className={`w-0.5 flex-1 rounded-full ${
            session.status === "COMPLETED" ? "bg-emerald-200" :
            session.status === "ERROR" ? "bg-red-200" :
            session.status === "RUNNING" ? "bg-amber-200" :
            "bg-stone-200"
          }`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <time className="text-xs text-stone-400 font-medium">{formatDate(session.date)}</time>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          <h3 className="font-semibold text-stone-900 text-[15px] leading-snug mb-1 group-hover:text-amber-700 transition-colors">
            {session.chapterRef || "Capítulo não identificado"}
          </h3>

          {session.summary && (
            <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed mb-3">{session.summary}</p>
          )}

          {session.status === "ERROR" && !session.summary && (
            <p className="text-sm text-red-500 mb-3">Ocorreu um erro ao processar este devocional</p>
          )}

          <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
            <div className="flex items-center gap-1.5">
              {hasSlides && (
                <span className="text-[11px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-md font-medium border border-violet-200">Slides</span>
              )}
              {hasInfographic && (
                <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md font-medium border border-orange-200">Infográfico</span>
              )}
              {docCount > 0 && !hasSlides && !hasInfographic && (
                <span className="text-[11px] text-stone-400">{docCount} arquivo(s)</span>
              )}
              {docCount === 0 && session.status !== "ERROR" && (
                <span className="text-[11px] text-stone-300">Sem arquivos</span>
              )}
            </div>

            {session.participants.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  {session.participants.slice(0, 3).map((p, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">{p.charAt(0).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-stone-400 font-medium">{session.participants.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
