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

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;

  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error("Credenciais Zoom não configuradas no .env");
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
 * Lista as últimas gravações de uma reunião recorrente
 */
export async function getMeetingRecordings(meetingId: string): Promise<ZoomRecording[]> {
  const data = await zoomFetch(`/meetings/${meetingId}/recordings`) as {
    meetings?: ZoomRecording[];
  };
  return data.meetings || [];
}

/**
 * Pega a última gravação (mais recente) de uma reunião recorrente
 */
export async function getLatestRecording(meetingId: string): Promise<ZoomRecording | null> {
  const recordings = await getMeetingRecordings(meetingId);
  if (!recordings.length) return null;

  return recordings.sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )[0];
}

/**
 * Baixa o arquivo de transcrição (VTT) e converte para texto plano
 */
export async function downloadTranscript(recording: ZoomRecording): Promise<string> {
  const transcriptFile = recording.recording_files.find(
    (f) => f.file_type === "TRANSCRIPT" || f.file_extension === "VTT"
  );

  if (!transcriptFile) {
    throw new Error("Transcrição não encontrada nesta gravação");
  }

  const token = await getAccessToken();
  const response = await fetch(
    `${transcriptFile.download_url}?access_token=${token}`
  );

  if (!response.ok) {
    throw new Error(`Falha ao baixar transcrição: ${response.statusText}`);
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

    // Pular cabeçalho WEBVTT
    if (trimmed.startsWith("WEBVTT") || trimmed === "") continue;

    // Pular timestamps (ex: 00:00:01.000 --> 00:00:03.000)
    if (/^\d{2}:\d{2}:\d{2}/.test(trimmed)) continue;

    // Detectar speaker (ex: "João Silva: ")
    const speakerMatch = trimmed.match(/^([^:]+):\s*(.*)/);
    if (speakerMatch) {
      currentSpeaker = speakerMatch[1].trim();
      const text = speakerMatch[2].trim();
      if (text) {
        textLines.push(`[${currentSpeaker}]: ${text}`);
      }
    } else if (trimmed && !/^\d+$/.test(trimmed)) {
      // Continuação de fala
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
 * Lista participantes de uma instância de reunião
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
    // Participantes não disponíveis para todas as contas Zoom
    return [];
  }
}
