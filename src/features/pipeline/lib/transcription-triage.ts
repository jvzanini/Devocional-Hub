/**
 * Triagem Inteligente de Transcrições
 *
 * Processa a transcrição bruta do Zoom e gera uma síntese limpa,
 * validada teologicamente, removendo conteúdo irrelevante e
 * corrigindo fatos bíblicos comprovadamente errados.
 */

import { callAI } from "@/features/pipeline/lib/ai";

/**
 * Processa a transcrição bruta e produz uma síntese limpa e organizada.
 *
 * Regras de triagem:
 * - REMOVER: nomes pessoais, referências a áudio/música/outros idiomas
 * - REMOVER: comentários irrelevantes ao texto bíblico
 * - CORRIGIR: fatos bíblicos comprovadamente errados (com referência)
 * - REMOVER: informações grotescamente falsas sem base bíblica
 * - MANTER: interpretações espirituais, experiências pessoais, dons espirituais
 * - MANTER: tudo que não se pode comprovar como errado
 */
export async function triageTranscription(
  rawTranscript: string,
  bibleText: string,
  theologicalBase: string
): Promise<string> {
  const prompt = `Você é um especialista em teologia bíblica com profundo conhecimento das Escrituras. Analise a transcrição de um devocional bíblico e produza uma SÍNTESE LIMPA seguindo estas regras rigorosas:

## REGRAS DE REMOÇÃO (OBRIGATÓRIAS):
1. REMOVER todos os nomes pessoais de participantes (ex: "João Vitor mencionou...", "Maria disse...")
2. REMOVER referências a áudio compartilhado, músicas tocadas, outros idiomas
3. REMOVER comentários completamente irrelevantes ao texto bíblico (recados, avisos administrativos, cumprimentos)
4. CORRIGIR fatos bíblicos comprovadamente errados — indicar a correção com a referência bíblica correta
5. REMOVER informações grotescamente falsas que não têm nenhuma base bíblica

## REGRAS DE PRESERVAÇÃO (OBRIGATÓRIAS):
1. MANTER todas as interpretações espirituais e aplicações práticas
2. MANTER experiências pessoais e testemunhos (anonimizados — sem nomes)
3. MANTER referências a dons espirituais e manifestações
4. MANTER TUDO que não se pode comprovar como errado — na dúvida, MANTER
5. MANTER a essência da discussão sobre o texto bíblico

## TEXTO BÍBLICO DE REFERÊNCIA:
${bibleText.substring(0, 8000)}

## BASE TEOLÓGICA:
${theologicalBase.substring(0, 8000)}

## TRANSCRIÇÃO BRUTA:
${rawTranscript.substring(0, 15000)}

## FORMATO DA SAÍDA:
Produza uma síntese organizada em parágrafos fluidos, focando na essência do que foi discutido sobre o texto bíblico. A síntese deve:
- Ser escrita em português brasileiro
- Organizar os pontos discutidos em ordem lógica
- Preservar a profundidade teológica da discussão
- Ser compreensível sem ter assistido ao devocional
- Ter entre 500-2000 palavras dependendo da riqueza do conteúdo original

Responda APENAS com o texto da síntese (sem JSON, sem formatação especial, sem cabeçalhos).`;

  try {
    const synthesis = await callAI(prompt, 4000);
    if (!synthesis || synthesis.trim().length < 100) {
      console.warn("[Triage] Síntese muito curta, usando transcrição original");
      return rawTranscript;
    }
    return synthesis.trim();
  } catch (err) {
    console.error("[Triage] Falha na triagem, usando transcrição original:", err);
    return rawTranscript;
  }
}
