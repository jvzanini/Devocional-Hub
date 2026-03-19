/**
 * Webhook endpoint — recebe eventos do Zoom (meeting.ended)
 * URL: POST /api/webhook/{slug}
 * O slug é configurado pelo admin no painel
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/shared/lib/db";
import { runPipeline } from "@/features/pipeline/lib/pipeline";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Verificar se o webhook existe e está ativo
  const webhook = await prisma.webhook.findUnique({ where: { slug } });
  if (!webhook || !webhook.active) {
    return NextResponse.json({ error: "Webhook não encontrado" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Zoom envia um challenge de validação na configuração do webhook
  // Docs: https://developers.zoom.us/docs/api/rest/webhook-reference/#validate-your-webhook-endpoint
  if (body.event === "endpoint.url_validation") {
    const plainToken = (body.payload as { plainToken?: string })?.plainToken || "";
    const secret = process.env.ZOOM_WEBHOOK_SECRET || webhook.secret || "";

    const encryptedToken = crypto
      .createHmac("sha256", secret)
      .update(plainToken)
      .digest("hex");

    return NextResponse.json({ plainToken, encryptedToken });
  }

  // Processar meeting.ended
  if (body.event === "meeting.ended") {
    const payload = body.payload as {
      object?: {
        id?: number | string;
        uuid?: string;
        topic?: string;
        start_time?: string;
        duration?: number;
      };
    };

    const meetingId = String(payload?.object?.id || "");
    const meetingUuid = payload?.object?.uuid || "";
    const topic = payload?.object?.topic || "";

    if (!meetingId || !meetingUuid) {
      return NextResponse.json({ error: "meeting_id ou uuid ausente no payload" }, { status: 400 });
    }

    console.log(`[Webhook] meeting.ended recebido: ID=${meetingId}, UUID=${meetingUuid}, Topic="${topic}"`);

    // Verificar se já processamos este UUID
    const existing = await prisma.session.findFirst({
      where: { zoomUuid: meetingUuid },
    });

    if (existing) {
      console.log(`[Webhook] UUID ${meetingUuid} já processado (sessão ${existing.id}). Ignorando.`);
      return NextResponse.json({ skipped: true, reason: "UUID já processado", sessionId: existing.id });
    }

    // Agendar pipeline com delay de 5 minutos (VTT precisa de tempo para ficar pronto)
    const DELAY_MS = 5 * 60 * 1000; // 5 minutos
    console.log(`[Webhook] Agendando pipeline para daqui ${DELAY_MS / 1000}s...`);

    // Criar sessão imediatamente para tracking
    const session = await prisma.session.create({
      data: {
        date: new Date(payload?.object?.start_time || new Date()),
        zoomMeetingId: meetingId,
        zoomRecordingId: "",
        zoomUuid: meetingUuid,
        status: "PENDING",
      },
    });

    // Disparar pipeline após delay
    setTimeout(async () => {
      try {
        console.log(`[Webhook] Delay concluído. Iniciando pipeline para UUID=${meetingUuid}...`);
        await runPipeline({
          meetingId,
          meetingUuid,
          sessionId: session.id,
          skipNotebookLM: false,
        });
      } catch (err) {
        console.error(`[Webhook] Erro no pipeline:`, err);
      }
    }, DELAY_MS);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      message: `Pipeline agendado para ${DELAY_MS / 1000}s`,
    });
  }

  // Evento não tratado
  console.log(`[Webhook] Evento não tratado: ${body.event}`);
  return NextResponse.json({ received: true, event: body.event });
}
