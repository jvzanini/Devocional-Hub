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

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100/50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-stone-200/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-stone-900 text-sm leading-none">DevocionalHub</h1>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Ol\u00e1, {session.user?.name || "usu\u00e1rio"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PipelineButton />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-xs text-stone-400 hover:text-stone-600 px-2.5 py-2 rounded-lg hover:bg-stone-100 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-xl border border-stone-200/80 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-stone-800">{sessions.length}</div>
            <div className="text-[11px] text-stone-400 mt-0.5 font-medium uppercase tracking-wider">Devocionais</div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/80 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-emerald-600">{completed}</div>
            <div className="text-[11px] text-stone-400 mt-0.5 font-medium uppercase tracking-wider">Conclu\u00eddos</div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/80 p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${running > 0 ? "text-amber-600" : "text-stone-300"}`}>{running}</div>
            <div className="text-[11px] text-stone-400 mt-0.5 font-medium uppercase tracking-wider">Processando</div>
          </div>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Devocionais recentes
          </h2>
          {running > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 animate-pulse-slow font-medium">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              Pipeline em andamento
            </span>
          )}
        </div>

        {/* Sessions */}
        {sessions.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-stone-100 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="font-medium text-stone-500 mb-1">Nenhum devocional ainda</p>
            <p className="text-sm text-stone-400">
              Clique em &quot;Executar Pipeline&quot; para processar a \u00faltima grava\u00e7\u00e3o do Zoom
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <div key={s.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <SessionCard
                  session={{
                    ...s,
                    date: s.date.toISOString(),
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
