import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DocType, PipelineStatus } from "@prisma/client";
import ProtectedDocuments from "@/components/ProtectedDocuments";

const DOC_CFG: Record<DocType, { label: string; bg: string; color: string; border: string; adminOnly?: boolean; isProtected?: boolean }> = {
  TRANSCRIPT_RAW: { label: "Transcrição Bruta", bg: "#f5f5f4", color: "#57534e", border: "#d6d3d1" },
  TRANSCRIPT_CLEAN: { label: "Transcrição Limpa", bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  BIBLE_TEXT: { label: "Texto Bíblico (NVI)", bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  INFOGRAPHIC: { label: "Infográfico", bg: "#fff7ed", color: "#ea580c", border: "#fed7aa", isProtected: true },
  SLIDES: { label: "Slides", bg: "#ede9fe", color: "#7c3aed", border: "#c4b5fd", isProtected: true },
  AUDIO_OVERVIEW: { label: "Vídeo Resumo (PT-BR)", bg: "#fdf2f8", color: "#db2777", border: "#fbcfe8", isProtected: true },
};

const ST: Record<PipelineStatus, { label: string; variant: "success" | "error" | "warning" | "info" }> = {
  COMPLETED: { label: "Concluído", variant: "success" },
  ERROR: { label: "Erro no pipeline", variant: "error" },
  RUNNING: { label: "Processando...", variant: "warning" },
  PENDING: { label: "Pendente", variant: "info" },
};

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}min` : ""}`;
  return `${m}min`;
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;
  const s = await prisma.session.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { createdAt: "asc" } },
      participants: { orderBy: { joinTime: "asc" } },
      attendances: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!s) notFound();
  const st = ST[s.status];
  const userRole = (session.user as { role?: string })?.role || "MEMBER";
  const isAdmin = userRole === "ADMIN";

  // Build a map: participant name/email -> platform user name
  const attendanceMap = new Map<string, { userName: string; isMember: boolean }>();
  if (s.attendances) {
    const userIds = s.attendances.map(a => a.userId);
    const zoomIds = await prisma.zoomIdentifier.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, value: true },
    });

    for (const a of s.attendances) {
      const userZoomValues = zoomIds.filter(z => z.userId === a.userId).map(z => z.value.toLowerCase());
      for (const val of userZoomValues) {
        attendanceMap.set(val, { userName: a.user.name, isMember: true });
      }
    }
  }

  function getParticipantDisplay(name: string, email: string | null): { displayName: string; isMember: boolean } {
    const byEmail = email ? attendanceMap.get(email.toLowerCase()) : undefined;
    if (byEmail) return { displayName: byEmail.userName, isMember: true };

    const byName = attendanceMap.get(name.toLowerCase());
    if (byName) return { displayName: byName.userName, isMember: true };

    return { displayName: name, isMember: false };
  }

  // Preparar docs para o componente client
  const visibleDocs = s.documents
    .filter(doc => {
      const cfg = DOC_CFG[doc.type];
      return cfg && (!cfg.adminOnly || isAdmin);
    })
    .map(doc => {
      const cfg = DOC_CFG[doc.type];
      return {
        id: doc.id,
        type: doc.type,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        isProtected: cfg.isProtected || false,
        label: cfg.label,
        bg: cfg.bg,
        color: cfg.color,
        border: cfg.border,
      };
    });

  return (
    <div className="page-bg">
      <header className="app-header">
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" className="btn-icon" style={{ textDecoration: "none" }}>
            <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.chapterRef || "Devocional"}</span>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
            <div style={{ fontSize: 13, color: "#78716c", marginTop: 2 }}>{formatDate(s.date)}</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "20px 20px 48px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Erro */}
        {s.status === "ERROR" && s.errorMessage && (
          <div className="alert-error">
            <div style={{ fontWeight: 600, fontSize: 13, color: "#dc2626", marginBottom: 6 }}>Erro no pipeline</div>
            <div style={{ fontSize: 12, color: "#b91c1c", fontFamily: "monospace", backgroundColor: "rgba(220,38,38,0.06)", padding: "8px 12px", borderRadius: 8, wordBreak: "break-all" }}>{s.errorMessage}</div>
          </div>
        )}

        {/* Resumo */}
        {s.summary && (
          <div className="section-card">
            <div className="section-title">Resumo</div>
            <p style={{ fontSize: 15, color: "#44403c", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{s.summary}</p>
          </div>
        )}

        {/* Participantes */}
        {s.participants.length > 0 && (
          <div className="section-card">
            <div className="section-title">Participantes ({s.participants.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {s.participants.map((p) => {
                const { displayName, isMember } = getParticipantDisplay(p.name, p.email);
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", backgroundColor: "#fafaf9", borderRadius: 10, border: "1px solid #e7e5e4" }}>
                    <div className="avatar-sm" style={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: "#1c1917" }}>{displayName}</span>
                        <span className={`badge badge-${isMember ? "success" : "info"}`} style={{ fontSize: 10, padding: "1px 6px" }}>
                          {isMember ? "Membro" : "Visitante"}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 13, color: "#57534e" }}>
                        {fmtTime(p.joinTime)} → {fmtTime(p.leaveTime)}
                      </div>
                      <div style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>
                        {fmtDuration(p.duration)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Arquivos */}
        <div className="section-card">
          <div className="section-title">Arquivos</div>
          <ProtectedDocuments
            sessionId={id}
            documents={visibleDocs}
            hasPassword={!!s.contentPassword}
          />
        </div>

        {/* Informações */}
        <div className="section-card">
          <div className="section-title">Informações</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Reunião Zoom", value: s.zoomMeetingId },
              { label: "UUID", value: s.zoomUuid || "—" },
              { label: "Criado em", value: formatDateTime(s.createdAt) },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "#78716c" }}>{item.label}</span>
                <span style={{ color: "#44403c", fontFamily: "monospace", fontSize: 12, backgroundColor: "#f5f5f4", padding: "2px 8px", borderRadius: 6 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
