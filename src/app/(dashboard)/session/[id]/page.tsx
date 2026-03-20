import { auth } from "@/features/auth/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/shared/lib/db";
import Link from "next/link";
import { formatDateShort, formatDateTime } from "@/shared/lib/utils";
import { DocType, PipelineStatus } from "@prisma/client";
import ProtectedDocuments from "@/features/sessions/components/ProtectedDocuments";

const DOC_CFG: Record<DocType, { label: string; bg: string; color: string; border: string; adminOnly?: boolean; isProtected?: boolean }> = {
  TRANSCRIPT_RAW: { label: "Transcrição Bruta", bg: "rgba(113,113,122,0.1)", color: "#a1a1aa", border: "rgba(113,113,122,0.2)" },
  TRANSCRIPT_CLEAN: { label: "Transcrição Limpa", bg: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "rgba(59,130,246,0.2)" },
  BIBLE_TEXT: { label: "Texto Bíblico (NVI)", bg: "rgba(245,166,35,0.1)", color: "#f5a623", border: "rgba(245,166,35,0.2)" },
  INFOGRAPHIC: { label: "Infográfico", bg: "rgba(234,88,12,0.1)", color: "#ea580c", border: "rgba(234,88,12,0.2)", isProtected: true },
  SLIDES: { label: "Slides", bg: "rgba(124,58,237,0.1)", color: "#7c3aed", border: "rgba(124,58,237,0.2)", isProtected: true },
  AUDIO_OVERVIEW: { label: "Vídeo Resumo (PT-BR)", bg: "rgba(219,39,119,0.1)", color: "#db2777", border: "rgba(219,39,119,0.2)", isProtected: true },
};

const ST: Record<PipelineStatus, { label: string; variant: string }> = {
  COMPLETED: { label: "Concluído", variant: "success" },
  ERROR: { label: "Erro no pipeline", variant: "error" },
  RUNNING: { label: "Processando...", variant: "warning" },
  PENDING: { label: "Pendente", variant: "info" },
};

const AVATAR_COLORS = ['#f59e0b', '#ea580c', '#059669', '#7c3aed', '#6b7280', '#2563eb'];

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}min` : ""}`;
  return `${m}min`;
}

function fmtFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const formattedDate = formatDateShort(s.date);
  const bookName = s.chapterRef ? `Livro de ${s.chapterRef.split(/\s+\d/)[0]}` : null;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-secondary)",
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 20,
        }}
      >
        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Voltar para o Início
      </Link>

      {/* Title + Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)" }}>
          {s.chapterRef || "Devocional"}
        </h1>
        <span className={`badge badge-${st.variant}`}>{st.label}</span>
      </div>

      {/* Metadata line */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, fontSize: 14, color: "var(--text-muted)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          {formattedDate}
        </span>
        {bookName && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            {bookName}
          </span>
        )}
      </div>

      {/* Erro */}
      {s.status === "ERROR" && s.errorMessage && (
        <div className="alert-error" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--error)", marginBottom: 6 }}>Erro no pipeline</div>
          <div style={{ fontSize: 12, color: "var(--error)", fontFamily: "monospace", backgroundColor: "var(--error-bg)", padding: "8px 12px", borderRadius: 8, wordBreak: "break-all" }}>{s.errorMessage}</div>
        </div>
      )}

      {/* Summary */}
      {s.summary && (
        <div className="section-card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Resumo gerado por IA
          </div>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{s.summary}</p>
        </div>
      )}

      {/* Two-column grid */}
      <div className="session-detail-grid" style={{ marginBottom: 20 }}>
        {/* LEFT: Participants */}
        {s.participants.length > 0 && (
          <div className="section-card">
            <div className="section-title">Participantes ({s.participants.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {s.participants.map((p, index) => {
                const { displayName, isMember } = getParticipantDisplay(p.name, p.email);
                const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                return (
                  <div key={p.id} className="participant-row" style={{ borderBottom: index < s.participants.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: index < s.participants.length - 1 ? 10 : 0 }}>
                    <div className="avatar-md" style={{ backgroundColor: avatarColor }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {isMember ? "Membro" : "Visitante"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, color: "var(--text-muted)", fontSize: 13 }}>
                      <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {fmtDuration(p.duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RIGHT: Files */}
        <div className="section-card">
          <div className="section-title">Arquivos da sessão</div>
          <ProtectedDocuments
            sessionId={id}
            documents={visibleDocs}
            hasPassword={!!s.contentPassword}
          />
        </div>
      </div>

      {/* Bottom metadata */}
      <div style={{
        backgroundColor: "var(--surface-hover)",
        borderRadius: 10,
        padding: "14px 18px",
        display: "flex",
        gap: 24,
        fontSize: 12,
        fontFamily: "monospace",
        color: "var(--text-muted)",
        flexWrap: "wrap",
      }}>
        <span>Meeting ID: {s.zoomMeetingId || "N/A"}</span>
        <span>Processado em: {formatDateTime(s.createdAt)}</span>
      </div>
    </div>
  );
}
