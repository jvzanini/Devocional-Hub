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

const statusConfig: Record<PipelineStatus, { label: string; variant: "success" | "error" | "warning" | "info" }> = {
  COMPLETED: { label: "Conclu\u00eddo", variant: "success" },
  ERROR: { label: "Erro", variant: "error" },
  RUNNING: { label: "Processando", variant: "warning" },
  PENDING: { label: "Pendente", variant: "info" },
};

export function SessionCard({ session }: SessionCardProps) {
  const status = statusConfig[session.status];
  const hasSlides = session.documents.some((d) => d.type === "SLIDES");
  const hasInfographic = session.documents.some((d) => d.type === "INFOGRAPHIC");
  const docCount = session.documents.length;

  return (
    <Link href={`/session/${session.id}`} className="block group">
      <div className="bg-white border border-stone-200/80 rounded-2xl p-5 hover:shadow-lg hover:shadow-stone-200/50 hover:border-amber-300/60 transition-all duration-300 flex gap-4">
        {/* Accent bar */}
        <div className={`w-1 shrink-0 rounded-full ${
          session.status === "COMPLETED" ? "bg-emerald-500" :
          session.status === "ERROR" ? "bg-red-500" :
          session.status === "RUNNING" ? "bg-amber-500 animate-pulse-slow" :
          "bg-stone-300"
        }`} />

        <div className="flex-1 min-w-0">
          {/* Top row: date + status */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-400 font-medium">
              {formatDate(session.date)}
            </span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-stone-900 text-base leading-snug mb-1.5 group-hover:text-amber-800 transition-colors">
            {session.chapterRef || "Cap\u00edtulo n\u00e3o identificado"}
          </h3>

          {/* Summary */}
          {session.summary && (
            <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed mb-3">
              {session.summary}
            </p>
          )}

          {/* Error message */}
          {session.status === "ERROR" && !session.summary && (
            <p className="text-sm text-red-500 mb-3">
              Ocorreu um erro ao processar este devocional
            </p>
          )}

          {/* Bottom row: docs + participants */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <div className="flex items-center gap-2">
              {hasSlides && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-md font-medium border border-violet-200">
                  Slides
                </span>
              )}
              {hasInfographic && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md font-medium border border-orange-200">
                  Infogr\u00e1fico
                </span>
              )}
              {docCount > 0 && !hasSlides && !hasInfographic && (
                <span className="text-[11px] text-stone-400">{docCount} arquivo(s)</span>
              )}
              {docCount === 0 && (
                <span className="text-[11px] text-stone-300">Sem arquivos</span>
              )}
            </div>

            {session.participants.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {session.participants.slice(0, 3).map((p, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-2 border-white flex items-center justify-center"
                    >
                      <span className="text-[8px] font-bold text-white">
                        {p.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-[11px] text-stone-400 font-medium">
                  {session.participants.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
