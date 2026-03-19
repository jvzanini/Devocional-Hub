import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { BibleBooksGrid } from "@/components/BibleBooksGrid";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import Link from "next/link";

/** Extrai o nome do livro de uma referência bíblica (ex: "João 3:16" → "João") */
function extractBookName(chapterRef: string): string {
  if (!chapterRef) return "Outros";
  // Pega tudo antes do primeiro dígito, removendo espaços extras
  const match = chapterRef.match(/^(\d?\s?[A-Za-zÀ-ú]+)/);
  if (match) return match[1].trim();
  return chapterRef.split(" ")[0] || "Outros";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const sessions = await prisma.session.findMany({
    orderBy: { date: "desc" },
    include: {
      documents: { select: { id: true, type: true, fileName: true, fileSize: true }, orderBy: { createdAt: "asc" } },
      participants: { select: { id: true, name: true, duration: true } },
    },
  });

  // Settings for Zoom card
  const settings = await prisma.appSetting.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;
  const zoomMeetingId = settingsMap.zoomMeetingId || "";
  const zoomLink = zoomMeetingId ? `https://zoom.us/j/${zoomMeetingId}` : "";

  const firstName = session.user?.name?.split(" ")[0] || "usuário";
  const userRole = (session.user as { role?: string })?.role || "MEMBER";
  const isAdmin = userRole === "ADMIN";

  // Last completed devotional
  const recentCompleted = sessions.find(s => s.status === "COMPLETED");

  // Calendar data: map dates to session IDs
  const datesWithDevotional: string[] = [];
  const dateToSessionId: Record<string, string> = {};
  for (const s of sessions) {
    if (s.status === "COMPLETED") {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!dateToSessionId[key]) {
        datesWithDevotional.push(key);
        dateToSessionId[key] = s.id;
      }
    }
  }

  // Group sessions by Bible book (only completed ones)
  const bookMap = new Map<string, { id: string; chapterRef: string; date: string; summary: string; status: string }[]>();
  for (const s of sessions) {
    if (s.status !== "COMPLETED" && s.status !== "RUNNING") continue;
    const bookName = extractBookName(s.chapterRef);
    if (!bookMap.has(bookName)) bookMap.set(bookName, []);
    bookMap.get(bookName)!.push({
      id: s.id,
      chapterRef: s.chapterRef || "Sem referência",
      date: s.date.toISOString(),
      summary: s.summary,
      status: s.status,
    });
  }
  const books = Array.from(bookMap.entries()).map(([name, sessions]) => ({ name, sessions }));

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="app-header">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="logo-icon-sm" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <svg style={{ width: 22, height: 22, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, color: "#1c1917", letterSpacing: "-0.01em" }}>Devocional Hub</div>
              <div style={{ fontSize: 14, color: "#a8a29e" }}>Olá, {firstName}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isAdmin && (
              <a href="/admin" style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c", border: "1px solid #e7e5e4", borderRadius: 10, textDecoration: "none" }} title="Admin">
                <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a7.723 7.723 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
            )}
            <a href="/profile" style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c", border: "1px solid #e7e5e4", borderRadius: 10, textDecoration: "none" }} title="Perfil">
              <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </a>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", color: "#78716c", background: "none", border: "1px solid #e7e5e4", borderRadius: 10, cursor: "pointer" }} title="Sair">
                <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 60px" }}>
        {/* ─── Card Zoom + Próximo Devocional ─── */}
        {zoomLink && (
          <div style={{
            background: "linear-gradient(135deg, #451a03 0%, #78350f 50%, #92400e 100%)",
            borderRadius: 20,
            padding: 28,
            marginBottom: 28,
            color: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Decorative circle */}
            <div style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "rgba(251,191,36,0.1)",
            }} />
            <div style={{
              position: "absolute",
              bottom: -20,
              right: 60,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(251,191,36,0.06)",
            }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg style={{ width: 24, height: 24, color: "#fbbf24" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>Devocional Diário</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Todos os dias às 6:00</div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <a
                  href={zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 22px",
                    borderRadius: 12,
                    backgroundColor: "#fbbf24",
                    color: "#451a03",
                    fontSize: 15,
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(251,191,36,0.4)",
                    transition: "all 0.15s",
                  }}
                >
                  <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  Entrar no Zoom
                </a>
                <AddToCalendarButton zoomMeetingId={zoomMeetingId} zoomLink={zoomLink} />
              </div>

              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 14, fontFamily: "monospace" }}>
                ID: {zoomMeetingId}
              </div>
            </div>
          </div>
        )}

        {/* ─── Devocional Recente (destaque) ─── */}
        {recentCompleted && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              Devocional mais recente
            </div>
            <Link href={`/session/${recentCompleted.id}`} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                backgroundColor: "#ffffff",
                borderRadius: 20,
                border: "2px solid #fde68a",
                padding: 24,
                boxShadow: "0 4px 16px rgba(217,119,6,0.08)",
                transition: "all 0.2s",
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #fbbf24, #d97706)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg style={{ width: 20, height: 20, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1c1917" }}>
                        {recentCompleted.chapterRef || "Devocional"}
                      </h3>
                      <span style={{ fontSize: 14, color: "#a8a29e" }}>
                        {new Date(recentCompleted.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: 13, padding: "4px 12px" }}>Concluído</span>
                </div>

                {recentCompleted.summary && (
                  <p style={{
                    fontSize: 15,
                    color: "#57534e",
                    lineHeight: 1.7,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    marginBottom: 14,
                  }}>
                    {recentCompleted.summary}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 14, borderTop: "1px solid #f5f5f4" }}>
                  {recentCompleted.documents.length > 0 && (
                    <span style={{ fontSize: 13, color: "#78716c", display: "flex", alignItems: "center", gap: 6 }}>
                      <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      {recentCompleted.documents.length} arquivo{recentCompleted.documents.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {recentCompleted.participants.length > 0 && (
                    <span style={{ fontSize: 13, color: "#78716c", display: "flex", alignItems: "center", gap: 6 }}>
                      <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      {recentCompleted.participants.length} participante{recentCompleted.participants.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 14, color: "#d97706", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    Ver detalhes
                    <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ─── Layout: Calendário + Livros ─── */}
        <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* Calendário */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              Calendário
            </div>
            <DashboardCalendar datesWithDevotional={datesWithDevotional} dateToSessionId={dateToSessionId} />
          </div>

          {/* Livros da Bíblia */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              Livros da Bíblia
            </div>
            <BibleBooksGrid books={books} />
          </div>
        </div>
      </main>
    </div>
  );
}
