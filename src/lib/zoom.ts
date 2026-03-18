/**
 * Zoom API v2 client — Server-to-Server OAuth
 * Busca gravações em nuvem (cloud) e tenta múltiplos endpoints
 * para maximizar a chance de encontrar a gravação.
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

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error("Credenciais Zoom não configuradas (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)");
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64");

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Falha ao obter token Zoom: ${response.status} - ${error}`);
  }

  const data: ZoomTokenResponse = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

async function zoomFetch(path: string): Promise<{ ok: boolean; data: unknown; status: number }> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return { ok: false, data, status: response.status };
  }

  return { ok: true, data, status: response.status };
}

async function zoomFetchOrThrow(path: string): Promise<unknown> {
  const { ok, data, status } = await zoomFetch(path);
  if (!ok) {
    throw new Error(`Zoom API erro ${status}: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Busca gravações usando múltiplas estratégias:
 * 1. /users/me/recordings (todos os recordings do usuário, filtrado por meeting ID)
 * 2. /meetings/{id}/recordings (endpoint direto, pode não funcionar para recorrentes)
 * 3. Busca sem filtro de meeting ID (pega qualquer gravação recente)
 */
export async function getMeetingRecordings(meetingId: string): Promise<ZoomRecording[]> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  // Estratégia 1: /users/me/recordings (mais confiável)
  console.log(`[Zoom] Buscando gravações via /users/me/recordings (${fromStr} a ${toStr})...`);
  const userResult = await zoomFetch(`/users/me/recordings?from=${fromStr}&to=${toStr}&page_size=100`);

  if (userResult.ok) {
    const meetings = (userResult.data as { meetings?: ZoomRecording[] }).meetings || [];
    console.log(`[Zoom] Encontradas ${meetings.length} gravações totais do usuário`);

    // Filtra pelo meeting ID
    const filtered = meetings.filter((m) => String(m.id) === String(meetingId));
    console.log(`[Zoom] ${filtered.length} gravações da reunião ${meetingId}`);

    if (filtered.length > 0) {
      return filtered;
    }

    // Se não encontrou com filtro, retorna todas (talvez o ID esteja diferente)
    if (meetings.length > 0) {
      console.log(`[Zoom] Meeting ID ${meetingId} não encontrado. IDs disponíveis: ${meetings.map(m => m.id).join(", ")}`);
      // Retorna todas para que o usuário veja o que está disponível
      return meetings;
    }
  } else {
    console.log(`[Zoom] /users/me/recordings falhou: ${JSON.stringify(userResult.data)}`);
  }

  // Estratégia 2: /meetings/{id}/recordings (endpoint direto)
  console.log(`[Zoom] Tentando /meetings/${meetingId}/recordings...`);
  const meetingResult = await zoomFetch(`/meetings/${meetingId}/recordings`);

  if (meetingResult.ok) {
    const data = meetingResult.data as {
      meetings?: ZoomRecording[];
      recording_files?: ZoomRecordingFile[];
      id?: string | number;
      uuid?: string;
      topic?: string;
      start_time?: string;
      duration?: number;
    };

    if (data.meetings && data.meetings.length > 0) {
      console.log(`[Zoom] Encontradas ${data.meetings.length} gravações via endpoint direto`);
      return data.meetings;
    }

    if (data.recording_files && data.recording_files.length > 0) {
      console.log(`[Zoom] Encontrada gravação direta com ${data.recording_files.length} arquivos`);
      return [{
        id: String(data.id || meetingId),
        uuid: data.uuid || "",
        topic: data.topic || "",
        start_time: data.start_time || new Date().toISOString(),
        duration: data.duration || 0,
        recording_files: data.recording_files,
      }];
    }
  } else {
    console.log(`[Zoom] /meetings/${meetingId}/recordings falhou: ${JSON.stringify(meetingResult.data)}`);
  }

  // Estratégia 3: Buscar com range de data maior (60 dias)
  console.log("[Zoom] Tentando com range de 60 dias...");
  const from60 = new Date();
  from60.setDate(from60.getDate() - 60);
  const from60Str = from60.toISOString().split("T")[0];

  const widerResult = await zoomFetch(`/users/me/recordings?from=${from60Str}&to=${toStr}&page_size=100`);
  if (widerResult.ok) {
    const meetings = (widerResult.data as { meetings?: ZoomRecording[] }).meetings || [];
    if (meetings.length > 0) {
      console.log(`[Zoom] Encontradas ${meetings.length} gravações com range de 60 dias`);
      return meetings;
    }
  }

  return [];
}

/**
 * Pega a última gravação (mais recente)
 */
export async function getLatestRecording(meetingId: string): Promise<ZoomRecording | null> {
  const recordings = await getMeetingRecordings(meetingId);

  if (!recordings.length) {
    throw new Error(
      `Nenhuma gravação encontrada para a reunião ${meetingId}. ` +
      "Verifique se: (1) A gravação em nuvem está ativada no Zoom, " +
      "(2) Houve alguma reunião gravada nos últimos 60 dias, " +
      "(3) As credenciais do app Zoom têm permissão de leitura de gravações. " +
      "Nota: gravações locais (salvas no computador) não são acessíveis via API."
    );
  }

  // Ordena por data mais recente
  const sorted = recordings.sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  // Prioriza gravações que têm transcrição
  const withTranscript = sorted.find((r) =>
    r.recording_files?.some(
      (f) => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT"
    )
  );

  if (withTranscript) {
    console.log(`[Zoom] Usando gravação com transcrição: ${withTranscript.start_time}`);
    return withTranscript;
  }

  // Lista os tipos disponíveis para debug
  const types = sorted[0].recording_files?.map(f => f.file_type).join(", ") || "nenhum";
  console.warn(
    `[Zoom] Nenhuma gravação com transcrição VTT. ` +
    `Usando mais recente (${sorted[0].start_time}). ` +
    `Tipos disponíveis: ${types}. ` +
    `Ative "Audio Transcript" nas configurações de gravação do Zoom.`
  );

  return sorted[0];
}

/**
 * Baixa o arquivo de transcrição (VTT) e converte para texto plano
 */
export async function downloadTranscript(recording: ZoomRecording): Promise<string> {
  const transcriptFile = recording.recording_files.find(
    (f) => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT"
  );

  if (!transcriptFile) {
    const types = recording.recording_files.map(f => `${f.file_type}(${f.file_extension})`).join(", ");
    throw new Error(
      `Transcrição VTT não encontrada nesta gravação. ` +
      `Arquivos disponíveis: ${types || "nenhum"}. ` +
      "Para corrigir: Zoom > Settings > Recording > ative 'Audio transcript'."
    );
  }

  const token = await getAccessToken();
  const response = await fetch(`${transcriptFile.download_url}?access_token=${token}`);

  if (!response.ok) {
    throw new Error(`Falha ao baixar transcrição: ${response.status} ${response.statusText}`);
  }

  const vttContent = await response.text();
  return parseVttToText(vttContent);
}

function parseVttToText(vtt: string): string {
  const lines = vtt.split("\n");
  const textLines: string[] = [];
  let currentSpeaker = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("WEBVTT") || trimmed === "") continue;
    if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) continue;

    const speakerMatch = trimmed.match(/^([^:]+):\s*(.*)/);
    if (speakerMatch) {
      currentSpeaker = speakerMatch[1].trim();
      const text = speakerMatch[2].trim();
      if (text) textLines.push(`[${currentSpeaker}]: ${text}`);
    } else if (trimmed && !/^\d+$/.test(trimmed)) {
      textLines.push(currentSpeaker ? `[${currentSpeaker}]: ${trimmed}` : trimmed);
    }
  }

  return textLines.join("\n");
}

/**
 * Lista participantes de uma instância de reunião
 */
export async function getMeetingParticipants(meetingUuid: string): Promise<string[]> {
  try {
    const encodedUuid = encodeURIComponent(encodeURIComponent(meetingUuid));
    const data = await zoomFetchOrThrow(
      `/past_meetings/${encodedUuid}/participants?page_size=100`
    ) as { participants?: ZoomParticipant[] };

    return (data.participants || [])
      .map((p) => p.name || p.user_email)
      .filter(Boolean);
  } catch {
    return [];
  }
}
