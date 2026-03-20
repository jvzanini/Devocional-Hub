import { auth } from "@/features/auth/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/db";
import { DashboardCalendar } from "@/features/dashboard/components/DashboardCalendar";
import Link from "next/link";

function extractBookName(chapterRef: string): string {
  if (!chapterRef) return "Outros";
  const match = chapterRef.match(/^(\d?\s?[A-Za-zÀ-ú]+)/);
  if (match) return match[1].trim();
  return chapterRef.split(" ")[0] || "Outros";
}

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

  const userName = session.user?.name || "usuário";
  const greetingName = getGreetingName(userName);
  const userId = (session.user as { id?: string })?.id;

  const recentCompleted = sessions.find(s => s.status === "COMPLETED");
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

      {/* ─── Two Column: Hero + Insights ─── */}
      <div className="dashboard-two-col">
        {/* Left: Hero Panel */}
        <div>
          {activePlan && (
            <div className="hero-panel" style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg style={{ width: 20, height: 20, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Leitura: {activePlan.bookName}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {activePlan.chaptersPerDay} cap/dia · {endDateFormatted}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                      <span>Progresso ({planDaysCompleted}/{planTotalDays} dias)</span>
                      <span>{planProgress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${planProgress}%`, backgroundColor: "var(--accent)" }} />
                    </div>
                  </div>

                  {upcomingPlan && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      Próximo: {upcomingPlan.bookName}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  {zoomLink && (
                    <a href={zoomLink} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ textDecoration: "none", justifyContent: "center" }}>
                      <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      Entrar no Zoom
                    </a>
                  )}
                  <Link href="/books" className="btn-outline" style={{ textDecoration: "none", justifyContent: "center" }}>
                    Ver Plano
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* No reading plan fallback with Zoom */}
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

          {/* Recent Devotional */}
          {recentCompleted && (
            <div>
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
        </div>

        {/* Right: Insights Panel */}
        <div>
          <div className="section-title">Insights da IA</div>
          <div className="insights-panel">
            <div className="insight-card">
              <div className="insight-card-icon">
                <svg style={{ width: 18, height: 18, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                  Sequência Atual
                  <svg style={{ width: 14, height: 14, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  Dias consecutivos participando dos devocionais
                </p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-card-icon">
                <svg style={{ width: 18, height: 18, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                  Frequência do Mês
                  <svg style={{ width: 14, height: 14, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  {attendedCount} presenças registradas este mês
                </p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-card-icon">
                <svg style={{ width: 18, height: 18, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.704 6.023 6.023 0 01-2.77-.704" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                  Marco Atingido
                  <svg style={{ width: 14, height: 14, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  {totalCompleted} devocionais concluídos na plataforma
                </p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-card-icon">
                <svg style={{ width: 18, height: 18, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 4 }}>
                  Progresso no Livro
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>—</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  {activePlan ? `Lendo ${activePlan.bookName} – ${planProgress}% concluído` : "Nenhum plano ativo"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
