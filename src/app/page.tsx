import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SessionCard } from "@/components/SessionCard";
import { PipelineButton } from "@/components/PipelineButton";
import { signOut } from "@/lib/auth";
import { DocType, PipelineStatus } from "@prisma/client";

interface Document { id: string; type: DocType; fileName: string; fileSize: number | null; }
interface Participant { id: string; name: string; duration: number; }
interface Session { id: string; date: Date; chapterRef: string; summary: string; participants: Participant[]; status: PipelineStatus; documents: Document[]; }

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const sessions: Session[] = await prisma.session.findMany({
    orderBy: { date: "desc" },
    include: {
      documents: { select: { id: true, type: true, fileName: true, fileSize: true }, orderBy: { createdAt: "asc" } },
      participants: { select: { id: true, name: true, duration: true } },
    },
  });

  const completed = sessions.filter((s) => s.status === "COMPLETED").length;
  const running = sessions.filter((s) => s.status === "RUNNING").length;
  const firstName = session.user?.name?.split(" ")[0] || "usuário";
  const userRole = (session.user as { role?: string })?.role || "MEMBER";
  const isAdmin = userRole === "ADMIN";

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="app-header">
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="logo-icon-sm" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <svg style={{ width: 22, height: 22, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#1c1917", letterSpacing: "-0.01em" }}>Devocional Hub</div>
              <div style={{ fontSize: 13, color: "#a8a29e" }}>Olá, {firstName}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PipelineButton />
            {isAdmin && (
              <a href="/admin" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c", border: "1px solid #e7e5e4", borderRadius: 10, textDecoration: "none" }} title="Admin">
                <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a7.723 7.723 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
            )}
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c", background: "none", border: "1px solid #e7e5e4", borderRadius: 10, cursor: "pointer" }} title="Sair">
                <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 36 }}>
          <div className="stat-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#1c1917" }}>{sessions.length}</div>
            <div style={{ fontSize: 13, color: "#78716c", fontWeight: 500, marginTop: 4 }}>Devocionais</div>
          </div>
          <div className="stat-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#059669" }}>{completed}</div>
            <div style={{ fontSize: 13, color: "#78716c", fontWeight: 500, marginTop: 4 }}>Concluídos</div>
          </div>
          <div className="stat-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: running > 0 ? "#d97706" : "#d6d3d1" }}>{running}</div>
            <div style={{ fontSize: 13, color: "#78716c", fontWeight: 500, marginTop: 4 }}>Processando</div>
          </div>
        </div>

        {/* Section header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#44403c" }}>Devocionais Recentes</span>
          {running > 0 && <span className="badge badge-warning" style={{ fontSize: 12 }}>Pipeline em andamento</span>}
        </div>

        {/* Sessions */}
        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div className="logo-icon" style={{ margin: "0 auto 20px", width: 64, height: 64, opacity: 0.3 }}>
              <svg style={{ width: 32, height: 32, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, color: "#57534e", fontSize: 16, marginBottom: 6 }}>Nenhum devocional ainda</p>
            <p style={{ fontSize: 14, color: "#a8a29e" }}>Clique em &quot;Executar&quot; para processar a última transcrição do Zoom</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {sessions.map((s) => (
              <SessionCard key={s.id} session={{ ...s, date: s.date.toISOString() }} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
