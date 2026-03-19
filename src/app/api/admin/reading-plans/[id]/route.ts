import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";

async function isAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  return user?.role === "ADMIN";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await params;

  const plan = await prisma.readingPlan.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" } } },
  });

  if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;

  const plan = await prisma.readingPlan.update({
    where: { id },
    data,
    include: { days: { orderBy: { date: "asc" } } },
  });

  return NextResponse.json(plan);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await params;

  await prisma.readingPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
