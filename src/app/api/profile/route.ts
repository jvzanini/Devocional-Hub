import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// GET: retorna dados do perfil do usuário logado
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, church: true, team: true, subTeam: true, photoUrl: true, role: true },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json(user);
}

// PUT: atualiza nome e/ou foto
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const name = formData.get("name") as string | null;
  const photo = formData.get("photo") as File | null;

  const updateData: { name?: string; photoUrl?: string } = {};

  if (name && name.trim()) {
    updateData.name = name.trim();
  }

  if (photo && photo.size > 0) {
    // Salvar foto em /app/storage/photos/ (ou /tmp em dev)
    const ext = photo.name.split(".").pop() || "jpg";
    const filename = `${session.user.id}.${ext}`;
    const dir = path.join(process.cwd(), "storage", "photos");
    await mkdir(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    const buffer = Buffer.from(await photo.arrayBuffer());
    await writeFile(filepath, buffer);
    updateData.photoUrl = `/api/profile/photo/${session.user.id}`;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nenhum dado para atualizar" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true, church: true, team: true, subTeam: true, photoUrl: true, role: true },
  });

  return NextResponse.json(user);
}
