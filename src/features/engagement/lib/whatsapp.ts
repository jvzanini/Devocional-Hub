import type { RiskLevel } from "./admin-insights";

export function normalizeWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }
  return null;
}

const TEMPLATES: Record<RiskLevel, (firstName: string) => string> = {
  attention: (n) => `Olá ${n}! 😊 Aqui é do grupo devocional. Notei que você não pôde estar conosco nos últimos encontros. Como você está? Conta se podemos te ajudar em algo. Esperamos você no próximo!`,
  dormant: (n) => `Oi ${n}, tudo bem? 🌱 Faz um tempinho que não te vejo no devocional e queria saber como você está. Se houver algo que possamos caminhar juntos, estamos aqui. Sentimos sua falta!`,
  lost: (n) => `${n}, oi! Vi que faz um tempo desde a última vez que você participou do devocional. Espero que esteja tudo bem com você e sua família. Seria uma alegria te ver de volta — sem cobrança, só com carinho. Como posso ajudar? 🙏`,
};

export function buildWhatsAppMessage(params: { name: string; level: RiskLevel }): string {
  const firstName = params.name.trim().split(/\s+/)[0] || "amigo(a)";
  return TEMPLATES[params.level](firstName);
}

export function buildWhatsAppUrl(phoneRaw: string | null | undefined, message: string): string | null {
  const phone = normalizeWhatsApp(phoneRaw);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
