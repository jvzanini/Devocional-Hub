import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SessionCard } from "@/components/SessionCard";
import { PipelineButton } from "@/components/PipelineButton";
import { signOut } from "@/lib/auth";
import { DocType, PipelineStatus } from "@prisma/client";

interface Document {
  id: string;
  type: DocType;
  fileName: string;
  fileSize: number | null;
}

interface Session {
  id: string;
  date: Date;
  chapterRef: string;
  summary: string;
  participants: string[];
  status: PipelineStatus;
  documents: Document[];
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const sessions: Session[] = await prisma.session.findMany({
    orderBy: { date: "desc" },
    include: {
      documents: {
        select: { id: true, type: true, fileName: true, fileSize: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const completed = sessions.filter((s) => s.status === "COMPLETED").length;
  const running = sessions.filter((s) => s.status === "RUNNING").length;
  const firstName = session.user?.name?.split(" ")[0] || "usuário";

  return (
    <div className="min-h-dvh bg-bg">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-md border-b border-border-light sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-sm flex items-center justify-center" style={{ boxShadow: "0 4px 12px -2px rgba(180, 83, 9, 0.20)" }}>
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-text text-sm leading-none">DevocionalHub</h1>
              <p className="text-[11px] text-text-muted mt-0.5">Olá, {firstName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PipelineButton />
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button
                type="submit"
                aria-label="Sair da conta"
                className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-muted rounded-sm transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { value: sessions.length, label: "Devocionais", color: "text-text" },
            { value: completed, label: "Concluídos", color: "text-success" },
            { value: running, label: "Processando", color: running > 0 ? "text-warning" : "text-text-muted" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-md border border-border p-4 text-center" style={{ boxShadow: "0 1px 2px 0 rgba(28,25,23,0.04)" }}>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[11px] text-text-muted mt-0.5 font-medium uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Devocionais recentes
          </h2>
          {running > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-warning bg-warning-surface px-2.5 py-1 rounded-sm border border-amber-200 font-medium">
              <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse-subtle" />
              Pipeline em andamento
            </span>
          )}
        </div>

        {/* Sessions */}
        {sessions.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-muted rounded-lg mb-4">
              <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="font-medium text-text-secondary mb-1">Nenhum devocional ainda</p>
            <p className="text-sm text-text-muted">
              Clique em &quot;Executar&quot; para processar a última gravação do Zoom
            </p>
          </div>
        ) : (
          <div className="space-y-3" role="list">
            {sessions.map((s, i) => (
              <div key={s.id} role="listitem" className="animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                <SessionCard session={{ ...s, date: s.date.toISOString() }} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
