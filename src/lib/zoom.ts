/**
 * Zoom API v2 client — Server-to-Server OAuth
 * Busca VTT transcripts e participantes detalhados via UUID
 */

interface ZoomTokenResponse { access_token: string; token_type: string; expires_in: number; }

interface ZoomRecordingFile {
  id: string;
  file_type: string;
  file_extension: string;
  download_url: string;
  recording_type: string;
  status: string;
}

export interface ZoomDetailedParticipant {
  name: string;
  email: string;
  joinTime: string;
  leaveTime: string;
  duration: number; // segundos
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error("Credenciais Zoom não configuradas");
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    { method: "POST", headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (!response.ok) throw new Error(`Token Zoom falhou: ${await response.text()}`);
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

/**
 * Encode UUID para uso em URLs da API Zoom
 * UUIDs com / ou + precisam de duplo URL-encode
 */
function encodeUuid(uuid: string): string {
  if (uuid.includes("/") || uuid.includes("+")) {
    return encodeURIComponent(encodeURIComponent(uuid));
  }
  return encodeURIComponent(uuid);
}

// ─── VTT Transcript por UUID ─────────────────────────────────────────────

/**
 * Busca o arquivo VTT de transcrição de uma reunião pelo UUID
 * Endpoint: GET /meetings/{uuid}/recordings
 */
export async function getVttTranscript(meetingUuid: string): Promise<string> {
  const encoded = encodeUuid(meetingUuid);
  console.log(`[Zoom] Buscando VTT para UUID: ${meetingUuid}...`);

  const result = await zoomFetch(`/meetings/${encoded}/recordings`);

  if (!result.ok) {
    // Tentar sem encoding (para UUIDs simples)
    const result2 = await zoomFetch(`/meetings/${meetingUuid}/recordings`);
    if (!result2.ok) {
      throw new Error(`Gravações não encontradas para UUID ${meetingUuid}: ${result.status} / ${result2.status}`);
    }
    return extractVttFromRecordings(result2.data, meetingUuid);
  }

  return extractVttFromRecordings(result.data, meetingUuid);
}

async function extractVttFromRecordings(data: unknown, uuid: string): Promise<string> {
  const recordings = data as { recording_files?: ZoomRecordingFile[] };
  const files = recordings?.recording_files || [];

  if (files.length === 0) {
    throw new Error(`Nenhum arquivo de gravação encontrado para UUID ${uuid}`);
  }

  const vttFile = files.find(f => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT");
  if (!vttFile) {
    const types = files.map(f => f.file_type).join(", ");
    throw new Error(
      `Arquivo VTT não encontrado. Tipos disponíveis: ${types}. ` +
      "Ative 'Audio Transcript' nas configurações de gravação do Zoom."
    );
  }

  const token = await getAccessToken();
  const response = await fetch(`${vttFile.download_url}?access_token=${token}`);
  if (!response.ok) throw new Error(`Download VTT falhou: ${response.status}`);

  const vtt = await response.text();
  console.log(`[Zoom] VTT baixado: ${vtt.length} caracteres`);
  return parseVttToText(vtt);
}

/**
 * Busca VTT por Meeting ID (busca nas gravações do usuário)
 * Fallback quando não temos o UUID
 */
export async function getVttByMeetingId(meetingId: string): Promise<{ text: string; uuid: string; startTime: string; topic: string }> {
  const fromStr = getDateStr(-60);
  const toStr = getDateStr(0);

  // Buscar gravações do usuário
  const result = await zoomFetch(`/users/me/recordings?from=${fromStr}&to=${toStr}&page_size=100`);
  if (!result.ok) throw new Error(`Falha ao listar gravações: ${result.status}`);

  const meetings = (result.data as { meetings?: Array<{ id: string | number; uuid: string; topic: string; start_time: string; recording_files: ZoomRecordingFile[] }> })?.meetings || [];

  // Filtrar por meeting ID e que tenha VTT
  const match = meetings
    .filter(m => String(m.id) === String(meetingId))
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    .find(m => m.recording_files?.some(f => f.file_type === "TRANSCRIPT"));

  if (!match) {
    const ids = meetings.map(m => m.id).join(", ");
    throw new Error(`VTT não encontrado para meeting ${meetingId}. IDs disponíveis: ${ids}`);
  }

  const text = await extractVttFromRecordings(match, match.uuid);
  return { text, uuid: match.uuid, startTime: match.start_time, topic: match.topic };
}

// ─── Participantes Detalhados ────────────────────────────────────────────

/**
 * Busca participantes detalhados de uma reunião pelo UUID
 * Endpoint: GET /past_meetings/{uuid}/participants
 */
export async function getDetailedParticipants(meetingUuid: string): Promise<ZoomDetailedParticipant[]> {
  if (!meetingUuid) return [];

  const encoded = encodeUuid(meetingUuid);
  console.log(`[Zoom] Buscando participantes para UUID: ${meetingUuid}...`);

  const result = await zoomFetch(`/past_meetings/${encoded}/participants?page_size=100`);

  if (!result.ok) {
    console.log(`[Zoom] Participantes não disponíveis: ${result.status}`);
    return [];
  }

  const data = result.data as {
    participants?: Array<{
      name: string;
      user_email: string;
      join_time: string;
      leave_time: string;
      duration: number;
    }>;
  };

  return (data.participants || []).map(p => ({
    name: p.name || "Participante",
    email: p.user_email || "",
    joinTime: p.join_time,
    leaveTime: p.leave_time,
    duration: p.duration,
  }));
}

// ─── Meeting Instances ───────────────────────────────────────────────────

/**
 * Lista instâncias passadas de uma reunião recorrente
 * Endpoint: GET /past_meetings/{meetingId}/instances
 */
export async function getMeetingInstances(meetingId: string): Promise<Array<{ uuid: string; start_time: string }>> {
  const result = await zoomFetch(`/past_meetings/${meetingId}/instances`);
  if (!result.ok) return [];
  const data = result.data as { meetings?: Array<{ uuid: string; start_time: string }> };
  return data.meetings || [];
}

// ─── Meeting Summary (AI Companion) ─────────────────────────────────────

export interface ZoomMeetingSummary {
  meetingUuid: string;
  topic: string;
  startTime: string;
  endTime: string;
  summaryOverview: string;
  summaryContent: string;
  summaryDetails: Array<{ label: string; summary: string }>;
}

/**
 * Busca o Meeting Summary gerado pelo Zoom AI Companion
 * Útil quando não há gravação na nuvem, mas o AI Companion estava ativo
 */
export async function getMeetingSummary(meetingUuid: string): Promise<ZoomMeetingSummary> {
  const encoded = encodeUuid(meetingUuid);
  console.log(`[Zoom] Buscando Meeting Summary para UUID: ${meetingUuid}...`);

  const result = await zoomFetch(`/meetings/${encoded}/meeting_summary`);

  if (!result.ok) {
    throw new Error(`Meeting Summary não encontrado para UUID ${meetingUuid}: ${result.status}`);
  }

  const data = result.data as {
    meeting_uuid: string;
    meeting_topic: string;
    meeting_start_time: string;
    meeting_end_time: string;
    summary_overview: string;
    summary_content: string;
    summary_details: Array<{ label: string; summary: string }>;
  };

  return {
    meetingUuid: data.meeting_uuid,
    topic: data.meeting_topic,
    startTime: data.meeting_start_time,
    endTime: data.meeting_end_time,
    summaryOverview: data.summary_overview,
    summaryContent: data.summary_content || "",
    summaryDetails: data.summary_details || [],
  };
}

/**
 * Busca Meeting Summary por Meeting ID (busca a instância mais recente)
 */
export async function getMeetingSummaryByDate(meetingId: string, targetDate: string): Promise<{ summary: ZoomMeetingSummary; uuid: string }> {
  const instances = await getMeetingInstances(meetingId);

  // Filtrar pela data alvo
  const match = instances
    .filter(m => m.start_time.startsWith(targetDate))
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];

  if (!match) {
    throw new Error(`Nenhuma instância encontrada para ${meetingId} em ${targetDate}`);
  }

  const summary = await getMeetingSummary(match.uuid);
  return { summary, uuid: match.uuid };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

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

function getDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}
