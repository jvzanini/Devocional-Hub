import { auth } from "@/features/auth/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/db";
import { DashboardCalendar } from "@/features/dashboard/components/DashboardCalendar";
import { BooksDistributionChart } from "@/features/dashboard/components/BooksDistributionChart";
import Link from "next/link";
import { extractBookName } from "@/shared/lib/bible-utils";

function getGreetingName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "usuário";
  return parts[0] || "usuário";
}

function getGreeting(): string {
  const now = new Date();
  const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const h = brTime.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
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

  const settings = await prisma.appSetting.findMany();
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  const zoomMeetingId = settingsMap.zoomMeetingId || "";
  const zoomLink = settingsMap.zoomLink || (zoomMeetingId ? `https://zoom.us/j/${zoomMeetingId}` : "");

  const userId = (session.user as { id?: string })?.id;
  const dbUser = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }) : null;
  const userName = dbUser?.name || session.user?.name || "usuário";
  const greetingName = getGreetingName(userName);

  const recentCompleted = sessions.find(s =>
    s.status === "COMPLETED" &&
    s.chapterRef &&
    s.chapterRef !== "Não identificado"
  );
  const totalCompleted = sessions.filter(s => s.status === "COMPLETED").length;

  // Calendar data
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

  // Active reading plan
  const activePlan = await prisma.readingPlan.findFirst({
    where: { status: "IN_PROGRESS" },
    include: { days: { orderBy: { date: "asc" } } },
  });

  const upcomingPlan = await prisma.readingPlan.findFirst({
    where: { status: "UPCOMING" },
    orderBy: { startDate: "asc" },
    select: { bookName: true, bookCode: true, startDate: true },
  });

  // Attendance
  let attendancePercentage = 0;
  let attendedCount = 0;
  if (userId) {
    attendedCount = await prisma.attendance.count({ where: { userId } });
    attendancePercentage = totalCompleted > 0 ? Math.round((attendedCount / totalCompleted) * 100) : 0;
  }

  // Reading plan progress
  let planProgress = 0;
  let planDaysCompleted = 0;
  let planTotalDays = 0;
  if (activePlan) {
    planTotalDays = activePlan.days.length;
    planDaysCompleted = activePlan.days.filter(d => d.completed).length;
    planProgress = planTotalDays > 0 ? Math.round((planDaysCompleted / planTotalDays) * 100) : 0;
  }

  // Reading plan data for calendar
  const planDays: Record<string, { chapters: string; bookAbbr: string; completed: boolean }> = {};
  const allActivePlans = await prisma.readingPlan.findMany({
    where: { status: { in: ["IN_PROGRESS", "UPCOMING"] } },
    include: { days: { orderBy: { date: "asc" } } },
  });
  const { BIBLE_BOOKS } = await import("@/features/bible/lib/bible-books");
  for (const plan of allActivePlans) {
    const book = BIBLE_BOOKS.find(b => b.code === plan.bookCode);
    for (const day of plan.days) {
      const dk = new Date(day.date).toISOString().split("T")[0];
      if (!planDays[dk]) {
        planDays[dk] = { chapters: day.chapters, bookAbbr: book?.abbr || "?", completed: day.completed };
      }
    }
  }

  const endDateFormatted = activePlan
    ? `Até ${new Date(activePlan.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
    : "";

  // Book distribution data for pie chart
  const bookCounts: Record<string, number> = {};
  for (const s of sessions) {
    if (s.status === "COMPLETED") {
      const bookName = extractBookName(s.chapterRef || "");
      bookCounts[bookName] = (bookCounts[bookName] || 0) + 1;
    }
  }
  const booksDistributionData = Object.entries(bookCounts)
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions);

  return (
    <>
      {/* ─── Welcome ─── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 4 }}>
          {getGreeting()}, {greetingName}!
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-muted)" }}>
          Aqui está o resumo do seu devocional diário.
        </p>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="section-title" style={{ marginBottom: 8 }}>Devocionais</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{totalCompleted}</span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>concluídos</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="section-title" style={{ marginBottom: 8 }}>Frequência</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{attendancePercentage}%</span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{attendedCount} presenças</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="section-title" style={{ marginBottom: 8 }}>Plano Ativo</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
              {activePlan ? `${planProgress}%` : "—"}
            </span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {activePlan ? activePlan.bookName : "Nenhum plano"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Banner de Leitura (redesenhado) ─── */}
      {activePlan && (
        <div className="reading-banner" style={{
          backgroundColor: "var(--surface)",
          border: "1.5px solid var(--accent)",
          borderRadius: "var(--radius-xl)",
          padding: 28,
          marginBottom: 24,
          boxShadow: "0 4px 24px rgba(245,166,35,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg style={{ width: 26, height: 26, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>
                Leitura: {activePlan.bookName}
              </h2>
              <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 2 }}>
                {activePlan.chaptersPerDay} capítulos por dia · {endDateFormatted}
              </div>
            </div>
          </div>

          {/* Barra de progresso grande */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text-secondary)", marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Progresso ({planDaysCompleted}/{planTotalDays} dias)</span>
              <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 16 }}>{planProgress}%</span>
            </div>
            <div className="progress-bar" style={{ height: 12, borderRadius: 6 }}>
              <div className="progress-fill" style={{ width: `${planProgress}%`, backgroundColor: "var(--accent)", borderRadius: 6 }} />
            </div>
          </div>

          {upcomingPlan && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              Próximo: {upcomingPlan.bookName}
            </div>
          )}

          {/* Botões elaborados */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {zoomLink && (
              <a href={zoomLink} target="_blank" rel="noopener noreferrer" style={{
                textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 10,
                background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                color: "#fff", fontWeight: 600, fontSize: 15,
                boxShadow: "0 4px 14px rgba(245,166,35,0.3)",
                transition: "all 0.2s",
              }}>
                <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                Entrar no Zoom
              </a>
            )}
            <Link href="/books" className="btn-outline" style={{
              textDecoration: "none", justifyContent: "center",
              padding: "12px 24px", borderRadius: 10, fontSize: 15,
            }}>
              Ver Plano
            </Link>
          </div>
        </div>
      )}

      {/* Zoom standalone (sem plano ativo) */}
      {!activePlan && zoomLink && (
        <div style={{ marginBottom: 24 }}>
          <a href={zoomLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: "none" }}>
            <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Entrar no Zoom
          </a>
        </div>
      )}

      {/* ─── Distribuição por Livro ─── */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-title">Distribuição por Livro</div>
        <div className="card" style={{ padding: 24 }}>
          <BooksDistributionChart data={booksDistributionData} />
        </div>
      </div>

      {/* ─── Devocional Recente ─── */}
      {recentCompleted && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title">Devocional mais recente</div>
          <Link href={`/session/${recentCompleted.id}`} style={{ textDecoration: "none", display: "block" }}>
            <div className="card card-hover" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: "linear-gradient(135deg, var(--accent), var(--accent-hover))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg style={{ width: 18, height: 18, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                      {recentCompleted.chapterRef || "Devocional"}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
                      <svg style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {new Date(recentCompleted.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </div>
                  </div>
                </div>
                <span className="badge badge-success">Concluído</span>
              </div>

              {recentCompleted.summary && (
                <p style={{
                  fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: 14,
                }}>
                  {recentCompleted.summary}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 14, borderTop: "1px solid var(--border-light)", flexWrap: "wrap" }}>
                {recentCompleted.documents.length > 0 && (
                  <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                    <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    {recentCompleted.documents.length} arquivo{recentCompleted.documents.length !== 1 ? "s" : ""}
                  </span>
                )}
                {recentCompleted.participants.length > 0 && (
                  <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                    <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {recentCompleted.participants.length} presentes
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--accent)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  Ver detalhes
                  <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ─── Calendar ─── */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title">Calendário</div>
        <DashboardCalendar
          datesWithDevotional={datesWithDevotional}
          dateToSessionId={dateToSessionId}
          planDays={planDays}
        />
      </div>
    </>
  );
}
