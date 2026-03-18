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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✝️</span>
            <div>
              <h1 className="font-bold text-gray-900 leading-none">DevocionalHub</h1>
              <p className="text-xs text-gray-400">Olá, {session.user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <PipelineButton />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
            <div className="text-xs text-gray-500 mt-1">Devocionais</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <div className="text-xs text-gray-500 mt-1">Concluídos</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{running || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Em processamento</div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Devocionais</h2>
          {running > 0 && (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full animate-pulse">
              Pipeline em andamento...
            </span>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📖</div>
            <p className="font-medium">Nenhum devocional ainda</p>
            <p className="text-sm mt-1">Clique em &quot;Executar Pipeline&quot; para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={{
                  ...s,
                  date: s.date.toISOString(),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
