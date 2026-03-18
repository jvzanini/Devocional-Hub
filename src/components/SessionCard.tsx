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
  COMPLETED: { label: "Concluido", variant: "success" },
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
      <div className="bg-white border border-stone-200/80 rounded-xl p-5 hover:shadow-lg hover:shadow-stone-200/50 hover:border-amber-300/60 transition-all duration-300 relative overflow-hidden">
        {/* Accent bar */}
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${
          session.status === "COMPLETED" ? "bg-emerald-500" :
          session.status === "ERROR" ? "bg-red-500" :
          session.status === "RUNNING" ? "bg-amber-500 animate-pulse-slow" :
          "bg-stone-300"
        }`} />

        <div className="pl-3">
          {/* Top row: date + status */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-400 font-medium">
              {formatDate(session.date)}
            </span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-stone-900 text-base leading-snug mb-1.5 group-hover:text-amber-800 transition-colors">
            {session.chapterRef || "Capitulo nao identificado"}
          </h3>

          {/* Summary */}
          {session.summary && (
            <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed mb-3">
              {session.summary}
            </p>
          )}

          {/* Bottom row: docs + participants */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <div className="flex items-center gap-2">
              {hasSlides && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-md font-medium border border-violet-200">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                  </svg>
                  Slides
                </span>
              )}
              {hasInfographic && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md font-medium border border-orange-200">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
                  </svg>
                  Infografico
                </span>
              )}
              {docCount > 0 && !hasSlides && !hasInfographic && (
                <span className="text-[11px] text-stone-400">{docCount} arquivo(s)</span>
              )}
            </div>

            {session.participants.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {session.participants.slice(0, 3).map((_, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-2 border-white flex items-center justify-center"
                    >
                      <span className="text-[8px] font-bold text-white">
                        {session.participants[i]?.charAt(0).toUpperCase()}
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
