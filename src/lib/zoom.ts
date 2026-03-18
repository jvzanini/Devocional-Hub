/**
 * Zoom API v2 client \u2014 Server-to-Server OAuth
 * Busca grava\u00e7\u00f5es em nuvem (cloud) e tenta m\u00faltiplos endpoints
 * para maximizar a chance de encontrar a grava\u00e7\u00e3o.
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
    throw new Error("Credenciais Zoom n\u00e3o configuradas (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)");
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
 * Busca grava\u00e7\u00f5es usando m\u00faltiplas estrat\u00e9gias:
 * 1. /users/me/recordings (todos os recordings do usu\u00e1rio, filtrado por meeting ID)
 * 2. /meetings/{id}/recordings (endpoint direto, pode n\u00e3o funcionar para recorrentes)
 * 3. Busca sem filtro de meeting ID (pega qualquer grava\u00e7\u00e3o recente)
 */
export async function getMeetingRecordings(meetingId: string): Promise<ZoomRecording[]> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  // Estrat\u00e9gia 1: /users/me/recordings (mais confi\u00e1vel)
  console.log(`[Zoom] Buscando grava\u00e7\u00f5es via /users/me/recordings (${fromStr} a ${toStr})...`);
  const userResult = await zoomFetch(`/users/me/recordings?from=${fromStr}&to=${toStr}&page_size=100`);

  if (userResult.ok) {
    const meetings = (userResult.data as { meetings?: ZoomRecording[] }).meetings || [];
    console.log(`[Zoom] Encontradas ${meetings.length} grava\u00e7\u00f5es totais do usu\u00e1rio`);

    // Filtra pelo meeting ID
    const filtered = meetings.filter((m) => String(m.id) === String(meetingId));
    console.log(`[Zoom] ${filtered.length} grava\u00e7\u00f5es da reuni\u00e3o ${meetingId}`);

    if (filtered.length > 0) {
      return filtered;
    }

    // Se n\u00e3o encontrou com filtro, retorna todas (talvez o ID esteja diferente)
    if (meetings.length > 0) {
      console.log(`[Zoom] Meeting ID ${meetingId} n\u00e3o encontrado. IDs dispon\u00edveis: ${meetings.map(m => m.id).join(", ")}`);
      // Retorna todas para que o usu\u00e1rio veja o que est\u00e1 dispon\u00edvel
      return meetings;
    }
  } else {
    console.log(`[Zoom] /users/me/recordings falhou: ${JSON.stringify(userResult.data)}`);
  }

  // Estrat\u00e9gia 2: /meetings/{id}/recordings (endpoint direto)
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
      console.log(`[Zoom] Encontradas ${data.meetings.length} grava\u00e7\u00f5es via endpoint direto`);
      return data.meetings;
    }

    if (data.recording_files && data.recording_files.length > 0) {
      console.log(`[Zoom] Encontrada grava\u00e7\u00e3o direta com ${data.recording_files.length} arquivos`);
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

  // Estrat\u00e9gia 3: Buscar com range de data maior (60 dias)
  console.log("[Zoom] Tentando com range de 60 dias...");
  const from60 = new Date();
  from60.setDate(from60.getDate() - 60);
  const from60Str = from60.toISOString().split("T")[0];

  const widerResult = await zoomFetch(`/users/me/recordings?from=${from60Str}&to=${toStr}&page_size=100`);
  if (widerResult.ok) {
    const meetings = (widerResult.data as { meetings?: ZoomRecording[] }).meetings || [];
    if (meetings.length > 0) {
      console.log(`[Zoom] Encontradas ${meetings.length} grava\u00e7\u00f5es com range de 60 dias`);
      return meetings;
    }
  }

  return [];
}

/**
 * Pega a \u00faltima grava\u00e7\u00e3o (mais recente)
 */
export async function getLatestRecording(meetingId: string): Promise<ZoomRecording | null> {
  const recordings = await getMeetingRecordings(meetingId);

  if (!recordings.length) {
    throw new Error(
      `Nenhuma grava\u00e7\u00e3o encontrada para a reuni\u00e3o ${meetingId}. ` +
      "Verifique se: (1) A grava\u00e7\u00e3o em nuvem est\u00e1 ativada no Zoom, " +
      "(2) Houve alguma reuni\u00e3o gravada nos \u00faltimos 60 dias, " +
      "(3) As credenciais do app Zoom t\u00eam permiss\u00e3o de leitura de grava\u00e7\u00f5es. " +
      "Nota: grava\u00e7\u00f5es locais (salvas no computador) n\u00e3o s\u00e3o acess\u00edveis via API."
    );
  }

  // Ordena por data mais recente
  const sorted = recordings.sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  // Prioriza grava\u00e7\u00f5es que t\u00eam transcri\u00e7\u00e3o
  const withTranscript = sorted.find((r) =>
    r.recording_files?.some(
      (f) => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT"
    )
  );

  if (withTranscript) {
    console.log(`[Zoom] Usando grava\u00e7\u00e3o com transcri\u00e7\u00e3o: ${withTranscript.start_time}`);
    return withTranscript;
  }

  // Lista os tipos dispon\u00edveis para debug
  const types = sorted[0].recording_files?.map(f => f.file_type).join(", ") || "nenhum";
  console.warn(
    `[Zoom] Nenhuma grava\u00e7\u00e3o com transcri\u00e7\u00e3o VTT. ` +
    `Usando mais recente (${sorted[0].start_time}). ` +
    `Tipos dispon\u00edveis: ${types}. ` +
    `Ative "Audio Transcript" nas configura\u00e7\u00f5es de grava\u00e7\u00e3o do Zoom.`
  );

  return sorted[0];
}

/**
 * Baixa o arquivo de transcri\u00e7\u00e3o (VTT) e converte para texto plano
 */
export async function downloadTranscript(recording: ZoomRecording): Promise<string> {
  const transcriptFile = recording.recording_files.find(
    (f) => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT"
  );

  if (!transcriptFile) {
    const types = recording.recording_files.map(f => `${f.file_type}(${f.file_extension})`).join(", ");
    throw new Error(
      `Transcri\u00e7\u00e3o VTT n\u00e3o encontrada nesta grava\u00e7\u00e3o. ` +
      `Arquivos dispon\u00edveis: ${types || "nenhum"}. ` +
      "Para corrigir: Zoom > Settings > Recording > ative 'Audio transcript'."
    );
  }

  const token = await getAccessToken();
  const response = await fetch(`${transcriptFile.download_url}?access_token=${token}`);

  if (!response.ok) {
    throw new Error(`Falha ao baixar transcri\u00e7\u00e3o: ${response.status} ${response.statusText}`);
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
 * Lista participantes de uma inst\u00e2ncia de reuni\u00e3o
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
