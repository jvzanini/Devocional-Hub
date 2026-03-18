import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DocType, PipelineStatus } from "@prisma/client";

const DOC_CFG: Record<DocType, { label: string; bg: string; color: string; border: string }> = {
  TRANSCRIPT_RAW: { label: "Transcrição Bruta", bg: "#f5f5f4", color: "#57534e", border: "#d6d3d1" },
  TRANSCRIPT_CLEAN: { label: "Transcrição Limpa", bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  BIBLE_TEXT: { label: "Texto Bíblico (NVI)", bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  INFOGRAPHIC: { label: "Infográfico", bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  SLIDES: { label: "Slides", bg: "#ede9fe", color: "#7c3aed", border: "#c4b5fd" },
};

const ST: Record<PipelineStatus, { label: string; variant: "success" | "error" | "warning" | "info" }> = {
  COMPLETED: { label: "Concluído", variant: "success" },
  ERROR: { label: "Erro no pipeline", variant: "error" },
  RUNNING: { label: "Processando...", variant: "warning" },
  PENDING: { label: "Pendente", variant: "info" },
};

function fmtSize(b: number | null) { if (!b) return ""; if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b/1024).toFixed(1)} KB`; return `${(b/1048576).toFixed(1)} MB`; }

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;
  const s = await prisma.session.findUnique({ where: { id }, include: { documents: { orderBy: { createdAt: "asc" } } } });
  if (!s) notFound();
  const st = ST[s.status];

  return (
    <div className="page-bg">
      <header className="app-header">
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, color: "#a8a29e", textDecoration: "none" }}>
            <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.chapterRef || "Devocional"}</span>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
            <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 2 }}>{formatDate(s.date)}</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {s.status === "ERROR" && s.errorMessage && (
          <div className="alert-error">
            <div style={{ fontWeight: 600, fontSize: 14, color: "#dc2626", marginBottom: 6 }}>Erro no pipeline</div>
            <div style={{ fontSize: 13, color: "#b91c1c", fontFamily: "monospace", backgroundColor: "rgba(220,38,38,0.06)", padding: "8px 12px", borderRadius: 8, wordBreak: "break-all" }}>{s.errorMessage}</div>
          </div>
        )}

        {s.summary && (
          <div className="section-card">
            <div className="section-title">Resumo</div>
            <p style={{ fontSize: 14, color: "#57534e", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.summary}</p>
          </div>
        )}

        {s.participants.length > 0 && (
          <div className="section-card">
            <div className="section-title">Participantes ({s.participants.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {s.participants.map((p, i) => (
                <span key={i} className="participant-chip">
                  <span className="avatar-sm">{p.charAt(0).toUpperCase()}</span>
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="section-card">
          <div className="section-title">Arquivos</div>
          {s.documents.length === 0 ? (
            <p style={{ fontSize: 14, color: "#a8a29e", textAlign: "center", padding: "16px 0" }}>Nenhum arquivo gerado ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {s.documents.map((doc) => {
                const c = DOC_CFG[doc.type];
                return (
                  <a key={doc.id} href={`/api/files/${doc.id}`} download={doc.fileName}
                    className="file-row" style={{ backgroundColor: c.bg, borderColor: c.border, textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: c.bg, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg style={{ width: 16, height: 16, color: c.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: c.color }}>{c.label}</div>
                        <div style={{ fontSize: 11, color: "#a8a29e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {doc.fileSize && <span style={{ fontSize: 11, color: "#a8a29e" }}>{fmtSize(doc.fileSize)}</span>}
                      <svg style={{ width: 16, height: 16, color: "#a8a29e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="section-card">
          <div className="section-title">Informações</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Reunião Zoom", value: s.zoomMeetingId },
              { label: "Gravação", value: s.zoomRecordingId || "—" },
              { label: "Criado em", value: formatDateTime(s.createdAt) },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                <span style={{ color: "#a8a29e" }}>{item.label}</span>
                <span style={{ color: "#57534e", fontFamily: "monospace", fontSize: 12, backgroundColor: "#f5f5f4", padding: "2px 8px", borderRadius: 4 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
