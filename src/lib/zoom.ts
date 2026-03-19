/**
 * Zoom API v2 client — Server-to-Server OAuth
 * Busca TRANSCRIÇÕES e SUMMARIES (não gravações) via Zoom AI Companion
 */

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomRecording {
  id: string;
  uuid: string;
  topic: string;
  start_time: string;
  duration: number;
  recording_files: ZoomRecordingFile[];
}

interface ZoomRecordingFile {
  id: string;
  file_type: string;
  file_extension: string;
  download_url: string;
  recording_type: string;
  status: string;
}

interface ZoomParticipant {
  id: string;
  name: string;
  user_email: string;
  join_time: string;
  leave_time: string;
  duration: number;
}

interface ZoomMeetingSummary {
  meeting_id: string;
  meeting_uuid: string;
  meeting_topic: string;
  meeting_start_time: string;
  summary_content: string;
  next_steps?: string[];
  edited_summary?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error("Credenciais Zoom não configuradas");
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  if (!response.ok) throw new Error(`Falha ao obter token Zoom: ${await response.text()}`);
  const data: ZoomTokenResponse = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

async function zoomFetch(path: string): Promise<{ ok: boolean; data: unknown; status: number }> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, data, status: response.status };
}

// ─── TRANSCRIÇÕES (Meeting Summary via Zoom AI Companion) ────────────────

/**
 * Busca o resumo/transcrição gerado pelo Zoom AI Companion
 * Endpoint: GET /meetings/{meetingId}/meeting_summary
 * Escopo necessário: meeting:read
 */
export async function getMeetingSummary(meetingId: string): Promise<ZoomMeetingSummary | null> {
  console.log(`[Zoom] Buscando meeting summary para ${meetingId}...`);

  // Estratégia 1: Meeting Summary direto pelo ID
  const result = await zoomFetch(`/meetings/${meetingId}/meeting_summary`);
  if (result.ok && result.data) {
    console.log("[Zoom] Meeting summary encontrado!");
    return result.data as ZoomMeetingSummary;
  }
  console.log(`[Zoom] /meetings/${meetingId}/meeting_summary: ${result.status} - ${JSON.stringify(result.data)}`);

  // Estratégia 2: Listar summaries recentes do usuário
  const listResult = await zoomFetch(`/users/me/meeting_summaries?from=${getDateStr(-30)}&to=${getDateStr(0)}&page_size=30`);
  if (listResult.ok) {
    const summaries = (listResult.data as { summaries?: ZoomMeetingSummary[] })?.summaries || [];
    console.log(`[Zoom] ${summaries.length} summaries encontrados via /users/me/meeting_summaries`);

    const match = summaries.find(s => String(s.meeting_id) === String(meetingId));
    if (match) return match;

    // Se não encontrou pelo ID, retorna o mais recente
    if (summaries.length > 0) {
      console.log(`[Zoom] IDs disponíveis: ${summaries.map(s => s.meeting_id).join(", ")}`);
      return summaries[0]; // Mais recente
    }
  } else {
    console.log(`[Zoom] /users/me/meeting_summaries: ${listResult.status} - ${JSON.stringify(listResult.data)}`);
  }

  return null;
}

// ─── GRAVAÇÕES (fallback - cloud recordings com VTT transcript) ──────────

/**
 * Busca gravações em nuvem (fallback se meeting summary não existir)
 */
export async function getMeetingRecordings(meetingId: string): Promise<ZoomRecording[]> {
  const fromStr = getDateStr(-60);
  const toStr = getDateStr(0);

  // Estratégia 1: /users/me/recordings
  console.log(`[Zoom] Buscando gravações via /users/me/recordings (${fromStr} a ${toStr})...`);
  const userResult = await zoomFetch(`/users/me/recordings?from=${fromStr}&to=${toStr}&page_size=100`);

  if (userResult.ok) {
    const meetings = (userResult.data as { meetings?: ZoomRecording[] })?.meetings || [];
    console.log(`[Zoom] ${meetings.length} gravações encontradas`);

    const filtered = meetings.filter((m) => String(m.id) === String(meetingId));
    if (filtered.length > 0) return filtered;

    if (meetings.length > 0) {
      console.log(`[Zoom] IDs disponíveis: ${meetings.map(m => m.id).join(", ")}`);
      return meetings;
    }
  }

  // Estratégia 2: /meetings/{id}/recordings
  const meetingResult = await zoomFetch(`/meetings/${meetingId}/recordings`);
  if (meetingResult.ok) {
    const data = meetingResult.data as { meetings?: ZoomRecording[]; recording_files?: ZoomRecordingFile[]; id?: string | number; uuid?: string; topic?: string; start_time?: string; duration?: number };
    if (data.meetings?.length) return data.meetings;
    if (data.recording_files?.length) {
      return [{ id: String(data.id || meetingId), uuid: data.uuid || "", topic: data.topic || "", start_time: data.start_time || new Date().toISOString(), duration: data.duration || 0, recording_files: data.recording_files }];
    }
  }

  return [];
}

/**
 * Busca a melhor fonte de transcrição disponível:
 * 1. Meeting Summary (Zoom AI Companion) — preferido
 * 2. Cloud Recording VTT Transcript — fallback
 */
export async function getLatestTranscript(meetingId: string): Promise<{
  text: string;
  source: "summary" | "recording_vtt";
  meetingUuid: string;
  startTime: string;
  topic: string;
} | null> {
  // Tentar Meeting Summary primeiro
  const summary = await getMeetingSummary(meetingId);
  if (summary?.summary_content) {
    let text = summary.summary_content;
    if (summary.next_steps?.length) {
      text += "\n\nPróximos passos:\n" + summary.next_steps.map(s => `- ${s}`).join("\n");
    }
    return {
      text,
      source: "summary",
      meetingUuid: summary.meeting_uuid || "",
      startTime: summary.meeting_start_time || new Date().toISOString(),
      topic: summary.meeting_topic || "",
    };
  }

  // Fallback: Cloud Recording VTT
  const recordings = await getMeetingRecordings(meetingId);
  if (!recordings.length) {
    throw new Error(
      `Nenhuma transcrição ou gravação encontrada para a reunião ${meetingId}. ` +
      "Verifique se: (1) O Zoom AI Companion está ativado para gerar transcrições, " +
      "(2) A gravação em nuvem está ativada com 'Audio Transcript', " +
      "(3) Houve alguma reunião nos últimos 60 dias. " +
      "Escopos necessários no app: meeting:read, recording:read"
    );
  }

  const sorted = recordings.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  const withVtt = sorted.find(r => r.recording_files?.some(f => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT"));
  const recording = withVtt || sorted[0];

  const vttFile = recording.recording_files.find(f => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT");
  if (!vttFile) {
    const types = recording.recording_files.map(f => f.file_type).join(", ");
    throw new Error(`Transcrição VTT não encontrada. Tipos disponíveis: ${types}. Ative 'Audio transcript' no Zoom.`);
  }

  const token = await getAccessToken();
  const response = await fetch(`${vttFile.download_url}?access_token=${token}`);
  if (!response.ok) throw new Error(`Falha ao baixar VTT: ${response.status}`);

  const vtt = await response.text();
  return {
    text: parseVttToText(vtt),
    source: "recording_vtt",
    meetingUuid: recording.uuid,
    startTime: recording.start_time,
    topic: recording.topic,
  };
}

function parseVttToText(vtt: string): string {
  const lines = vtt.split("\n");
  const textLines: string[] = [];
  let speaker = "";

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("WEBVTT") || t === "" || /^\d{2}:\d{2}:\d{2}/.test(t)) continue;
    const m = t.match(/^([^:]+):\s*(.*)/);
    if (m) { speaker = m[1].trim(); if (m[2].trim()) textLines.push(`[${speaker}]: ${m[2].trim()}`); }
    else if (t && !/^\d+$/.test(t)) textLines.push(speaker ? `[${speaker}]: ${t}` : t);
  }
  return textLines.join("\n");
}

// ─── PARTICIPANTES ────────────────────────────────────────────────────────

export async function getMeetingParticipants(meetingUuid: string): Promise<string[]> {
  if (!meetingUuid) return [];
  try {
    const encoded = encodeURIComponent(encodeURIComponent(meetingUuid));
    const result = await zoomFetch(`/past_meetings/${encoded}/participants?page_size=100`);
    if (!result.ok) return [];
    return ((result.data as { participants?: ZoomParticipant[] })?.participants || [])
      .map((p) => p.name || p.user_email)
      .filter(Boolean);
  } catch { return []; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// Manter exports antigos para compatibilidade
export async function getLatestRecording(meetingId: string): Promise<ZoomRecording | null> {
  const recordings = await getMeetingRecordings(meetingId);
  return recordings.length ? recordings.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0] : null;
}

export async function downloadTranscript(recording: ZoomRecording): Promise<string> {
  const vttFile = recording.recording_files.find(f => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT");
  if (!vttFile) throw new Error("VTT não encontrado");
  const token = await getAccessToken();
  const res = await fetch(`${vttFile.download_url}?access_token=${token}`);
  if (!res.ok) throw new Error(`Download falhou: ${res.status}`);
  return parseVttToText(await res.text());
}
