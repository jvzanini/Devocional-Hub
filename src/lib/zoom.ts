/**
 * Zoom API v2 client — Server-to-Server OAuth
 * Docs: https://developers.zoom.us/docs/api/
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

interface ZoomUserRecordingsResponse {
  from: string;
  to: string;
  meetings: ZoomRecording[];
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;

  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error("Credenciais Zoom n\u00e3o configuradas no .env");
  }

  const credentials = Buffer.from(
    `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`
  ).toString("base64");

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
    throw new Error(`Falha ao obter token Zoom: ${error}`);
  }

  const data: ZoomTokenResponse = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

async function zoomFetch(path: string): Promise<unknown> {
  const token = await getAccessToken();
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zoom API erro ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Busca grava\u00e7\u00f5es do usu\u00e1rio nos \u00faltimos 30 dias e filtra pela reuni\u00e3o recorrente.
 * O endpoint /users/me/recordings \u00e9 mais confi\u00e1vel que /meetings/{id}/recordings
 * para reuni\u00f5es recorrentes.
 */
export async function getMeetingRecordings(meetingId: string): Promise<ZoomRecording[]> {
  // Buscar grava\u00e7\u00f5es dos \u00faltimos 30 dias
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  try {
    const data = await zoomFetch(
      `/users/me/recordings?from=${fromStr}&to=${toStr}&page_size=100`
    ) as ZoomUserRecordingsResponse;

    if (!data.meetings || data.meetings.length === 0) {
      return [];
    }

    // Filtra pela reuni\u00e3o espec\u00edfica (meeting ID num\u00e9rico)
    const filtered = data.meetings.filter((m) => {
      const mId = String(m.id);
      const targetId = String(meetingId);
      return mId === targetId;
    });

    return filtered;
  } catch (err) {
    console.error("Erro ao buscar grava\u00e7\u00f5es via /users/me/recordings:", err);

    // Fallback: tentar endpoint direto (pode funcionar para algumas contas)
    try {
      const data = await zoomFetch(`/meetings/${meetingId}/recordings`) as {
        meetings?: ZoomRecording[];
        recording_files?: ZoomRecordingFile[];
        id?: string;
        uuid?: string;
        topic?: string;
        start_time?: string;
        duration?: number;
      };

      // A resposta pode ser um array de meetings ou uma \u00fanica grava\u00e7\u00e3o
      if (data.meetings) {
        return data.meetings;
      }

      // Se retornou dados da grava\u00e7\u00e3o diretamente
      if (data.recording_files) {
        return [{
          id: String(data.id || meetingId),
          uuid: data.uuid || "",
          topic: data.topic || "",
          start_time: data.start_time || new Date().toISOString(),
          duration: data.duration || 0,
          recording_files: data.recording_files,
        }];
      }

      return [];
    } catch {
      return [];
    }
  }
}

/**
 * Pega a \u00faltima grava\u00e7\u00e3o (mais recente) de uma reuni\u00e3o recorrente
 */
export async function getLatestRecording(meetingId: string): Promise<ZoomRecording | null> {
  const recordings = await getMeetingRecordings(meetingId);

  if (!recordings.length) {
    throw new Error(
      `Nenhuma grava\u00e7\u00e3o encontrada para a reuni\u00e3o ${meetingId} nos \u00faltimos 30 dias. ` +
      "Verifique se a grava\u00e7\u00e3o em nuvem est\u00e1 ativada no Zoom e se houve alguma reuni\u00e3o gravada recentemente."
    );
  }

  // Ordena por data mais recente
  const sorted = recordings.sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  // Verifica se tem transcri\u00e7\u00e3o
  const withTranscript = sorted.find((r) =>
    r.recording_files?.some(
      (f) => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT"
    )
  );

  if (withTranscript) {
    return withTranscript;
  }

  // Se nenhuma tem transcri\u00e7\u00e3o, retorna a mais recente com aviso
  console.warn(
    `[Zoom] Nenhuma grava\u00e7\u00e3o com transcri\u00e7\u00e3o encontrada. ` +
    `Usando a mais recente (${sorted[0].start_time}). ` +
    `Tipos de arquivo dispon\u00edveis: ${sorted[0].recording_files?.map(f => f.file_type).join(", ")}`
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
    const availableTypes = recording.recording_files.map(f => `${f.file_type}/${f.file_extension}`).join(", ");
    throw new Error(
      `Transcri\u00e7\u00e3o n\u00e3o encontrada nesta grava\u00e7\u00e3o. ` +
      `Arquivos dispon\u00edveis: ${availableTypes}. ` +
      "Ative a transcri\u00e7\u00e3o autom\u00e1tica nas configura\u00e7\u00f5es do Zoom."
    );
  }

  const token = await getAccessToken();
  const response = await fetch(
    `${transcriptFile.download_url}?access_token=${token}`
  );

  if (!response.ok) {
    throw new Error(`Falha ao baixar transcri\u00e7\u00e3o: ${response.status} ${response.statusText}`);
  }

  const vttContent = await response.text();
  return parseVttToText(vttContent);
}

/**
 * Converte VTT para texto plano (remove timestamps, cue points, identificadores)
 */
function parseVttToText(vtt: string): string {
  const lines = vtt.split("\n");
  const textLines: string[] = [];
  let currentSpeaker = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Pular cabe\u00e7alho WEBVTT
    if (trimmed.startsWith("WEBVTT") || trimmed === "") continue;

    // Pular timestamps (ex: 00:00:01.000 --> 00:00:03.000)
    if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) continue;

    // Detectar speaker (ex: "Jo\u00e3o Silva: ")
    const speakerMatch = trimmed.match(/^([^:]+):\s*(.*)/);
    if (speakerMatch) {
      currentSpeaker = speakerMatch[1].trim();
      const text = speakerMatch[2].trim();
      if (text) {
        textLines.push(`[${currentSpeaker}]: ${text}`);
      }
    } else if (trimmed && !/^\d+$/.test(trimmed)) {
      // Continua\u00e7\u00e3o de fala
      if (currentSpeaker) {
        textLines.push(`[${currentSpeaker}]: ${trimmed}`);
      } else {
        textLines.push(trimmed);
      }
    }
  }

  return textLines.join("\n");
}

/**
 * Lista participantes de uma inst\u00e2ncia de reuni\u00e3o
 */
export async function getMeetingParticipants(meetingUuid: string): Promise<string[]> {
  try {
    // UUID com / precisa ser duplamente encoded
    const encodedUuid = encodeURIComponent(encodeURIComponent(meetingUuid));
    const data = await zoomFetch(
      `/past_meetings/${encodedUuid}/participants?page_size=100`
    ) as { participants?: ZoomParticipant[] };

    return (data.participants || [])
      .map((p) => p.name || p.user_email)
      .filter(Boolean);
  } catch {
    // Participantes n\u00e3o dispon\u00edveis para todas as contas Zoom
    return [];
  }
}
