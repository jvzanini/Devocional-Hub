import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function isAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  return user?.role === "ADMIN";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const settings = await prisma.appSetting.findMany();
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return NextResponse.json(map);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const body = await request.json();
  const { key, value } = body;
  if (!key) return NextResponse.json({ error: "key obrigatório" }, { status: 400 });

  await prisma.appSetting.upsert({
    where: { key },
    update: { value: value || "" },
    create: { key, value: value || "" },
  });

  return NextResponse.json({ success: true });
}
