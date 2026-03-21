# Decisão: Geração de Imagens para Cards de Planejamento

> **Data:** 2026-03-20
> **Status:** DECIDIDO

## Decisão Final

Cascata de geração:

1. **DALL-E 3** (OpenAI) — ~$0.04/imagem, 1024x1024, qualidade standard
2. **Fallback: ícone placeholder** — SVG de imagem com nome do livro/capítulo

## Justificativa

- Não existem modelos gratuitos de geração de imagem no OpenRouter (o Flux 1 Schnell gratuito foi descontinuado)
- DALL-E 3 tem boa qualidade e custo acessível (~$4.00 para um plano com 50 capítulos × 2 imagens)
- Se DALL-E falhar (sem crédito ou erro), o sistema exibe um placeholder visual com ícone

## Implementação

- `src/features/planning/lib/image-generator.ts` — geração via DALL-E 3
- `src/features/planning/components/PlanningCard.tsx` — exibe imagens ou placeholder com ícone
- Prompts otimizados para ilustrações bíblicas reverentes e contemplativas
- 2 imagens por card: uma temática e uma de cenário/paisagem
