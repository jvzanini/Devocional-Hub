/**
 * Pipeline principal — orquestra todo o fluxo de processamento
 * Zoom → IA → Biblia → NotebookLM → Storage → DB
 */

import { prisma } from "@/lib/db";
import { getLatestRecording, downloadTranscript, getMeetingParticipants } from "@/lib/zoom";
import { processTranscript } from "@/lib/ai";
import { getChaptersText } from "@/lib/bible";
import { runNotebookLMAutomation } from "@/lib/notebooklm";
import { uploadText, uploadFile, ensureBucket, getFileSize } from "@/lib/storage";
import { DocType, PipelineStatus } from "@prisma/client";
import fs from "fs";

export interface PipelineOptions {
  meetingId?: string;
  skipNotebookLM?: boolean;
  sessionId?: string; // Se fornecido, usa sessao ja criada
}

export async function runPipeline(options: PipelineOptions = {}): Promise<string> {
  const meetingId = options.meetingId || process.env.ZOOM_RECURRING_MEETING_ID;

  if (!meetingId) {
    throw new Error("ZOOM_RECURRING_MEETING_ID nao configurado");
  }

  await ensureBucket();

  // 1. Usar sessao existente ou criar nova
  let sessionId: string;

  if (options.sessionId) {
    sessionId = options.sessionId;
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: PipelineStatus.RUNNING },
    });
  } else {
    const session = await prisma.session.create({
      data: {
        date: new Date(),
        zoomMeetingId: meetingId,
        zoomRecordingId: "",
        status: PipelineStatus.RUNNING,
      },
    });
    sessionId = session.id;
  }

  try {
    log(sessionId, "Buscando ultima gravacao do Zoom...");

    // 2. Buscar gravacao do Zoom
    const recording = await getLatestRecording(meetingId);
    if (!recording) {
      throw new Error("Nenhuma gravacao encontrada para esta reuniao");
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { zoomRecordingId: recording.id, date: new Date(recording.start_time) },
    });

    // 3. Baixar transcricao
    log(sessionId, "Baixando transcricao...");
    const rawTranscript = await downloadTranscript(recording);

    // 4. Salvar transcricao bruta
    const rawPath = `sessions/${sessionId}/transcript-raw.txt`;
    await uploadText(rawPath, rawTranscript);
    await prisma.document.create({
      data: {
        sessionId,
        type: DocType.TRANSCRIPT_RAW,
        fileName: "transcript-raw.txt",
        storagePath: rawPath,
        fileSize: Buffer.byteLength(rawTranscript, "utf-8"),
      },
    });

    // 5. Buscar participantes
    log(sessionId, "Buscando participantes...");
    const participants = await getMeetingParticipants(recording.uuid);

    // 6. Processar transcricao com Gemini AI
    log(sessionId, "Processando transcricao com Gemini AI...");
    const processed = await processTranscript(rawTranscript);

    // 7. Salvar transcricao limpa
    const cleanPath = `sessions/${sessionId}/transcript-clean.txt`;
    await uploadText(cleanPath, processed.cleanText);
    await prisma.document.create({
      data: {
        sessionId,
        type: DocType.TRANSCRIPT_CLEAN,
        fileName: "transcript-clean.txt",
        storagePath: cleanPath,
        fileSize: Buffer.byteLength(processed.cleanText, "utf-8"),
      },
    });

    // 8. Buscar texto biblico
    log(sessionId, `Buscando texto biblico: ${processed.chapterRefString}...`);
    let bibleText = "";

    if (processed.chapterRefs.length > 0) {
      try {
        bibleText = await getChaptersText(processed.chapterRefs);
        const biblePath = `sessions/${sessionId}/bible-text.txt`;
        await uploadText(biblePath, bibleText);
        await prisma.document.create({
          data: {
            sessionId,
            type: DocType.BIBLE_TEXT,
            fileName: "bible-text.txt",
            storagePath: biblePath,
            fileSize: Buffer.byteLength(bibleText, "utf-8"),
          },
        });
      } catch (err) {
        log(sessionId, `Aviso: falha ao buscar texto biblico: ${err}`);
      }
    }

    // 9. Atualizar sessao com dados processados
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        chapterRef: processed.chapterRefString,
        summary: processed.summary,
        participants,
      },
    });

    // 10. Automacao NotebookLM
    if (!options.skipNotebookLM) {
      log(sessionId, "Iniciando automacao do NotebookLM...");

      try {
        const { slidesPath, infographicPath } = await runNotebookLMAutomation(
          sessionId,
          processed.cleanText,
          bibleText,
          processed.chapterRefString
        );

        if (slidesPath && fs.existsSync(slidesPath)) {
          const slidesStoragePath = `sessions/${sessionId}/slides.pdf`;
          await uploadFile(slidesStoragePath, slidesPath);
          await prisma.document.create({
            data: {
              sessionId,
              type: DocType.SLIDES,
              fileName: "slides.pdf",
              storagePath: slidesStoragePath,
              fileSize: getFileSize(slidesStoragePath),
            },
          });
          fs.unlinkSync(slidesPath);
        }

        if (infographicPath && fs.existsSync(infographicPath)) {
          const infographicStoragePath = `sessions/${sessionId}/infographic.pdf`;
          await uploadFile(infographicStoragePath, infographicPath);
          await prisma.document.create({
            data: {
              sessionId,
              type: DocType.INFOGRAPHIC,
              fileName: "infographic.pdf",
              storagePath: infographicStoragePath,
              fileSize: getFileSize(infographicStoragePath),
            },
          });
          fs.unlinkSync(infographicPath);
        }
      } catch (err) {
        log(sessionId, `Aviso: falha no NotebookLM (pipeline continua): ${err}`);
      }
    }

    // 11. Marcar sessao como concluida
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: PipelineStatus.COMPLETED },
    });

    log(sessionId, "Pipeline concluido com sucesso!");
    return sessionId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Pipeline ${sessionId}] ERRO:`, error);

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: PipelineStatus.ERROR,
        errorMessage,
      },
    });

    throw error;
  }
}

function log(sessionId: string, message: string): void {
  console.log(`[Pipeline ${sessionId}] ${message}`);
}
