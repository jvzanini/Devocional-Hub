import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runPipeline } from "@/lib/pipeline";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const options = {
      meetingId: body.meetingId,
      skipNotebookLM: body.skipNotebookLM ?? false,
    };

    // Cria sessão no banco imediatamente para retornar o ID
    const { prisma } = await import("@/lib/db");
    const { PipelineStatus } = await import("@prisma/client");

    const meetingId = options.meetingId || process.env.ZOOM_RECURRING_MEETING_ID;
    if (!meetingId) {
      return NextResponse.json({ error: "ZOOM_RECURRING_MEETING_ID nao configurado" }, { status: 400 });
    }

    const dbSession = await prisma.session.create({
      data: {
        date: new Date(),
        zoomMeetingId: meetingId,
        zoomRecordingId: "",
        status: PipelineStatus.RUNNING,
      },
    });

    // Roda pipeline em background (non-blocking)
    runPipeline({ ...options, sessionId: dbSession.id }).catch((error) => {
      console.error(`[Pipeline ${dbSession.id}] Erro nao tratado:`, error);
    });

    return NextResponse.json({ sessionId: dbSession.id, success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
