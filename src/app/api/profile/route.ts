import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { syncAttendanceForUser } from "@/features/sessions/lib/attendance-sync";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, church: true, team: true, subTeam: true,
      photoUrl: true, role: true,
      zoomIdentifiers: { select: { id: true, value: true, type: true, locked: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const name = formData.get("name") as string | null;
  const photo = formData.get("photo") as File | null;
  const zoomValue = formData.get("zoomIdentifier") as string | null;
  const zoomType = (formData.get("zoomType") as string | null) || "EMAIL";

  const updateData: { name?: string; photoUrl?: string } = {};

  if (name && name.trim()) {
    updateData.name = name.trim();
  }

  if (photo && photo.size > 0) {
    // Validate MIME type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(photo.type)) {
      return NextResponse.json({ error: "Tipo de imagem inválido. Use JPEG, PNG, WebP ou GIF." }, { status: 400 });
    }

    const ext = photo.name.split(".").pop() || "jpg";
    const filename = `${session.user.id}.${ext}`;
    const dir = path.join(process.cwd(), "storage", "photos");
    await mkdir(dir, { recursive: true });

    // Clean up old photo files
    const oldExts = ["jpg", "jpeg", "png", "webp", "gif"];
    for (const oldExt of oldExts) {
      const oldPath = path.join(dir, `${session.user.id}.${oldExt}`);
      if (existsSync(oldPath)) {
        try { await unlink(oldPath); } catch { /* ignore */ }
      }
    }

    const filepath = path.join(dir, filename);
    const buffer = Buffer.from(await photo.arrayBuffer());
    await writeFile(filepath, buffer);
    updateData.photoUrl = `/api/profile/photo/${session.user.id}`;
  }

  // Handle Zoom identifier
  if (zoomValue && zoomValue.trim()) {
    const existing = await prisma.zoomIdentifier.findFirst({
      where: { userId: session.user.id },
    });

    if (!existing || !existing.locked) {
      if (existing) {
        await prisma.zoomIdentifier.update({
          where: { id: existing.id },
          data: { value: zoomValue.trim(), type: zoomType as "EMAIL" | "USERNAME" },
        });
      } else {
        await prisma.zoomIdentifier.create({
          data: {
            userId: session.user.id,
            value: zoomValue.trim(),
            type: zoomType as "EMAIL" | "USERNAME",
          },
        });
      }

      // Sync retroativo
      syncAttendanceForUser(session.user.id).catch(err =>
        console.error("[Profile] Erro no sync retroativo:", err)
      );
    }
  }

  if (Object.keys(updateData).length === 0 && !zoomValue) {
    return NextResponse.json({ error: "Nenhum dado para atualizar" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: Object.keys(updateData).length > 0 ? updateData : {},
    select: {
      id: true, name: true, email: true, church: true, team: true, subTeam: true,
      photoUrl: true, role: true,
      zoomIdentifiers: { select: { id: true, value: true, type: true, locked: true } },
    },
  });

  return NextResponse.json(user);
}
