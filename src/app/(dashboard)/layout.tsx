import { auth, signOut } from "@/features/auth/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/db";
import { Sidebar } from "@/shared/components/Sidebar";
import dynamic from "next/dynamic";

const BibleBubble = dynamic(
  () => import("@/features/bible-reader/components/BibleBubble").then(m => m.BibleBubble),
  { ssr: false }
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string })?.id || "";
  const userRole = (session.user as { role?: string })?.role || "MEMBER";
  const userName = session.user?.name || "Usuário";
  const userEmail = session.user?.email || "";

  const userRecord = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { photoUrl: true },
      })
    : null;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="app-shell">
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        userPhotoUrl={userRecord?.photoUrl}
        userRole={userRole}
        userId={userId}
        signOutAction={handleSignOut}
      />
      <main className="app-main">
        <div className="app-main-inner">
          {children}
        </div>
      </main>
      <BibleBubble />
    </div>
  );
}
