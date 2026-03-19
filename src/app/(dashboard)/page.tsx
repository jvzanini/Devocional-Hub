import { auth } from "@/features/auth/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/db";
import { DashboardCalendar } from "@/features/dashboard/components/DashboardCalendar";
import { BibleBooksGrid } from "@/features/bible/components/BibleBooksGrid";
import { AddToCalendarButton } from "@/features/sessions/components/AddToCalendarButton";
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
  const first = parts[0];
  if (first.length >= 6 || parts.length === 1) return first;
  return `${first} ${parts[1] || ""}`.trim();
}

function getGreeting(): string {
  const now = new Date();
  const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const h = brTime.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function buildScheduleString(settingsMap: Record<string, string>): string {
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const keys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const timeGroups: Record<string, string[]> = {};
  for (let i = 0; i < keys.length; i++) {
    const time = settingsMap[`schedule_${keys[i]}`];
    if (time) {
      if (!timeGroups[time]) timeGroups[time] = [];
      timeGroups[time].push(dayNames[i]);
    }
  }
  if (Object.keys(timeGroups).length === 0) return "Horário não definido";
  return Object.entries(timeGroups)
    .map(([time, days]) => `${days.join(", ")} ${time}`)
    .join(" | ");
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

  // Bible book groups
  const bookMap = new Map<string, { id: string; chapterRef: string; date: string; summary: string; status: string }[]>();
  for (const s of sessions) {
    if (s.status !== "COMPLETED" && s.status !== "RUNNING") continue;
    const bookName = extractBookName(s.chapterRef);
    if (!bookMap.has(bookName)) bookMap.set(bookName, []);
    bookMap.get(bookName)!.push({
      id: s.id, chapterRef: s.chapterRef || "Sem referência",
      date: s.date.toISOString(), summary: s.summary, status: s.status,
    });
  }
  const books = Array.from(bookMap.entries()).map(([name, sessions]) => ({ name, sessions }));

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

  const scheduleDisplay = buildScheduleString(settingsMap);

  // Reading plan progress
  let planProgress = 0;
  let planDaysCompleted = 0;
  let planTotalDays = 0;
  let daysRemaining = 0;
  if (activePlan) {
    planTotalDays = activePlan.days.length;
    planDaysCompleted = activePlan.days.filter(d => d.completed).length;
    planProgress = planTotalDays > 0 ? Math.round((planDaysCompleted / planTotalDays) * 100) : 0;
    const today = new Date();
    const endDate = new Date(activePlan.endDate);
    daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
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

  return (
    <>
      {/* ─── Welcome ─── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 4 }}>
          {getGreeting()}, {greetingName}
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-muted)" }}>
          Aqui está o resumo do seu devocional.
        </p>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="stats-row">
        <div className="stat-card">
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Devocionais
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>
            {totalCompleted}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            concluídos
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Frequência
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>
            {attendancePercentage}%
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {attendedCount} presença{attendedCount !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Plano Ativo
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)", lineHeight: 1.1 }}>
            {activePlan ? `${planProgress}%` : "—"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {activePlan ? activePlan.bookName : "Nenhum plano"}
          </div>
        </div>
      </div>

      {/* ─── Reading Plan Hero ─── */}
      {activePlan && (
        <div className="hero-panel">
          <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(251,191,36,0.08)" }} />
          <div style={{ position: "absolute", bottom: -20, right: 60, width: 70, height: 70, borderRadius: "50%", background: "rgba(251,191,36,0.05)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: "rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg style={{ width: 22, height: 22, color: "#fbbf24" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>Leitura: {activePlan.bookName}</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
                      {activePlan.chaptersPerDay} cap/dia · {new Date(activePlan.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} → {new Date(activePlan.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                    <span>{planDaysCompleted}/{planTotalDays} dias</span>
                    <span>{planProgress}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, backgroundColor: "#fbbf24", width: `${planProgress}%`, transition: "width 0.3s" }} />
                  </div>
                </div>

                {daysRemaining <= 3 && daysRemaining > 0 && upcomingPlan && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                    Próximo: {upcomingPlan.bookName} (em {daysRemaining} dia{daysRemaining !== 1 ? "s" : ""})
                  </div>
                )}

                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Devocional Diário</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{scheduleDisplay}</div>
              </div>

              {/* Stats mini */}
              <div className="stats-mini">
                <div style={{ textAlign: "center", padding: "10px 16px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>{attendedCount}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Presenças</div>
                </div>
                <div style={{ textAlign: "center", padding: "10px 16px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>{attendancePercentage}%</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Frequência</div>
                </div>
              </div>
            </div>

            {zoomLink && (
              <div className="zoom-actions">
                <a href={zoomLink} target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 22px", borderRadius: 8, backgroundColor: "#fbbf24",
                  color: "#451a03", fontSize: 15, fontWeight: 700, textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(251,191,36,0.3)",
                }}>
                  <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  Entrar no Zoom
                </a>
                <AddToCalendarButton zoomMeetingId={zoomMeetingId} zoomLink={zoomLink} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── No reading plan fallback with Zoom ─── */}
      {!activePlan && zoomLink && (
        <div style={{ marginBottom: 24 }}>
          <div className="zoom-actions">
            <a href={zoomLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: "none" }}>
              <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Entrar no Zoom
            </a>
            <AddToCalendarButton zoomMeetingId={zoomMeetingId} zoomLink={zoomLink} />
          </div>
        </div>
      )}

      {/* ─── Recent Devotional ─── */}
      {recentCompleted && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-title">Devocional mais recente</div>
          <Link href={`/session/${recentCompleted.id}`} style={{ textDecoration: "none", display: "block" }}>
            <div className="card card-hover" style={{ padding: 22, borderLeft: "4px solid var(--accent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "linear-gradient(135deg, #fbbf24, #d97706)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg style={{ width: 20, height: 20, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>
                      {recentCompleted.chapterRef || "Devocional"}
                    </h3>
                    <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                      {new Date(recentCompleted.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </span>
                  </div>
                </div>
                <span className="badge badge-success">Concluído</span>
              </div>

              {recentCompleted.summary && (
                <p style={{
                  fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7,
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: 14,
                }}>
                  {recentCompleted.summary}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 14, borderTop: "1px solid var(--border-light)", flexWrap: "wrap" }}>
                {recentCompleted.documents.length > 0 && (
                  <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                    <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    {recentCompleted.documents.length} arquivo{recentCompleted.documents.length !== 1 ? "s" : ""}
                  </span>
                )}
                {recentCompleted.participants.length > 0 && (
                  <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                    <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {recentCompleted.participants.length} participante{recentCompleted.participants.length !== 1 ? "s" : ""}
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

      {/* ─── Calendar (full width) ─── */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title">Calendário</div>
        <DashboardCalendar
          datesWithDevotional={datesWithDevotional}
          dateToSessionId={dateToSessionId}
          planDays={planDays}
        />
      </div>

      {/* ─── Bible Books ─── */}
      <div style={{ marginBottom: 28 }}>
        <div className="section-title">Livros da Bíblia</div>
        <BibleBooksGrid books={books} />
      </div>
    </>
  );
}
