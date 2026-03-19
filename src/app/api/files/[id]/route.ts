import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadFile } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  webm: "audio/webm",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  // AUDIO_OVERVIEW é restrito a ADMIN
  if (document.type === "AUDIO_OVERVIEW") {
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
    }
  }

  const buffer = await downloadFile(document.storagePath);
  const ext = document.fileName.split(".").pop()?.toLowerCase() || "txt";
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${document.fileName}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
