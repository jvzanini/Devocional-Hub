import { auth } from "@/features/auth/lib/auth";
import { redirect } from "next/navigation";
import { checkPermission } from "@/features/permissions/lib/permission-guard";
import type { UserRoleType } from "@/features/permissions/lib/role-hierarchy";
import { PlanningPage } from "@/features/planning/components/PlanningPage";

export default async function Planning() {
  const session = await auth();
  if (!session) redirect("/login");

  const userRole = (session.user as { role?: string })?.role as UserRoleType || "MEMBER";
  const allowed = await checkPermission("menu:planning", userRole);

  if (!allowed) {
    redirect("/");
  }

  return <PlanningPage />;
}
