/**
 * Gerador de imagens para cards de planejamento
 *
 * Cascata:
 * 1. DALL-E 3 (OpenAI) — ~$0.04/imagem (1024x1024)
 * 2. Fallback: sem imagem (placeholder com ícone)
 */

const DALLE_API_URL = "https://api.openai.com/v1/images/generations";

interface GeneratedImage {
  url: string;
  isPlaceholder: boolean;
}

/**
 * Gerar imagem via DALL-E 3
 */
async function generateWithDalle(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  const response = await fetch(DALLE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`DALL-E erro ${response.status}: ${err}`);
  }

  const data = await response.json();
  const imageUrl = data?.data?.[0]?.url;

  if (!imageUrl) {
    throw new Error("DALL-E não retornou URL da imagem");
  }

  return imageUrl;
}

/**
 * Construir prompt de imagem a partir do contexto bíblico
 */
function buildImagePrompt(bookName: string, chapter: number, themes: string[]): string {
  const themeDescription = themes.length > 0
    ? `Temas: ${themes.join(", ")}.`
    : "";

  return `Ilustração artística e reverente para estudo bíblico de ${bookName} capítulo ${chapter}. ${themeDescription} Estilo: pintura digital contemporânea, cores quentes, atmosfera espiritual e contemplativa. Sem texto na imagem. Composição limpa e elegante, adequada para material de estudo cristão.`;
}

/**
 * Gerar 2 imagens para um card de planejamento
 *
 * Retorna array de URLs (DALL-E) ou array vazio (fallback sem imagem)
 */
export async function generateCardImages(
  bookName: string,
  chapter: number,
  themes: string[] = []
): Promise<string[]> {
  const prompt1 = buildImagePrompt(bookName, chapter, themes);
  const prompt2 = `Cenário bíblico inspirado em ${bookName} ${chapter}. Paisagem do antigo Israel, arquitetura histórica, natureza. Estilo: arte digital cinematográfica, iluminação dramática, tons dourados e terrosos. Sem texto, sem pessoas em destaque. Composição panorâmica para banner.`;

  const urls: string[] = [];

  // Tentar gerar 2 imagens via DALL-E
  for (const prompt of [prompt1, prompt2]) {
    try {
      console.log(`[ImageGenerator] Gerando imagem via DALL-E para ${bookName} ${chapter}...`);
      const url = await generateWithDalle(prompt);
      urls.push(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ImageGenerator] DALL-E falhou: ${msg}`);
      // Não adicionar URL — ficará sem imagem (placeholder com ícone)
    }
  }

  return urls;
}
