import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SessionCard } from "@/components/SessionCard";
import { PipelineButton } from "@/components/PipelineButton";
import { signOut } from "@/lib/auth";
import { DocType, PipelineStatus } from "@prisma/client";

interface Document { id: string; type: DocType; fileName: string; fileSize: number | null; }
interface Session { id: string; date: Date; chapterRef: string; summary: string; participants: string[]; status: PipelineStatus; documents: Document[]; }

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const sessions: Session[] = await prisma.session.findMany({
    orderBy: { date: "desc" },
    include: { documents: { select: { id: true, type: true, fileName: true, fileSize: true }, orderBy: { createdAt: "asc" } } },
  });

  const completed = sessions.filter((s) => s.status === "COMPLETED").length;
  const running = sessions.filter((s) => s.status === "RUNNING").length;
  const firstName = session.user?.name?.split(" ")[0] || "usuário";

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="app-header">
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="logo-icon-sm">
              <svg style={{ width: 18, height: 18, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1c1917" }}>DevocionalHub</div>
              <div style={{ fontSize: 11, color: "#a8a29e" }}>Olá, {firstName}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PipelineButton />
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#a8a29e", background: "none", border: "none", borderRadius: 8, cursor: "pointer" }}>
                <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
          <div className="stat-card">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1c1917" }}>{sessions.length}</div>
            <div style={{ fontSize: 11, color: "#a8a29e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Devocionais</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#059669" }}>{completed}</div>
            <div style={{ fontSize: 11, color: "#a8a29e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Concluídos</div>
          </div>
          <div className="stat-card">
            <div style={{ fontSize: 28, fontWeight: 700, color: running > 0 ? "#d97706" : "#d6d3d1" }}>{running}</div>
            <div style={{ fontSize: 11, color: "#a8a29e", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>Processando</div>
          </div>
        </div>

        {/* Section header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span className="section-title" style={{ marginBottom: 0 }}>Devocionais recentes</span>
          {running > 0 && <span className="badge badge-warning" style={{ fontSize: 11, animation: "pulse 2s ease-in-out infinite" }}>Pipeline em andamento</span>}
        </div>

        {/* Sessions */}
        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#e7e5e4", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg style={{ width: 28, height: 28, color: "#a8a29e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p style={{ fontWeight: 500, color: "#78716c", marginBottom: 4 }}>Nenhum devocional ainda</p>
            <p style={{ fontSize: 14, color: "#a8a29e" }}>Clique em &quot;Executar&quot; para processar a última gravação do Zoom</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sessions.map((s) => (
              <SessionCard key={s.id} session={{ ...s, date: s.date.toISOString() }} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
