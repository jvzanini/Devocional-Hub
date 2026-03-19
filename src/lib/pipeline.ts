/**
 * Pipeline principal — orquestra todo o fluxo de processamento
 * Webhook Zoom → VTT → Gemini AI → Bíblia NVI → NotebookLM → Storage → DB
 */

import { prisma } from "@/lib/db";
import { getVttTranscript, getVttByMeetingId, getDetailedParticipants } from "@/lib/zoom";
import { processTranscript } from "@/lib/ai";
import { getChaptersText } from "@/lib/bible";
import { runNotebookLMAutomation } from "@/lib/notebooklm";
import { uploadText, uploadFile, ensureBucket, getFileSize } from "@/lib/storage";
import { DocType, PipelineStatus } from "@prisma/client";
import { syncAttendanceForSession } from "@/lib/attendance-sync";
import { syncReadingPlanWithTranscription } from "@/lib/reading-plan-sync";
import fs from "fs";

export interface PipelineOptions {
  meetingId?: string;
  meetingUuid?: string; // UUID da sessão específica (via webhook)
  skipNotebookLM?: boolean;
  sessionId?: string;
}

export async function runPipeline(options: PipelineOptions = {}): Promise<string> {
  const meetingId = options.meetingId || process.env.ZOOM_RECURRING_MEETING_ID;
  if (!meetingId) throw new Error("ZOOM_RECURRING_MEETING_ID não configurado");

  await ensureBucket();

  // 1. Criar ou usar sessão existente
  let sessionId: string;
  if (options.sessionId) {
    sessionId = options.sessionId;
    await prisma.session.update({ where: { id: sessionId }, data: { status: PipelineStatus.RUNNING } });
  } else {
    const session = await prisma.session.create({
      data: { date: new Date(), zoomMeetingId: meetingId, zoomRecordingId: "", zoomUuid: options.meetingUuid || "", status: PipelineStatus.RUNNING },
    });
    sessionId = session.id;
  }

  try {
    // 2. Buscar VTT transcript
    let rawTranscript: string;
    let meetingUuid = options.meetingUuid || "";

    if (meetingUuid) {
      // Temos UUID (via webhook) — buscar VTT direto
      log(sessionId, `Buscando VTT por UUID: ${meetingUuid}...`);
      rawTranscript = await getVttTranscript(meetingUuid);
    } else {
      // Sem UUID — buscar por Meeting ID
      log(sessionId, `Buscando VTT por Meeting ID: ${meetingId}...`);
      const result = await getVttByMeetingId(meetingId);
      rawTranscript = result.text;
      meetingUuid = result.uuid;

      await prisma.session.update({
        where: { id: sessionId },
        data: { zoomUuid: meetingUuid, date: new Date(result.startTime) },
      });
    }

    // 3. Salvar transcrição bruta
    const rawPath = `sessions/${sessionId}/transcript-raw.txt`;
    await uploadText(rawPath, rawTranscript);
    await prisma.document.create({
      data: { sessionId, type: DocType.TRANSCRIPT_RAW, fileName: "transcript-raw.txt", storagePath: rawPath, fileSize: Buffer.byteLength(rawTranscript, "utf-8") },
    });

    // 4. Buscar participantes detalhados
    log(sessionId, "Buscando participantes detalhados...");
    const participants = await getDetailedParticipants(meetingUuid);

    if (participants.length > 0) {
      // Salvar cada participante no banco
      for (const p of participants) {
        await prisma.participant.create({
          data: {
            sessionId,
            name: p.name,
            email: p.email || null,
            joinTime: new Date(p.joinTime),
            leaveTime: new Date(p.leaveTime),
            duration: p.duration,
          },
        });
      }
      log(sessionId, `${participants.length} participantes salvos`);
    }

    // 5. Buscar nome do orador principal (configuração do admin)
    let mainSpeaker = "";
    try {
      const setting = await prisma.appSetting.findUnique({ where: { key: "mainSpeakerName" } });
      if (setting) mainSpeaker = setting.value;
    } catch { /* tabela pode não existir ainda */ }

    // 6. Processar com Gemini AI
    log(sessionId, "Processando transcrição com Gemini AI...");
    const processed = await processTranscript(rawTranscript, mainSpeaker);

    // 7. Salvar transcrição limpa
    const cleanPath = `sessions/${sessionId}/transcript-clean.txt`;
    await uploadText(cleanPath, processed.cleanText);
    await prisma.document.create({
      data: { sessionId, type: DocType.TRANSCRIPT_CLEAN, fileName: "transcript-clean.txt", storagePath: cleanPath, fileSize: Buffer.byteLength(processed.cleanText, "utf-8") },
    });

    // 8. Buscar texto bíblico
    log(sessionId, `Buscando texto bíblico: ${processed.chapterRefString}...`);
    let bibleText = "";
    if (processed.chapterRefs.length > 0) {
      try {
        bibleText = await getChaptersText(processed.chapterRefs);
        const biblePath = `sessions/${sessionId}/bible-text.txt`;
        await uploadText(biblePath, bibleText);
        await prisma.document.create({
          data: { sessionId, type: DocType.BIBLE_TEXT, fileName: "bible-text.txt", storagePath: biblePath, fileSize: Buffer.byteLength(bibleText, "utf-8") },
        });
      } catch (err) {
        log(sessionId, `Aviso: falha ao buscar texto bíblico: ${err}`);
      }
    }

    // 9. Atualizar sessão
    await prisma.session.update({
      where: { id: sessionId },
      data: { chapterRef: processed.chapterRefString, summary: processed.summary },
    });

    // 10. NotebookLM (opcional)
    if (!options.skipNotebookLM) {
      log(sessionId, "Iniciando automação do NotebookLM...");
      try {
        const { slidesPath, infographicPath } = await runNotebookLMAutomation(sessionId, processed.cleanText, bibleText, processed.chapterRefString);
        if (slidesPath && fs.existsSync(slidesPath)) {
          const sp = `sessions/${sessionId}/slides.pdf`;
          await uploadFile(sp, slidesPath);
          await prisma.document.create({ data: { sessionId, type: DocType.SLIDES, fileName: "slides.pdf", storagePath: sp, fileSize: getFileSize(sp) } });
          fs.unlinkSync(slidesPath);
        }
        if (infographicPath && fs.existsSync(infographicPath)) {
          const ip = `sessions/${sessionId}/infographic.pdf`;
          await uploadFile(ip, infographicPath);
          await prisma.document.create({ data: { sessionId, type: DocType.INFOGRAPHIC, fileName: "infographic.pdf", storagePath: ip, fileSize: getFileSize(ip) } });
          fs.unlinkSync(infographicPath);
        }
      } catch (err) {
        log(sessionId, `Aviso: falha no NotebookLM: ${err}`);
      }
    }

    // 11. Sincronizar presenças
    log(sessionId, "Sincronizando presenças...");
    try {
      await syncAttendanceForSession(sessionId);
    } catch (err) {
      log(sessionId, `Aviso: falha no sync de presenças: ${err}`);
    }

    // 12. Auto-ajuste do plano de leitura
    log(sessionId, "Verificando ajuste do plano de leitura...");
    try {
      await syncReadingPlanWithTranscription(sessionId);
    } catch (err) {
      log(sessionId, `Aviso: falha no auto-ajuste do plano: ${err}`);
    }

    // 13. Concluir
    await prisma.session.update({ where: { id: sessionId }, data: { status: PipelineStatus.COMPLETED } });
    log(sessionId, "Pipeline concluído com sucesso!");
    return sessionId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Pipeline ${sessionId}] ERRO:`, error);
    await prisma.session.update({ where: { id: sessionId }, data: { status: PipelineStatus.ERROR, errorMessage } });
    throw error;
  }
}

function log(sessionId: string, message: string): void {
  console.log(`[Pipeline ${sessionId}] ${message}`);
}
