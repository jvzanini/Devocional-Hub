/**
 * CRON endpoint — verificar novas transcrições a cada 10 min (6h-9h30 BRT)
 * Chamado por um CRON externo (Portainer/Docker) ou pelo próprio app
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLatestTranscript } from "@/lib/zoom";
import { runPipeline } from "@/lib/pipeline";
import { PipelineStatus } from "@prisma/client";

export async function GET(request: Request) {
  // Verificar token de segurança (opcional, protege o endpoint)
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const expectedToken = process.env.CRON_SECRET || "devocional-cron-2024";
  if (token !== expectedToken) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const meetingId = process.env.ZOOM_RECURRING_MEETING_ID;
  if (!meetingId) {
    return NextResponse.json({ error: "ZOOM_RECURRING_MEETING_ID não configurado" }, { status: 400 });
  }

  // Verificar horário (6h-9h30 BRT = UTC-3)
  const now = new Date();
  const brt = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hour = brt.getHours();
  const minute = brt.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  if (timeInMinutes < 360 || timeInMinutes > 570) { // 6:00 = 360, 9:30 = 570
    return NextResponse.json({
      skipped: true,
      reason: `Fora do horário (${hour}:${String(minute).padStart(2, "0")} BRT). CRON ativo entre 6h00 e 9h30.`,
    });
  }

  try {
    // Verificar se já existe uma sessão concluída para hoje
    const today = new Date(brt.toDateString());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingToday = await prisma.session.findFirst({
      where: {
        date: { gte: today, lt: tomorrow },
        status: { in: [PipelineStatus.COMPLETED, PipelineStatus.RUNNING] },
      },
    });

    if (existingToday) {
      return NextResponse.json({
        skipped: true,
        reason: `Já existe sessão para hoje (${existingToday.id}, status: ${existingToday.status})`,
      });
    }

    // Verificar se há nova transcrição disponível
    console.log("[CRON] Verificando novas transcrições...");
    const transcript = await getLatestTranscript(meetingId).catch(() => null);

    if (!transcript) {
      return NextResponse.json({
        skipped: true,
        reason: "Nenhuma transcrição nova encontrada",
      });
    }

    // Verificar se esta transcrição já foi processada
    const transcriptDate = new Date(transcript.startTime);
    const alreadyProcessed = await prisma.session.findFirst({
      where: {
        zoomRecordingId: transcript.meetingUuid,
        status: { not: PipelineStatus.ERROR },
      },
    });

    if (alreadyProcessed) {
      return NextResponse.json({
        skipped: true,
        reason: `Transcrição de ${transcript.startTime} já processada (sessão ${alreadyProcessed.id})`,
      });
    }

    // Nova transcrição encontrada! Disparar pipeline
    console.log(`[CRON] Nova transcrição encontrada: "${transcript.topic}" (${transcript.startTime}). Disparando pipeline...`);

    const sessionId = await runPipeline({
      meetingId,
      skipNotebookLM: false,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      transcript: {
        topic: transcript.topic,
        date: transcript.startTime,
        source: transcript.source,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CRON] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
