---
name: commit-message
description: Gerar mensagens de commit em portugues para o DevocionalHub
---

# Commit Message — DevocionalHub

## Objetivo
Gerar mensagens de commit em portugues brasileiro, descritivas, seguindo as convencoes do projeto DevocionalHub.

## Formato Obrigatorio

```
<descricao descritiva em portugues>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

### Exemplos

```
Adicionar validacao de role ADMIN no endpoint de usuarios

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

```
Corrigir CSS do dark mode substituindo @theme por custom properties

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

```
Implementar fallback para Gemini 2.5 Flash na cascata de IA

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

## Regras

### 1. Idioma
- Mensagem SEMPRE em portugues brasileiro.
- Usar acentos corretos (UTF-8 direto).
- Verbos no infinitivo: "Adicionar", "Corrigir", "Implementar", "Atualizar", "Remover", "Refatorar".

### 2. Conteudo
- Primeira linha: descricao clara e concisa do que foi feito (maximo ~72 caracteres).
- Se necessario, corpo com detalhes adicionais separado por linha em branco.
- Foco no "por que" e nao apenas no "o que".
- Ser descritivo: "Corrigir CSS do dark mode no card de sessao" e melhor que "fix css".

### 3. Co-Authored-By (OBRIGATORIO)
- Sempre incluir ao final:
  ```
  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```
- Separar do corpo da mensagem por uma linha em branco.

### 4. Seguranca (CRITICO)
- NUNCA commitar credenciais, API keys, senhas, tokens ou emails reais.
- Antes de gerar o commit, verificar os arquivos alterados por dados sensiveis.
- Se credenciais forem detectadas nos arquivos staged, ALERTAR o usuario e NAO commitar.
- Verificar especialmente: `portainer-stack.yml`, `docker-compose.yml`, `.env`, arquivos de config.

### 5. Escopo por Feature
Quando possivel, mencionar a feature afetada na mensagem:
- "Atualizar componente de presenca na feature sessions"
- "Adicionar novo endpoint na API de admin"
- "Refatorar logica de cascata de IA no pipeline"

## Verbos Comuns
| Verbo | Uso |
|-------|-----|
| Adicionar | Nova feature, novo arquivo, novo endpoint |
| Implementar | Feature completa ou funcionalidade significativa |
| Corrigir | Bug fix |
| Atualizar | Melhoria em feature existente |
| Refatorar | Mudanca de estrutura sem alterar comportamento |
| Remover | Exclusao de codigo, arquivo ou feature |
| Configurar | Setup, configuracao de ferramenta ou servico |
| Ajustar | Pequena alteracao, fine-tuning |
| Migrar | Mudanca de tecnologia ou versao |
| Documentar | Atualizacao de documentacao |

## Processo
1. Analisar `git diff --staged` para entender as mudancas.
2. Verificar se ha credenciais nos arquivos staged.
3. Gerar mensagem descritiva em portugues.
4. Incluir Co-Authored-By.
5. Usar HEREDOC para formatar o commit:
```bash
git commit -m "$(cat <<'EOF'
Descricao da mudanca em portugues

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```
