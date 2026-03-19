import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const dir = path.join(process.cwd(), "storage", "photos");

  // Procurar arquivo com qualquer extensão
  const extensions = ["jpg", "jpeg", "png", "webp", "gif"];
  for (const ext of extensions) {
    const filepath = path.join(dir, `${userId}.${ext}`);
    if (existsSync(filepath)) {
      const buffer = await readFile(filepath);
      const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
      return new NextResponse(buffer, {
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" },
      });
    }
  }

  return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
}
