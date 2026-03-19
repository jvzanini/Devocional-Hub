/**
 * Pipeline principal — orquestra todo o fluxo de processamento
 * Webhook Zoom → VTT → Gemini AI → Bíblia NVI → NotebookLM → Storage → DB
 */

import { prisma } from "@/shared/lib/db";
import { getVttTranscript, getVttByMeetingId, getDetailedParticipants, getMeetingSummary, getMeetingInstances } from "@/features/zoom/lib/zoom";
import { processTranscript, generateTheologicalResearch, buildNotebookKnowledgeBase, extractSessionPassword } from "@/features/pipeline/lib/ai";
import { getChaptersText } from "@/features/bible/lib/bible";
import { runNotebookLMAutomation } from "@/features/pipeline/lib/notebooklm";
import { uploadText, uploadFile, ensureBucket, getFileSize } from "@/shared/lib/storage";
import { DocType, PipelineStatus } from "@prisma/client";
import { syncAttendanceForSession } from "@/features/sessions/lib/attendance-sync";
import { syncReadingPlanWithTranscription } from "@/features/pipeline/lib/reading-plan-sync";
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
    // 2. Buscar VTT transcript (ou Meeting Summary como fallback)
    let rawTranscript: string;
    let meetingUuid = options.meetingUuid || "";
    let usedMeetingSummary = false;

    if (meetingUuid) {
      // Temos UUID (via webhook) — buscar VTT direto
      log(sessionId, `Buscando VTT por UUID: ${meetingUuid}...`);
      try {
        rawTranscript = await getVttTranscript(meetingUuid);
      } catch {
        // Fallback: buscar Meeting Summary do AI Companion
        log(sessionId, `VTT não disponível, buscando Meeting Summary do AI Companion...`);
        const summary = await getMeetingSummary(meetingUuid);
        rawTranscript = `${summary.summaryContent}\n\n${summary.summaryOverview}`;
        usedMeetingSummary = true;

        await prisma.session.update({
          where: { id: sessionId },
          data: { zoomUuid: meetingUuid, date: new Date(summary.startTime) },
        });
      }
    } else {
      // Sem UUID — buscar por Meeting ID
      log(sessionId, `Buscando VTT por Meeting ID: ${meetingId}...`);
      try {
        const result = await getVttByMeetingId(meetingId);
        rawTranscript = result.text;
        meetingUuid = result.uuid;

        await prisma.session.update({
          where: { id: sessionId },
          data: { zoomUuid: meetingUuid, date: new Date(result.startTime) },
        });
      } catch {
        // Fallback: buscar instância mais recente e usar Meeting Summary
        log(sessionId, `VTT não disponível, buscando Meeting Summary do AI Companion...`);
        const instances = await getMeetingInstances(meetingId);
        const latest = instances.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];
        if (!latest) throw new Error(`Nenhuma instância encontrada para meeting ${meetingId}`);

        meetingUuid = latest.uuid;
        const summary = await getMeetingSummary(meetingUuid);
        rawTranscript = `${summary.summaryContent}\n\n${summary.summaryOverview}`;
        usedMeetingSummary = true;

        await prisma.session.update({
          where: { id: sessionId },
          data: { zoomUuid: meetingUuid, date: new Date(summary.startTime) },
        });
      }
    }

    if (usedMeetingSummary) {
      log(sessionId, `Usando Meeting Summary do AI Companion (${rawTranscript.length} chars)`);
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

    // 6. Processar com Gemini AI (ou usar Meeting Summary direto)
    let processed: Awaited<ReturnType<typeof processTranscript>>;
    if (usedMeetingSummary) {
      // Meeting Summary do AI Companion já é o resumo — usar direto
      log(sessionId, "Usando Meeting Summary como resumo (sem Gemini)...");
      const { extractChapterRefsFromText } = await import("@/features/pipeline/lib/ai");
      const refs = extractChapterRefsFromText(rawTranscript);
      const chapterRefString = refs.map(r => `${r.name} ${r.chapter}`).join(", ") || "Não identificado";
      processed = {
        cleanText: rawTranscript,
        chapterRefs: refs.map(r => ({ book: r.book, chapter: r.chapter })),
        chapterRefString,
        summary: rawTranscript.split("\n").filter(l => l.trim() && !l.startsWith("#")).slice(0, 10).join("\n"),
        specificChapters: refs.map(r => r.chapter),
      };
    } else {
      log(sessionId, "Processando transcrição com Gemini AI...");
      processed = await processTranscript(rawTranscript, mainSpeaker);
    }

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

    // 8.5. Gerar pesquisa teológica
    let theologicalResearch = "";
    if ((process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY) && bibleText) {
      log(sessionId, "Gerando pesquisa teológica com Gemini...");
      try {
        theologicalResearch = await generateTheologicalResearch(processed.chapterRefString, processed.cleanText, bibleText);
        log(sessionId, `Pesquisa teológica gerada: ${theologicalResearch.length} chars`);
      } catch (err) {
        log(sessionId, `Aviso: falha na pesquisa teológica: ${err}`);
      }
    }

    // 8.6. Construir Knowledge Base unificada para NotebookLM
    let knowledgeBase = "";
    if (theologicalResearch || bibleText) {
      knowledgeBase = buildNotebookKnowledgeBase(
        processed.cleanText,
        bibleText,
        theologicalResearch,
        processed.chapterRefString
      );
      log(sessionId, `KB unificada construída: ${knowledgeBase.length} chars`);
    }

    // 8.7. Extrair senha da transcrição
    let contentPassword: string | null = null;
    try {
      log(sessionId, "Extraindo senha da transcrição...");
      contentPassword = await extractSessionPassword(processed.cleanText);
      if (contentPassword) {
        log(sessionId, `Senha encontrada: "${contentPassword}"`);
      } else {
        log(sessionId, "Nenhuma senha encontrada na transcrição.");
      }
    } catch (err) {
      log(sessionId, `Aviso: falha ao extrair senha: ${err}`);
    }

    // 9. Atualizar sessão
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        chapterRef: processed.chapterRefString,
        summary: processed.summary,
        contentPassword,
      },
    });

    // 10. NotebookLM (opcional)
    if (!options.skipNotebookLM) {
      log(sessionId, "Iniciando automação do NotebookLM...");
      try {
        const nlmResult = await runNotebookLMAutomation(
          sessionId,
          processed.cleanText,
          bibleText,
          processed.chapterRefString,
          knowledgeBase || undefined
        );
        if (nlmResult.slidesPath && fs.existsSync(nlmResult.slidesPath)) {
          const sp = `sessions/${sessionId}/slides.pdf`;
          await uploadFile(sp, nlmResult.slidesPath);
          await prisma.document.create({ data: { sessionId, type: DocType.SLIDES, fileName: "slides.pdf", storagePath: sp, fileSize: getFileSize(sp) } });
          fs.unlinkSync(nlmResult.slidesPath);
        }
        if (nlmResult.infographicPath && fs.existsSync(nlmResult.infographicPath)) {
          const ip = `sessions/${sessionId}/infographic.pdf`;
          await uploadFile(ip, nlmResult.infographicPath);
          await prisma.document.create({ data: { sessionId, type: DocType.INFOGRAPHIC, fileName: "infographic.pdf", storagePath: ip, fileSize: getFileSize(ip) } });
          fs.unlinkSync(nlmResult.infographicPath);
        }
        if (nlmResult.audioOverviewPath && fs.existsSync(nlmResult.audioOverviewPath)) {
          const ext = nlmResult.audioOverviewPath.split(".").pop() || "wav";
          const ap = `sessions/${sessionId}/audio-overview.${ext}`;
          await uploadFile(ap, nlmResult.audioOverviewPath);
          await prisma.document.create({ data: { sessionId, type: DocType.AUDIO_OVERVIEW, fileName: `audio-overview.${ext}`, storagePath: ap, fileSize: getFileSize(ap) } });
          fs.unlinkSync(nlmResult.audioOverviewPath);
          log(sessionId, "Audio Overview (vídeo PT-BR) salvo com sucesso!");
        }
        // Log resultado detalhado do NotebookLM
        const nlmGenerated = [
          nlmResult.slidesPath ? "slides" : null,
          nlmResult.infographicPath ? "infographic" : null,
          nlmResult.audioOverviewPath ? "audio" : null,
        ].filter(Boolean);
        if (nlmGenerated.length > 0) {
          log(sessionId, `NotebookLM gerou: ${nlmGenerated.join(", ")}`);
        } else {
          log(sessionId, "NotebookLM não gerou nenhum documento.");
          // Salvar logs do NLM para diagnóstico
          if (nlmResult.logs && nlmResult.logs.length > 0) {
            const nlmLogStr = nlmResult.logs.join("\n");
            log(sessionId, `NLM logs:\n${nlmLogStr}`);
            try {
              await prisma.session.update({
                where: { id: sessionId },
                data: { errorMessage: `[NLM] ${nlmLogStr.substring(0, 4000)}` },
              });
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
        log(sessionId, `Aviso: falha no NotebookLM: ${errMsg}`);
        // Salvar erro do NLM como nota na sessão para diagnóstico
        try {
          const currentSession = await prisma.session.findUnique({ where: { id: sessionId } });
          const existingError = currentSession?.errorMessage || "";
          await prisma.session.update({
            where: { id: sessionId },
            data: { errorMessage: existingError ? `${existingError}\n[NLM] ${errMsg.substring(0, 500)}` : `[NLM] ${errMsg.substring(0, 500)}` },
          });
        } catch { /* ignore */ }
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
