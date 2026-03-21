# Terminal C — Etapas 5 + 6: Planejamento, Relatórios, Login, Perfil, Design

> **Escopo:** `src/app/(dashboard)/planning/page.tsx`, `src/app/(dashboard)/reports/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(dashboard)/profile/page.tsx`, `src/shared/components/Sidebar.tsx`, `src/app/globals.css` (cores accent), `src/features/planning/`
> **NÃO TOCAR:** bible-reader/, API routes de admin/webhook/bible, dashboard page.tsx, books page.tsx, session page.tsx

## Referências
- Plano Hotfix: `.context/plans/devocional-hub-v2-hotfix.md`
- CLAUDE.md na raiz do projeto
- Prints do usuário mostrando os problemas visuais

## Regras
- Responder SEMPRE em português brasileiro
- NUNCA commitar credenciais reais
- Validar com `npx tsc --noEmit` antes de commitar
- NÃO fazer push (quem faz push é o Terminal D)

---

## Etapa 5 — Planejamento

### 5.1 — Renderizar Markdown
**Arquivo:** `src/app/(dashboard)/planning/page.tsx` e/ou `src/features/planning/components/PlanningCard.tsx`
- Textos vêm com `**negrito**` cru — renderizar como Markdown real
- Opção: usar uma lib simples como `react-markdown` ou fazer parse manual de `**bold**`, `# títulos`, `\n\n` → parágrafos
- Se não quiser adicionar dependência: fazer replace de `**texto**` → `<strong>texto</strong>` e separar por parágrafos

### 5.2 — Referências bíblicas
- Aparecem como "referência não reconhecida" — investigar o endpoint que busca os versículos
- **Arquivo:** `src/features/planning/lib/reference-fetcher.ts`
- Verificar se está usando o formato correto da API.Bible para buscar versículos específicos

### 5.3 — Imagens
- Não foram geradas — verificar `src/features/planning/lib/image-generator.ts`
- Se DALL-E falhar, usar placeholder elegante (não ícone quebrado)

### 5.4 — Organização por livros (expand/collapse)
**Arquivo:** `src/app/(dashboard)/planning/page.tsx`
- Título: "Planejamento" (remover nome do livro do título principal)
- Organizar em blocos colapsáveis: um bloco por LIVRO
- Dentro de cada livro: um bloco colapsável por CAPÍTULO
- Estado inicial: todos os capítulos recolhidos
- Clique expande/recolhe cada capítulo individualmente

### 5.5 — Botão "Gerar"
- O ícone estrela do botão é invisível (mesma cor do fundo)
- Mudar cor do ícone para branco ou escuro (contraste com o botão)

---

## Etapa 5.2 — Relatórios

### 5.6 — Renomear menu
**Arquivo:** `src/shared/components/Sidebar.tsx`
- "Progresso" → "Relatórios"
- Manter o mesmo ícone e rota `/reports`

### 5.7 — Filtros em linha horizontal
**Arquivo:** `src/app/(dashboard)/reports/page.tsx`
- Remover bloco vertical de filtros (à esquerda)
- Colocar filtros em LINHA HORIZONTAL acima dos cards de insight (Total Presenças, etc.)
- Layout: `[Ano] [Mês] [Igreja] [Equipe] [SubEquipe] [Livro] [Usuário] [Exportar]`

### 5.8 — Filtros por role
- Para MEMBER/SUBSCRIBER: esconder filtros de Igreja, Equipe, SubEquipe, Usuário Específico
- Mostrar APENAS o filtro de Livro
- O userRole vem da session/props

### 5.9 — Cards de insight
- Adicionar "Duração Média" como 4o card grande (ao lado de Total Presenças, Membros Únicos, Freq. Média)
- REMOVER os bloquinhos menores abaixo (sessões no mês, membro mais presente, duração média, período) — são redundantes

---

## Etapa 6 — Login, Perfil & Design

### 6.1 — Tela de login
**Arquivo:** `src/app/(auth)/login/page.tsx`
- Mudar frase: "Acesse sua plataforma de devocionais com IA" → "Sua plataforma de devocionais inteligentes"
- Aumentar ícone do livro (de ~40px para ~56px)
- Aumentar fonte "Devocional Hub" (de ~24px para ~32px)
- "Esqueci a senha": NÃO usar popup/modal sobreposto
  - Quando clicar em "Esqueceu a senha?", o formulário de login se TRANSFORMA no formulário de redefinição (mesma caixa, transição suave)
  - Botão "Voltar ao login" para retornar ao formulário original

### 6.2 — Perfil — feedback toast
**Arquivo:** `src/app/(dashboard)/profile/page.tsx`
- O feedback "Nenhuma alteração para salvar" / "Atualizado com sucesso" aparece INLINE entre os botões, empurrando layout
- Substituir por TOAST: pop-up no canto superior direito que aparece por 2-3s e some
- Implementar com `position: fixed; top: 24px; right: 24px; z-index: 200;` + fade animation

### 6.3 — Cores accent
**Arquivo:** `src/app/globals.css`
- O amarelo accent atual (`#f5a623` dark / `#d97706` light) está muito alaranjado/marronzado
- **Dark mode:** usar amarelo queimado elegante, ex: `#e6a817` ou `#daa520` (goldenrod)
- **Light mode:** usar tom mais quente mas não tão marrom, ex: `#c7910a` ou `#b8860b` (dark goldenrod)
- Testar visualmente que o contraste fica bom em ambos os modos

### 6.4 — Logo sidebar
**Arquivo:** `src/shared/components/Sidebar.tsx`
- Aumentar ícone do logo (de ~28px para ~36px)
- Aumentar fonte "Devocional Hub" (de ~16px para ~20px, weight 700)

---

## Commit ao finalizar
```
git add "src/app/(dashboard)/planning/" "src/app/(dashboard)/reports/page.tsx" "src/app/(auth)/login/page.tsx" "src/app/(dashboard)/profile/page.tsx" src/shared/components/Sidebar.tsx src/app/globals.css src/features/planning/
git commit -m "fix(hotfix-C): planejamento markdown, relatórios filtros, login inline, cores accent

- Planejamento: renderizar markdown, expand/collapse por livro/capítulo
- Relatórios: filtros em linha, esconder filtros para não-admin, 4o card duração
- Login: frase atualizada, fonte maior, esqueci senha inline
- Perfil: feedback como toast
- Cores: accent amarelo queimado (menos alaranjado)
- Sidebar: Progresso→Relatórios, logo maior

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
