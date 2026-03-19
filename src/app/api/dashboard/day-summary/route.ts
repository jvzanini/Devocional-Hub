import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Parâmetro 'date' é obrigatório no formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  try {
    // Busca o dia do plano de leitura correspondente à data
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(date + "T23:59:59.999Z");

    const planDay = await prisma.readingPlanDay.findFirst({
      where: {
        date: { gte: dayStart, lte: dayEnd },
      },
      include: {
        plan: true,
      },
    });

    if (!planDay) {
      return NextResponse.json(
        { error: "Nenhum plano de leitura encontrado para esta data" },
        { status: 404 }
      );
    }

    // Se já tem logNote cacheado, retorna direto
    if (planDay.logNote) {
      return NextResponse.json({ summary: planDay.logNote });
    }

    // Gera resumo via Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada" },
        { status: 500 }
      );
    }

    const prompt = `Você é um assistente devocional cristão. Gere uma breve visão geral devocional (1 a 3 parágrafos) em português brasileiro sobre os seguintes capítulos da Bíblia:

Livro: ${planDay.plan.bookName}
Capítulos: ${planDay.chapters}

A visão geral deve:
- Resumir os principais acontecimentos ou temas dos capítulos
- Destacar uma lição espiritual ou aplicação prática
- Ser encorajadora e edificante para a leitura do dia

Responda APENAS com o texto da visão geral, sem títulos, sem marcadores, sem formatação especial.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.5 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`Gemini API erro ${response.status}: ${err}`);
      return NextResponse.json(
        { error: "Erro ao gerar resumo com IA" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const summary =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!summary) {
      return NextResponse.json(
        { error: "IA não retornou conteúdo" },
        { status: 502 }
      );
    }

    // Cacheia o resultado no logNote do dia
    await prisma.readingPlanDay.update({
      where: { id: planDay.id },
      data: { logNote: summary },
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Erro ao gerar resumo do dia:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar resumo" },
      { status: 500 }
    );
  }
}
