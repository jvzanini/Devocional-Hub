import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { checkPermission } from "@/features/permissions/lib/permission-guard";
import type { UserRoleType } from "@/features/permissions/lib/role-hierarchy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const userRole = ((session.user as { role?: string }).role || "MEMBER") as UserRoleType;

  const devSession = await prisma.session.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { createdAt: "asc" },
      },
      participants: {
        include: {
          entries: {
            orderBy: { joinTime: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!devSession) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  // Filtrar documentos baseado em permissões
  const filteredDocs = [];
  for (const doc of devSession.documents) {
    // Filtrar transcrições — não exibir para o usuário
    if (doc.type === "TRANSCRIPT_RAW" || doc.type === "TRANSCRIPT_CLEAN") continue;

    // Verificar permissão para vídeo
    if (doc.type === "AUDIO_OVERVIEW") {
      const canView = await checkPermission("document:video", userRole);
      if (!canView) continue;
    }

    // Verificar permissão para slides
    if (doc.type === "SLIDES") {
      const canView = await checkPermission("document:slides", userRole);
      if (!canView) continue;
    }

    // Verificar permissão para mapa mental (infográfico)
    if (doc.type === "INFOGRAPHIC") {
      const canView = await checkPermission("document:mind_map", userRole);
      if (!canView) continue;
    }

    // Verificar permissão para texto bíblico
    if (doc.type === "BIBLE_TEXT") {
      const canView = await checkPermission("document:bible_text", userRole);
      if (!canView) continue;
    }

    filteredDocs.push(doc);
  }

  // Montar resposta com dados completos
  const response = {
    ...devSession,
    documents: filteredDocs,
    participants: devSession.participants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      totalDuration: p.totalDuration || p.duration,
      entries: p.entries.map(e => ({
        id: e.id,
        joinTime: e.joinTime,
        leaveTime: e.leaveTime,
        duration: e.duration,
      })),
    })),
  };

  return NextResponse.json(response);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Apenas admin pode deletar sessões
  const userRole = ((session.user as { role?: string }).role || "MEMBER") as string;
  if (!["ADMIN", "SUPER_ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.session.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
