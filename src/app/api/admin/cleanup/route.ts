import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";

export async function POST() {
  const roleCheck = await requireRole("SUPER_ADMIN");
  if (!roleCheck.authorized) return roleCheck.response;

  try {
    // Deletar na ordem correta (respeitar foreign keys)
    const [entriesCount, participantsCount, documentsCount, attendancesCount, sessionsCount] = await prisma.$transaction([
      prisma.participantEntry.deleteMany({}),
      prisma.participant.deleteMany({}),
      prisma.document.deleteMany({}),
      prisma.attendance.deleteMany({}),
      prisma.session.deleteMany({}),
    ]);

    const result = {
      deletados: {
        participantEntries: entriesCount.count,
        participants: participantsCount.count,
        documents: documentsCount.count,
        attendances: attendancesCount.count,
        sessions: sessionsCount.count,
      },
      preservados: ["Users", "ReadingPlans", "Permissions", "AppSettings", "Webhooks"],
    };

    console.log("[Cleanup] Limpeza realizada:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Cleanup] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao limpar banco de dados" },
      { status: 500 }
    );
  }
}
