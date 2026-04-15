import { prisma } from "@/shared/lib/db";

export async function getEngagementEnabled(): Promise<boolean> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: "engagementEnabled" } });
    if (!row) return true; // default: habilitado (linha ausente)
    return row.value !== "false";
  } catch {
    return true; // fail-safe
  }
}
