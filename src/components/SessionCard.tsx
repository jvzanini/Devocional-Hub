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
  COMPLETED: { label: "Concluído", variant: "success" },
  ERROR: { label: "Erro", variant: "error" },
  RUNNING: { label: "Processando...", variant: "warning" },
  PENDING: { label: "Pendente", variant: "info" },
};

const docTypeLabels: Record<DocType, string> = {
  TRANSCRIPT_RAW: "Transcrição Bruta",
  TRANSCRIPT_CLEAN: "Transcrição Limpa",
  BIBLE_TEXT: "Texto Bíblico",
  INFOGRAPHIC: "Infográfico",
  SLIDES: "Slides",
};

export function SessionCard({ session }: SessionCardProps) {
  const status = statusConfig[session.status];
  const hasSlides = session.documents.some((d) => d.type === "SLIDES");
  const hasInfographic = session.documents.some((d) => d.type === "INFOGRAPHIC");

  return (
    <Link href={`/session/${session.id}`} className="block group">
      <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-400 font-medium">
                {formatDate(session.date)}
              </span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-2">
              {session.chapterRef || "Capítulo não identificado"}
            </h3>

            {session.summary && (
              <p className="text-sm text-gray-500 line-clamp-2">{session.summary}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {hasSlides && (
              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                Slides
              </span>
            )}
            {hasInfographic && (
              <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                Infográfico
              </span>
            )}
          </div>
        </div>

        {session.participants.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              <span className="font-medium">{session.participants.length} participante(s):</span>{" "}
              {session.participants.slice(0, 3).join(", ")}
              {session.participants.length > 3 && ` +${session.participants.length - 3}`}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
