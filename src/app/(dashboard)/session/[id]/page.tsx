import { auth } from "@/features/auth/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/shared/lib/db";
import Link from "next/link";
import { DocType, PipelineStatus } from "@prisma/client";
import ProtectedDocuments from "@/features/sessions/components/ProtectedDocuments";
import { ParticipantLog } from "@/features/sessions/components/ParticipantLog";
import { isAdmin as checkIsAdmin } from "@/features/permissions/lib/role-hierarchy";
import type { UserRoleType } from "@/features/permissions/lib/role-hierarchy";

// Navegação entre sessões — componente client
import { SessionNavigation } from "@/features/sessions/components/SessionNavigation";

const DOC_CFG: Record<DocType, { label: string; bg: string; color: string; border: string; adminOnly?: boolean; isProtected?: boolean; hidden?: boolean }> = {
  TRANSCRIPT_RAW: { label: "Transcrição Bruta", bg: "rgba(113,113,122,0.1)", color: "#a1a1aa", border: "rgba(113,113,122,0.2)", hidden: true },
  TRANSCRIPT_CLEAN: { label: "Transcrição Limpa", bg: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "rgba(59,130,246,0.2)", hidden: true },
  BIBLE_TEXT: { label: "Texto Bíblico (NVI)", bg: "rgba(245,166,35,0.1)", color: "#f5a623", border: "rgba(245,166,35,0.2)" },
  INFOGRAPHIC: { label: "Mapa Mental", bg: "rgba(234,88,12,0.1)", color: "#ea580c", border: "rgba(234,88,12,0.2)", isProtected: true },
  SLIDES: { label: "Slides", bg: "rgba(124,58,237,0.1)", color: "#7c3aed", border: "rgba(124,58,237,0.2)", isProtected: true },
  AUDIO_OVERVIEW: { label: "Vídeo Resumo", bg: "rgba(219,39,119,0.1)", color: "#db2777", border: "rgba(219,39,119,0.2)", isProtected: true, adminOnly: true },
  AI_SUMMARY: { label: "Resumo IA", bg: "rgba(16,185,129,0.1)", color: "#10b981", border: "rgba(16,185,129,0.2)" },
  PLANNING: { label: "Planejamento", bg: "rgba(99,102,241,0.1)", color: "#6366f1", border: "rgba(99,102,241,0.2)", adminOnly: true },
};

const ST: Record<PipelineStatus, { label: string; variant: string }> = {
  COMPLETED: { label: "Concluído", variant: "success" },
  ERROR: { label: "Erro no pipeline", variant: "error" },
  RUNNING: { label: "Processando...", variant: "warning" },
  PENDING: { label: "Pendente", variant: "info" },
};

function formatSessionDate(date: Date, startTime?: Date | null): string {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  if (startTime) {
    const t = new Date(startTime);
    const timeStr = t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${dateStr}, ${timeStr}`;
  }
  return dateStr;
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  const s = await prisma.session.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { createdAt: "asc" } },
      participants: {
        orderBy: { joinTime: "asc" },
        include: { entries: { orderBy: { joinTime: "asc" } } },
      },
      attendances: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!s) notFound();

  const st = ST[s.status];
  const userRole = ((session.user as { role?: string })?.role || "MEMBER") as UserRoleType;
  const userIsAdmin = checkIsAdmin(userRole);

  // Buscar sessões adjacentes para navegação (pular sessões com erro)
  const [prevSession, nextSession] = await Promise.all([
    prisma.session.findFirst({
      where: { date: { lt: s.date }, status: { not: "ERROR" } },
      orderBy: { date: "desc" },
      select: { id: true, chapterRef: true },
    }),
    prisma.session.findFirst({
      where: { date: { gt: s.date }, status: { not: "ERROR" } },
      orderBy: { date: "asc" },
      select: { id: true, chapterRef: true },
    }),
  ]);

  // Build attendance map
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

  // Docs visíveis (sem transcrições, vídeo só para admin)
  const visibleDocs = s.documents
    .filter(doc => {
      const cfg = DOC_CFG[doc.type];
      if (!cfg || cfg.hidden) return false;
      if (cfg.adminOnly && !userIsAdmin) return false;
      return true;
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

  // Buscar AI_SUMMARY se existir
  const aiSummaryDoc = s.documents.find(d => d.type === "AI_SUMMARY");
  const summaryText = s.summary || null;

  // Preparar participantes para ParticipantLog — deduplicar por email/nome
  const participantMap = new Map<string, {
    id: string;
    displayName: string;
    isMember: boolean;
    duration: number;
    totalDuration: number;
    entries: { id: string; joinTime: string; leaveTime: string; duration: number }[];
  }>();

  for (const p of s.participants) {
    const { displayName, isMember } = getParticipantDisplay(p.name, p.email);
    const key = (p.email || displayName).toLowerCase();

    const existing = participantMap.get(key);
    if (existing) {
      // Somar durações e merge entries
      existing.totalDuration += p.totalDuration || p.duration;
      existing.duration += p.duration;
      if (p.entries && p.entries.length > 0) {
        existing.entries.push(...p.entries.map(e => ({
          id: e.id,
          joinTime: e.joinTime.toISOString(),
          leaveTime: e.leaveTime.toISOString(),
          duration: e.duration,
        })));
      } else {
        // Sem entries detalhadas — criar uma entry sintética
        existing.entries.push({
          id: p.id,
          joinTime: p.joinTime.toISOString(),
          leaveTime: p.leaveTime.toISOString(),
          duration: p.duration,
        });
      }
      // Promover para membro se qualquer registro for membro
      if (isMember) existing.isMember = true;
    } else {
      const entries = (p.entries && p.entries.length > 0)
        ? p.entries.map(e => ({
            id: e.id,
            joinTime: e.joinTime.toISOString(),
            leaveTime: e.leaveTime.toISOString(),
            duration: e.duration,
          }))
        : [{
            id: p.id,
            joinTime: p.joinTime.toISOString(),
            leaveTime: p.leaveTime.toISOString(),
            duration: p.duration,
          }];

      participantMap.set(key, {
        id: p.id,
        displayName,
        isMember,
        duration: p.duration,
        totalDuration: p.totalDuration || p.duration,
        entries,
      });
    }
  }

  // Ordenar entries por joinTime em cada participante
  for (const p of participantMap.values()) {
    p.entries.sort((a, b) => new Date(a.joinTime).getTime() - new Date(b.joinTime).getTime());
  }

  const participantsForLog = Array.from(participantMap.values());

  const formattedDate = formatSessionDate(s.date, s.startTime);
  const bookName = s.chapterRef ? `Livro de ${s.chapterRef.split(/\s+\d/)[0]}` : null;

  return (
    <div>
      {/* Navegação anterior/próximo + Voltar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <Link
          href="/books"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>

        <SessionNavigation
          previousId={prevSession?.id || null}
          previousLabel={prevSession?.chapterRef || null}
          nextId={nextSession?.id || null}
          nextLabel={nextSession?.chapterRef || null}
        />
      </div>

      {/* Data + Horário */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontSize: 14, color: "var(--text-muted)" }}>
        <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        {formattedDate}
        {bookName && (
          <>
            <span style={{ color: "var(--border)" }}>|</span>
            <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            {bookName}
          </>
        )}
      </div>

      {/* Título + Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)" }}>
          {s.chapterRef || "Devocional"}
        </h1>
        <span className={`badge badge-${st.variant}`}>{st.label}</span>
      </div>

      {/* Erro */}
      {s.status === "ERROR" && s.errorMessage && (
        <div className="alert-error" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--error)", marginBottom: 6 }}>Erro no pipeline</div>
          <div style={{ fontSize: 12, color: "var(--error)", fontFamily: "monospace", backgroundColor: "var(--error-bg)", padding: "8px 12px", borderRadius: 8, wordBreak: "break-all" }}>{s.errorMessage}</div>
        </div>
      )}

      {/* LAYOUT VERTICAL — Resumo IA → Arquivos → Participantes */}

      {/* 1. Resumo gerado por IA */}
      {summaryText && (
        <div
          className="section-card"
          style={{
            marginBottom: 20,
            borderLeft: "3px solid var(--accent)",
          }}
        >
          <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Resumo gerado por IA
          </div>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {summaryText}
          </p>
        </div>
      )}

      {/* 2. Arquivos da Sessão */}
      {visibleDocs.length > 0 && (
        <div className="section-card" style={{ marginBottom: 20 }}>
          <div className="section-title">Arquivos da Sessão</div>
          <ProtectedDocuments
            sessionId={id}
            documents={visibleDocs}
            hasPassword={!!s.contentPassword}
          />
        </div>
      )}

      {/* 3. Participantes (log de entradas/saídas) */}
      {participantsForLog.length > 0 && (
        <div className="section-card" style={{ marginBottom: 20 }}>
          <div className="section-title">
            Participantes ({participantsForLog.length})
          </div>
          <ParticipantLog participants={participantsForLog} />
        </div>
      )}

      {/* Metadata (apenas admin) */}
      {userIsAdmin && (
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
          <span>Processado em: {s.createdAt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      )}
    </div>
  );
}
