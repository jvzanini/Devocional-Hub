import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const devSession = await prisma.session.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!devSession) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  return NextResponse.json(devSession);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.session.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
