/**
 * Pipeline principal — orquestra todo o fluxo de processamento
 * Zoom Transcrição → Gemini AI → Bíblia → NotebookLM → Storage → DB
 */

import { prisma } from "@/lib/db";
import { getLatestTranscript, getMeetingParticipants } from "@/lib/zoom";
import { processTranscript } from "@/lib/ai";
import { getChaptersText } from "@/lib/bible";
import { runNotebookLMAutomation } from "@/lib/notebooklm";
import { uploadText, uploadFile, ensureBucket, getFileSize } from "@/lib/storage";
import { DocType, PipelineStatus } from "@prisma/client";
import fs from "fs";

export interface PipelineOptions {
  meetingId?: string;
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
      data: { date: new Date(), zoomMeetingId: meetingId, zoomRecordingId: "", status: PipelineStatus.RUNNING },
    });
    sessionId = session.id;
  }

  try {
    // 2. Buscar transcrição (Meeting Summary OU Cloud Recording VTT)
    log(sessionId, "Buscando transcrição do Zoom (Summary + Cloud Recording)...");
    const transcript = await getLatestTranscript(meetingId);

    if (!transcript) {
      throw new Error("Nenhuma transcrição encontrada. Verifique se o Zoom AI Companion está ativado.");
    }

    log(sessionId, `Transcrição encontrada via ${transcript.source}: "${transcript.topic}" (${transcript.startTime})`);

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        zoomRecordingId: transcript.meetingUuid,
        date: new Date(transcript.startTime),
      },
    });

    // 3. Salvar transcrição bruta
    const rawPath = `sessions/${sessionId}/transcript-raw.txt`;
    await uploadText(rawPath, transcript.text);
    await prisma.document.create({
      data: { sessionId, type: DocType.TRANSCRIPT_RAW, fileName: "transcript-raw.txt", storagePath: rawPath, fileSize: Buffer.byteLength(transcript.text, "utf-8") },
    });

    // 4. Buscar participantes
    log(sessionId, "Buscando participantes...");
    const participants = await getMeetingParticipants(transcript.meetingUuid);

    // 5. Processar com Gemini AI
    log(sessionId, "Processando transcrição com Gemini AI...");
    const processed = await processTranscript(transcript.text);

    // 6. Salvar transcrição limpa
    const cleanPath = `sessions/${sessionId}/transcript-clean.txt`;
    await uploadText(cleanPath, processed.cleanText);
    await prisma.document.create({
      data: { sessionId, type: DocType.TRANSCRIPT_CLEAN, fileName: "transcript-clean.txt", storagePath: cleanPath, fileSize: Buffer.byteLength(processed.cleanText, "utf-8") },
    });

    // 7. Buscar texto bíblico
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

    // 8. Atualizar sessão
    await prisma.session.update({
      where: { id: sessionId },
      data: { chapterRef: processed.chapterRefString, summary: processed.summary, participants },
    });

    // 9. NotebookLM (opcional)
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

    // 10. Concluir
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
