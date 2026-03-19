import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { DashboardCalendar } from "@/components/DashboardCalendar";
import { BibleBooksGrid } from "@/components/BibleBooksGrid";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import Link from "next/link";

function extractBookName(chapterRef: string): string {
  if (!chapterRef) return "Outros";
  const match = chapterRef.match(/^(\d?\s?[A-Za-zÀ-ú]+)/);
  if (match) return match[1].trim();
  return chapterRef.split(" ")[0] || "Outros";
}

/** Saudação inteligente: primeiro nome >= 6 chars → só primeiro; < 6 → primeiro + segundo */
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
  const userRole = (session.user as { role?: string })?.role || "MEMBER";
  const isAdmin = userRole === "ADMIN";
  const userId = (session.user as { id?: string })?.id;

  // Fetch user photo
  const userRecord = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { photoUrl: true } }) : null;
  const userPhotoUrl = userRecord?.photoUrl || null;

  const recentCompleted = sessions.find(s => s.status === "COMPLETED");

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

  // Bible book groups — only COMPLETED and RUNNING
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

  // Upcoming plan (for preview when ≤ 3 days remaining)
  const upcomingPlan = await prisma.readingPlan.findFirst({
    where: { status: "UPCOMING" },
    orderBy: { startDate: "asc" },
    select: { bookName: true, bookCode: true, startDate: true },
  });

  // User attendance
  let attendancePercentage = 0;
  let attendedCount = 0;
  const totalCompleted = sessions.filter(s => s.status === "COMPLETED").length;
  if (userId) {
    attendedCount = await prisma.attendance.count({ where: { userId } });
    attendancePercentage = totalCompleted > 0 ? Math.round((attendedCount / totalCompleted) * 100) : 0;
  }

  // Schedule display
  const scheduleDisplay = buildScheduleString(settingsMap);

  // Progress bar for active plan
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

  // Reading plan data for calendar — include all active/in-progress plans
  const planDays: Record<string, { chapters: string; bookAbbr: string; completed: boolean }> = {};
  const allActivePlans = await prisma.readingPlan.findMany({
    where: { status: { in: ["IN_PROGRESS", "UPCOMING"] } },
    include: { days: { orderBy: { date: "asc" } } },
  });
  const { BIBLE_BOOKS } = await import("@/lib/bible-books");
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
    <div className="page-bg">
      <header className="app-header">
        <div className="header-content">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="logo-icon-sm" style={{ width: 40, height: 40, borderRadius: 10 }}>
              <svg className="icon-header" style={{ color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#1c1917", letterSpacing: "-0.01em" }}>Devocional Hub</div>
              <div style={{ fontSize: 15, color: "#78716c" }}>{getGreeting()}, {greetingName}</div>
            </div>
          </div>
          <div className="header-actions">
            {isAdmin && (
              <a href="/admin" className="btn-icon" style={{ textDecoration: "none" }} aria-label="Admin">
                <svg className="icon-header" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a7.723 7.723 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </a>
            )}
            <a href="/profile" className="btn-icon" style={{ textDecoration: "none" }} aria-label="Perfil">
              {userPhotoUrl ? (
                <img
                  src={`/api/profile/photo/${userId}`}
                  alt="Foto"
                  className="profile-avatar-header"
                />
              ) : (
                <span style={{ fontSize: 16, fontWeight: 700, color: "#d97706" }}>
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
            </a>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button type="submit" className="btn-icon" aria-label="Sair">
                <svg className="icon-header" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="page-container">

        {/* ─── Top Panel: Livro Atual + Zoom ─── */}
        <div className="hero-panel">
          <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(251,191,36,0.08)" }} />
          <div style={{ position: "absolute", bottom: -20, right: 60, width: 70, height: 70, borderRadius: "50%", background: "rgba(251,191,36,0.05)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                {activePlan && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg style={{ width: 20, height: 20, color: "#fbbf24" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>Leitura: {activePlan.bookName}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                        {activePlan.chaptersPerDay} cap/dia · {new Date(activePlan.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} → {new Date(activePlan.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                {activePlan && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                      <span>{planDaysCompleted}/{planTotalDays} dias</span>
                      <span>{planProgress}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, backgroundColor: "#fbbf24", width: `${planProgress}%`, transition: "width 0.3s" }} />
                    </div>
                  </div>
                )}

                {/* Preview do próximo livro */}
                {daysRemaining <= 3 && daysRemaining > 0 && upcomingPlan && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
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
                <div style={{ textAlign: "center", padding: "8px 14px", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{attendedCount}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Presenças</div>
                </div>
                <div style={{ textAlign: "center", padding: "8px 14px", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{attendancePercentage}%</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Frequência</div>
                </div>
              </div>
            </div>

            {zoomLink && (
              <div className="zoom-actions">
                <a href={zoomLink} target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 10, backgroundColor: "#fbbf24",
                  color: "#451a03", fontSize: 14, fontWeight: 700, textDecoration: "none",
                  boxShadow: "0 4px 12px rgba(251,191,36,0.35)",
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

        {/* ─── Devocional Recente ─── */}
        {recentCompleted && (
          <div style={{ marginBottom: 28 }}>
            <div className="section-title">Devocional mais recente</div>
            <Link href={`/session/${recentCompleted.id}`} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                backgroundColor: "#ffffff", borderRadius: 16, border: "2px solid #fde68a",
                padding: 20, boxShadow: "0 4px 16px rgba(217,119,6,0.06)", cursor: "pointer",
                transition: "border-color 0.2s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #fbbf24, #d97706)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg style={{ width: 18, height: 18, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1c1917" }}>
                        {recentCompleted.chapterRef || "Devocional"}
                      </h3>
                      <span style={{ fontSize: 13, color: "#78716c" }}>
                        {new Date(recentCompleted.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-success">Concluído</span>
                </div>

                {recentCompleted.summary && (
                  <p style={{
                    fontSize: 15, color: "#57534e", lineHeight: 1.7,
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: 12,
                  }}>
                    {recentCompleted.summary}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 12, borderTop: "1px solid #f5f5f4" }}>
                  {recentCompleted.documents.length > 0 && (
                    <span style={{ fontSize: 12, color: "#78716c", display: "flex", alignItems: "center", gap: 4 }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      {recentCompleted.documents.length} arquivo{recentCompleted.documents.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {recentCompleted.participants.length > 0 && (
                    <span style={{ fontSize: 12, color: "#78716c", display: "flex", alignItems: "center", gap: 4 }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      {recentCompleted.participants.length}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 13, color: "#d97706", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
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

        {/* ─── Calendário + Livros ─── */}
        <div className="dashboard-grid">
          <div>
            <div className="section-title">Calendário</div>
            <DashboardCalendar datesWithDevotional={datesWithDevotional} dateToSessionId={dateToSessionId} planDays={planDays} />
          </div>

          <div>
            <div className="section-title">Livros da Bíblia</div>
            <BibleBooksGrid books={books} />
          </div>
        </div>
      </main>
    </div>
  );
}
