/**
 * Pipeline principal — orquestra todo o fluxo de processamento
 * Webhook Zoom → VTT → Gemini AI → Bíblia NVI → NotebookLM → Storage → DB
 */

import { prisma } from "@/shared/lib/db";
import { getVttTranscript, getVttByMeetingId, getDetailedParticipants, getMeetingSummary, getMeetingInstances } from "@/features/zoom/lib/zoom";
import { processTranscript, generateTheologicalResearch, buildNotebookKnowledgeBase, extractSessionPassword, callAI } from "@/features/pipeline/lib/ai";
import { triageTranscription } from "@/features/pipeline/lib/transcription-triage";
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

// ─── Detecção de Multi-Sessão ──────────────────────────────────────────

interface MultiSessionResult {
  isMultiSession: boolean;
  existingSessionId?: string;
  isPartial: boolean; // Se a transcrição atual indica continuação futura
}

const CONTINUITY_PATTERNS = [
  /continua(?:mos|remos)?\s+(?:amanhã|na\s+próxima)/i,
  /não\s+termina(?:mos|ram)/i,
  /próxima\s+sessão/i,
  /parte\s+\d/i,
  /vamos\s+continuar/i,
  /ficou\s+para\s+(?:amanhã|próxima)/i,
];

/**
 * Detecta se um capítulo está sendo discutido em múltiplas sessões.
 * Verifica se já existe sessão para o mesmo chapterRef e analisa
 * sinais de continuidade na transcrição.
 */
async function detectMultiSession(
  chapterRef: string,
  transcript: string
): Promise<MultiSessionResult> {
  if (!chapterRef || chapterRef === "Não identificado") {
    return { isMultiSession: false, isPartial: false };
  }

  // 1. Verificar se já existe sessão COMPLETA para este capítulo
  const existing = await prisma.session.findFirst({
    where: { chapterRef, status: PipelineStatus.COMPLETED },
    orderBy: { date: "desc" },
  });

  // 2. Analisar transcrição para sinais de continuidade
  const hasPartialSignal = CONTINUITY_PATTERNS.some(p => p.test(transcript));

  return {
    isMultiSession: !!existing,
    existingSessionId: existing?.id,
    isPartial: hasPartialSignal,
  };
}

/**
 * Faz merge da transcrição atual com a sessão existente do mesmo capítulo.
 * Reaproveita texto bíblico e teológico já gerados (economiza tokens IA).
 */
async function mergeWithExistingSession(
  existingSessionId: string,
  newSessionId: string,
  newTranscript: string,
  chapterRef: string,
  isPartial: boolean
): Promise<void> {
  const existingSession = await prisma.session.findUnique({
    where: { id: existingSessionId },
    include: { documents: true },
  });
  if (!existingSession) return;

  // Buscar transcrição anterior
  const prevTranscriptDoc = existingSession.documents.find(
    d => d.type === DocType.TRANSCRIPT_CLEAN
  );
  let mergedTranscript = newTranscript;
  if (prevTranscriptDoc) {
    try {
      const { downloadFile } = await import("@/shared/lib/storage");
      const prevBuffer = await downloadFile(prevTranscriptDoc.storagePath);
      const prevText = prevBuffer.toString("utf-8");
      mergedTranscript = `--- PARTE ANTERIOR ---\n${prevText}\n\n--- CONTINUAÇÃO ---\n${newTranscript}`;
    } catch {
      console.warn("[MultiSession] Não foi possível recuperar transcrição anterior");
    }
  }

  // Contar quantas partes já existem
  const relatedIds = existingSession.relatedSessionIds || [];
  const partNumber = relatedIds.length + 2; // +2 porque a original é parte 1

  // Atualizar sessão existente com referência à nova
  await prisma.session.update({
    where: { id: existingSessionId },
    data: {
      relatedSessionIds: [...relatedIds, newSessionId],
      summary: isPartial
        ? `${existingSession.summary}\n\n[Parte ${partNumber} adicionada — capítulo em andamento]`
        : `${existingSession.summary}\n\n[Capítulo completo — ${partNumber} sessões]`,
    },
  });

  // Marcar nova sessão como relacionada
  await prisma.session.update({
    where: { id: newSessionId },
    data: {
      relatedSessionIds: [existingSessionId],
    },
  });

  // Salvar transcrição mesclada
  const mergedPath = `sessions/${existingSessionId}/transcript-merged.txt`;
  await uploadText(mergedPath, mergedTranscript);

  console.log(`[MultiSession] Merge: sessão ${newSessionId} → ${existingSessionId} (Parte ${partNumber})`);
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

    // 4. Buscar participantes detalhados + deduplicar por email
    log(sessionId, "Buscando participantes detalhados...");
    const rawParticipants = await getDetailedParticipants(meetingUuid);

    if (rawParticipants.length > 0) {
      // Deduplicar: agrupar por email (ou nome se sem email)
      const byKey = new Map<string, typeof rawParticipants>();
      for (const p of rawParticipants) {
        const key = p.email?.toLowerCase() || `name:${p.name.toLowerCase()}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(p);
      }

      for (const [, entries] of byKey) {
        // Manter o nome mais completo
        const bestName = entries.reduce((a, b) =>
          a.name.length >= b.name.length ? a : b
        ).name;
        const email = entries[0].email || null;

        // Calcular duração total (soma de todas as entradas)
        const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);

        // Usar joinTime/leaveTime da primeira e última entrada
        const sortedEntries = [...entries].sort(
          (a, b) => new Date(a.joinTime).getTime() - new Date(b.joinTime).getTime()
        );
        const firstJoin = new Date(sortedEntries[0].joinTime);
        const lastLeave = new Date(sortedEntries[sortedEntries.length - 1].leaveTime);

        // Criar participante deduplicado
        const participant = await prisma.participant.create({
          data: {
            sessionId,
            name: bestName,
            email,
            joinTime: firstJoin,
            leaveTime: lastLeave,
            duration: totalDuration,
            totalDuration,
          },
        });

        // Criar ParticipantEntry para cada entrada/saída individual
        for (const entry of entries) {
          await prisma.participantEntry.create({
            data: {
              participantId: participant.id,
              joinTime: new Date(entry.joinTime),
              leaveTime: new Date(entry.leaveTime),
              duration: entry.duration,
            },
          });
        }
      }

      log(sessionId, `${rawParticipants.length} registros → ${byKey.size} participantes únicos (deduplicados por email)`);
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

    // 8.6. Triagem inteligente da transcrição
    let triagedSynthesis = "";
    if ((process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY) && bibleText) {
      log(sessionId, "Triando transcrição (validação teológica)...");
      try {
        triagedSynthesis = await triageTranscription(
          processed.cleanText,
          bibleText,
          theologicalResearch
        );
        log(sessionId, `Transcrição triada: ${triagedSynthesis.length} chars`);
      } catch (err) {
        log(sessionId, `Aviso: falha na triagem, usando transcrição original: ${err}`);
      }
    }

    // 8.7. Construir Knowledge Base unificada para NotebookLM
    let knowledgeBase = "";
    if (theologicalResearch || bibleText) {
      knowledgeBase = buildNotebookKnowledgeBase(
        processed.cleanText,
        bibleText,
        theologicalResearch,
        processed.chapterRefString,
        triagedSynthesis || undefined
      );
      log(sessionId, `KB unificada construída: ${knowledgeBase.length} chars`);
    }

    // 8.8. Gerar AI_SUMMARY (resumo IA baseado nas 3 seções)
    if ((process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY) && (bibleText || theologicalResearch || triagedSynthesis)) {
      log(sessionId, "Gerando resumo IA (AI_SUMMARY)...");
      try {
        const summaryPrompt = `Você é um teólogo pastoral. Gere um RESUMO COMPLETO do devocional sobre ${processed.chapterRefString} baseado nas 3 fontes abaixo.

O resumo deve:
- Ter 4-6 parágrafos densos e informativos
- Cobrir os pontos principais discutidos no devocional
- Incluir referências bíblicas relevantes
- Destacar aplicações práticas mencionadas
- Ser compreensível sem ter assistido ao devocional
- Estar em português brasileiro

TEXTO BÍBLICO:
${bibleText.substring(0, 3000)}

PESQUISA TEOLÓGICA:
${theologicalResearch.substring(0, 3000)}

SÍNTESE DO DEVOCIONAL:
${(triagedSynthesis || processed.cleanText).substring(0, 5000)}

Responda APENAS com o texto do resumo (sem JSON, sem cabeçalhos).`;

        const aiSummaryText = await callAI(summaryPrompt, 2000);
        if (aiSummaryText && aiSummaryText.trim().length > 100) {
          const summaryPath = `sessions/${sessionId}/ai-summary.txt`;
          await uploadText(summaryPath, aiSummaryText);
          await prisma.document.create({
            data: { sessionId, type: DocType.AI_SUMMARY, fileName: "ai-summary.txt", storagePath: summaryPath, fileSize: Buffer.byteLength(aiSummaryText, "utf-8") },
          });
          log(sessionId, `AI_SUMMARY gerado: ${aiSummaryText.length} chars`);
        }
      } catch (err) {
        log(sessionId, `Aviso: falha ao gerar AI_SUMMARY: ${err}`);
      }
    }

    // 8.9. Extrair senha da transcrição
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

    // 9.5. Detectar multi-sessão (mesmo capítulo discutido em múltiplas sessões)
    log(sessionId, "Verificando multi-sessão...");
    try {
      const multiSession = await detectMultiSession(
        processed.chapterRefString,
        processed.cleanText
      );
      if (multiSession.isMultiSession && multiSession.existingSessionId) {
        log(sessionId, `Multi-sessão detectada! Sessão anterior: ${multiSession.existingSessionId}`);
        await mergeWithExistingSession(
          multiSession.existingSessionId,
          sessionId,
          processed.cleanText,
          processed.chapterRefString,
          multiSession.isPartial
        );
      } else if (multiSession.isPartial) {
        log(sessionId, "Sinal de continuidade detectado — marcando como sessão parcial");
      }
    } catch (err) {
      log(sessionId, `Aviso: falha na detecção multi-sessão: ${err}`);
    }

    // 10. NotebookLM (opcional)
    if (!options.skipNotebookLM) {
      log(sessionId, "Iniciando automação do NotebookLM...");

      // Determinar sufixo de nomenclatura para arquivos (Parte N ou Cap Completo)
      const chapterLabel = processed.chapterRefString || "Devocional";
      let fileSuffix = "";
      try {
        const multiCheck = await detectMultiSession(processed.chapterRefString, processed.cleanText);
        if (multiCheck.isMultiSession && multiCheck.existingSessionId) {
          const existing = await prisma.session.findUnique({ where: { id: multiCheck.existingSessionId } });
          const partNum = (existing?.relatedSessionIds?.length || 0) + 2;
          fileSuffix = multiCheck.isPartial ? ` - Parte ${partNum}` : " - Cap Completo";
        } else if (multiCheck.isPartial) {
          fileSuffix = " - Parte 1";
        }
      } catch { /* fallback: sem sufixo */ }

      try {
        const nlmResult = await runNotebookLMAutomation(
          sessionId,
          processed.cleanText,
          bibleText,
          processed.chapterRefString,
          knowledgeBase || undefined
        );
        if (nlmResult.slidesPath && fs.existsSync(nlmResult.slidesPath)) {
          const slidesName = `${chapterLabel}${fileSuffix} - Slides.pdf`;
          const sp = `sessions/${sessionId}/${slidesName}`;
          await uploadFile(sp, nlmResult.slidesPath);
          await prisma.document.create({ data: { sessionId, type: DocType.SLIDES, fileName: slidesName, storagePath: sp, fileSize: getFileSize(sp) } });
          fs.unlinkSync(nlmResult.slidesPath);
        }
        if (nlmResult.infographicPath && fs.existsSync(nlmResult.infographicPath)) {
          const mapName = `${chapterLabel}${fileSuffix} - Mapa Mental.pdf`;
          const ip = `sessions/${sessionId}/${mapName}`;
          await uploadFile(ip, nlmResult.infographicPath);
          await prisma.document.create({ data: { sessionId, type: DocType.INFOGRAPHIC, fileName: mapName, storagePath: ip, fileSize: getFileSize(ip) } });
          fs.unlinkSync(nlmResult.infographicPath);
        }
        if (nlmResult.audioOverviewPath && fs.existsSync(nlmResult.audioOverviewPath)) {
          const ext = nlmResult.audioOverviewPath.split(".").pop() || "wav";
          const videoName = `${chapterLabel}${fileSuffix} - Video Resumo.${ext}`;
          const ap = `sessions/${sessionId}/${videoName}`;
          await uploadFile(ap, nlmResult.audioOverviewPath);
          await prisma.document.create({ data: { sessionId, type: DocType.AUDIO_OVERVIEW, fileName: videoName, storagePath: ap, fileSize: getFileSize(ap) } });
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
