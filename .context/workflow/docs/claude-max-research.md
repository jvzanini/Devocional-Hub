# Pesquisa: Claude Code Max como Provider de IA

> **Data:** 2026-03-20
> **Status:** Pesquisa concluída — aguardando decisão

---

## 1. O que é Claude Code Max?

A assinatura **Claude Code Max** ($200/mês) é para uso da **CLI Claude Code** — a ferramenta de desenvolvimento assistido por IA. Ela **NÃO** inclui acesso à **Anthropic API** para uso programático em aplicações.

## 2. Viabilidade de usar na aplicação

**NÃO é possível** usar a assinatura Claude Code Max como provider de IA para o DevocionalHub. São produtos separados:

| Produto | Uso | Preço |
|---------|-----|-------|
| Claude Code Max | CLI para desenvolvedores | $200/mês (uso ilimitado da CLI) |
| Anthropic API | API para aplicações | Pay-per-use (por token) |

Para integrar Claude na aplicação, é necessário criar uma **API key separada** em [console.anthropic.com](https://console.anthropic.com).

## 3. Custos da Anthropic API

### Preços por 1M tokens (março 2026):

| Modelo | Input | Output | Contexto |
|--------|-------|--------|----------|
| Claude Sonnet 4.6 | $3.00 | $15.00 | 200K |
| Claude Haiku 4.5 | $0.80 | $4.00 | 200K |
| Claude Opus 4.6 | $15.00 | $75.00 | 200K |

### Estimativa de custo para DevocionalHub:

Cada pipeline de devocional consome aproximadamente:
- Triagem de transcrição: ~5K input + ~2K output
- Processamento de transcrição: ~15K input + ~2K output
- Pesquisa teológica: ~16K input + ~4K output
- Extração de senha: ~10K input + ~0.5K output

**Total por devocional (com Sonnet 4.6):** ~46K input + ~8.5K output
- Custo: ~$0.14 + ~$0.13 = **~$0.27 por devocional**
- Estimativa mensal (30 devocionais): **~$8/mês**

**Total por devocional (com Haiku 4.5):** mesmo volume
- Custo: ~$0.04 + ~$0.03 = **~$0.07 por devocional**
- Estimativa mensal: **~$2/mês**

### Comparação com OpenAI (configuração atual):

| Provider | Custo/devocional | Custo/mês (30) |
|----------|-----------------|----------------|
| GPT-4.1-mini (OpenAI) | ~$0.05 | ~$1.50 |
| Haiku 4.5 (Anthropic) | ~$0.07 | ~$2.00 |
| Sonnet 4.6 (Anthropic) | ~$0.27 | ~$8.00 |
| Fallback gratuito (OpenRouter/Gemini) | $0 | $0 |

## 4. Opções para o usuário

### Opção A: Manter configuração atual (Recomendado)
- OpenAI como primário (gpt-4.1-mini) — ~$1.50/mês
- OpenRouter + Gemini como fallback gratuito
- **Sem custo adicional**

### Opção B: Adicionar Claude como provider opcional
- Instalar `@anthropic-ai/sdk`
- Adicionar `ANTHROPIC_API_KEY` no Portainer
- Claude como primeira opção na cascata (se key configurada)
- **Custo adicional:** ~$2-8/mês dependendo do modelo

### Opção C: Claude como fallback premium
- Manter OpenAI como primário
- Claude Haiku como fallback antes dos gratuitos
- Só entra se OpenAI falhar
- **Custo adicional:** ~$0-2/mês (apenas quando OpenAI falhar)

## 5. Recomendação

**Opção A** é a mais econômica. A qualidade do GPT-4.1-mini é excelente para o caso de uso.

Se desejar melhor qualidade na triagem teológica, **Opção C** oferece bom equilíbrio.

---

## DECISÃO FINAL (2026-03-20)

**Opção A selecionada pelo usuário.** Manter configuração atual:
- **Primário:** OpenAI GPT-4.1-mini (~$1.50/mês)
- **Fallback:** OpenRouter + Gemini (gratuito)
- **Claude API:** NÃO integrar. Sem custo adicional.
- **GPT-3.5-Turbo:** Já removido da lista de modelos.

**Status: FECHADO — Nenhuma ação adicional necessária.**
