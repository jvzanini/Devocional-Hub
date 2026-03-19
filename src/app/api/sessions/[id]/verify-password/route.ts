import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { password } = body;

  if (!password || typeof password !== "string") {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const s = await prisma.session.findUnique({
    where: { id },
    select: { contentPassword: true },
  });

  if (!s) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  if (!s.contentPassword) {
    // Sem senha configurada — acesso livre
    return NextResponse.json({ valid: true });
  }

  const valid = password.trim().toLowerCase() === s.contentPassword.trim().toLowerCase();
  return NextResponse.json({ valid });
}
