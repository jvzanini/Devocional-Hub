"use client";

import Link from "next/link";
import { formatDate } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { DocType, PipelineStatus } from "@prisma/client";

interface Document { id: string; type: DocType; fileName: string; fileSize: number | null; }
interface Participant { id: string; name: string; duration: number; }
interface SessionCardProps {
  session: {
    id: string; date: string | Date; chapterRef: string; summary: string;
    participants: Participant[]; status: PipelineStatus; documents: Document[];
  };
}

const STATUS: Record<PipelineStatus, { label: string; variant: "success" | "error" | "warning" | "info"; dotClass: string; lineColor: string }> = {
  COMPLETED: { label: "Concluído", variant: "success", dotClass: "dot dot-success", lineColor: "#a7f3d0" },
  ERROR: { label: "Erro", variant: "error", dotClass: "dot dot-error", lineColor: "#fecaca" },
  RUNNING: { label: "Processando", variant: "warning", dotClass: "dot dot-warning", lineColor: "#fde68a" },
  PENDING: { label: "Pendente", variant: "info", dotClass: "dot dot-info", lineColor: "#bfdbfe" },
};

export function SessionCard({ session }: SessionCardProps) {
  const st = STATUS[session.status];
  const hasSlides = session.documents.some((d) => d.type === "SLIDES");
  const hasInfographic = session.documents.some((d) => d.type === "INFOGRAPHIC");

  return (
    <Link href={`/session/${session.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div className="session-card card-hover" style={{ padding: 24 }}>
        {/* Status */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 6 }}>
          <div className={st.dotClass} />
          <div className="dot-line" style={{ backgroundColor: st.lineColor }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#57534e", fontWeight: 500 }}>{formatDate(session.date)}</span>
            <Badge variant={st.variant}>{st.label}</Badge>
          </div>

          {/* Title */}
          <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1c1917", marginBottom: 6, lineHeight: 1.3 }}>
            {session.chapterRef || "Capítulo não identificado"}
          </h3>

          {/* Summary */}
          {session.summary && (
            <p style={{ fontSize: 14, color: "#57534e", lineHeight: 1.6, marginBottom: 14, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {session.summary}
            </p>
          )}

          {session.status === "ERROR" && !session.summary && (
            <p style={{ fontSize: 14, color: "#dc2626", marginBottom: 14 }}>Ocorreu um erro ao processar este devocional</p>
          )}

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #e7e5e4" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {hasSlides && <span className="badge" style={{ backgroundColor: "#ede9fe", color: "#7c3aed", borderColor: "#c4b5fd", fontSize: 12 }}>Slides</span>}
              {hasInfographic && <span className="badge" style={{ backgroundColor: "#fff7ed", color: "#ea580c", borderColor: "#fed7aa", fontSize: 12 }}>Infográfico</span>}
              {session.documents.length === 0 && session.status !== "ERROR" && (
                <span style={{ fontSize: 12, color: "#d6d3d1" }}>Sem arquivos</span>
              )}
            </div>
            {session.participants.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex" }}>
                  {session.participants.slice(0, 3).map((p, i) => (
                    <div key={p.id} className="avatar-sm" style={{ marginLeft: i > 0 ? -4 : 0, border: "2px solid #fff", width: 24, height: 24, fontSize: 10 }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: 13, color: "#57534e", fontWeight: 500 }}>{session.participants.length} participante(s)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
