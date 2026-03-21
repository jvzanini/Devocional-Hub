import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";

async function isAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  return user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const webhooks = await prisma.webhook.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(webhooks);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { name, slug } = await request.json();
  if (!name || !slug) return NextResponse.json({ error: "name e slug obrigatórios" }, { status: 400 });

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  const existing = await prisma.webhook.findUnique({ where: { slug: cleanSlug } });
  if (existing) return NextResponse.json({ error: "Slug já existe" }, { status: 409 });

  const webhook = await prisma.webhook.create({ data: { name, slug: cleanSlug } });
  return NextResponse.json(webhook);
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id, active } = await request.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const webhook = await prisma.webhook.update({ where: { id }, data: { active } });
  return NextResponse.json(webhook);
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  await prisma.webhook.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
