import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    orderBy: { date: "desc" },
    include: {
      documents: {
        select: { id: true, type: true, fileName: true, fileSize: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(sessions);
}
