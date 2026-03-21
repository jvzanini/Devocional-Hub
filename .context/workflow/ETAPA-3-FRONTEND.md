# ETAPA 3 — Core Frontend: Sidebar, Calendário, Admin Panel

> **Terminal dedicado para esta etapa**
> **Duração estimada:** 3-4 dias
> **Depende de:** Etapa 1 (CONCLUÍDA)

## Contexto

A Etapa 1 já foi concluída. O sistema de permissões está implementado com:
- `src/features/permissions/lib/role-hierarchy.ts` — hasAccess(), isAdmin(), ALL_ROLES
- `src/features/permissions/lib/permission-guard.ts` — requireRole(), requirePermission()
- Enum UserRole: SUPER_ADMIN, ADMIN, SUBSCRIBER_VIP, SUBSCRIBER, MEMBER

**Referências obrigatórias antes de começar:**
- PRD: `.context/workflow/docs/prd-devocional-hub-master-update-v2.md`
- Tech Spec: `.context/workflow/docs/tech-spec-devocional-hub-master-update-v2.md`
- Plano completo: `.context/plans/devocional-hub-master-update-v2.md`
- CLAUDE.md na raiz do projeto (convenções obrigatórias)

## Regras Gerais

- Responder SEMPRE em português brasileiro
- NUNCA commitar credenciais reais
- CSS via CSS variables: `var(--text)`, `var(--accent)`, `var(--surface)`, `var(--bg)`
- NUNCA usar `@theme` inline do Tailwind v4 — apenas CSS custom properties
- Dark mode: `[data-theme="dark"]` — TESTAR SEMPRE em ambos os temas
- Fontes: o usuário quer fontes GRANDES e legíveis
- Classes: usar classes de `globals.css` (`.card`, `.btn-primary`, `.input-field`, etc.)
- Imports: `@/features/<feature>/components/<Component>`, `@/shared/components/<Component>`
- O banco roda na VPS, NUNCA localmente

---

## Subetapa 3.1 — Sidebar Redesign (F9)

### Arquivo principal: `src/shared/components/Sidebar.tsx`

### Tasks

1. **Aumentar largura da sidebar**
   - Ajustar CSS: aumentar `min-width` e `max-width`
   - Garantir que o conteúdo principal se ajusta

2. **Aumentar fontes e espaçamento**
   - Itens de menu: fonte maior, mais padding vertical
   - Ícones: proporcionais à nova fonte

3. **Remover menu "Meu Perfil"**
   - Excluir item de menu "Meu Perfil" da lista
   - Tornar o nome/foto do usuário (no rodapé) clicável
   - Adicionar `cursor: pointer` e navegação para `/profile`
   - Efeito hover sutil no clique

4. **Renomear menus:**
   - "Livros da Bíblia" → "Devocional"
   - "Relatórios" → "Progresso"

5. **Menu "Progresso" visível para TODOS os níveis de acesso**
   - Importar `isAdmin` de `role-hierarchy.ts` apenas para filtros admin
   - O menu "Progresso" aparece para todos

6. **Remover menu "Presença"** (redundante com relatórios)

7. **Sidebar mobile:**
   - Ajustar largura no mobile
   - Fontes proporcionais
   - Garantir hamburger menu funcional

---

## Subetapa 3.2 — Calendário Redesign (F1) + Banner (F2)

### Arquivos: `src/features/dashboard/components/DashboardCalendar.tsx`, `src/app/(dashboard)/page.tsx`

### Tasks

1. **Criar mapa de abreviações dos 66 livros**
   - Arquivo: `src/features/bible/lib/bible-abbreviations.ts`
   - Usar máximo de caracteres: ROM (não RM), COR (não CO), ATOS (não AT)
   - Exportar função `getBookAbbreviation(bookName: string): string`
   - Exportar função `formatChapterLabel(bookName: string, chapters: string): string`
     - Ex: `formatChapterLabel("Romanos", "11")` → `"ROM 11"`
     - Ex: `formatChapterLabel("1 Coríntios", "1-3")` → `"1COR 1-3"`

2. **Redesign visual do calendário**
   - Devocionais FUTUROS: destaque amarelo/âmbar (manter atual)
   - Devocionais REALIZADOS (passados): cor mais escura ou apenas bordas (sem preenchimento forte)
   - DIA DE HOJE: destaque especial diferenciado (borda mais grossa, cor distinta)

3. **Legendas em TODOS os dias com devocional**
   - Embaixo de cada dia: exibir `{ABREV} {capítulos}`
   - Usar `formatChapterLabel()` criado acima
   - Fonte pequena mas legível

4. **Banner de leitura redesenhado**
   - A seção atual "Leitura: Romanos" → transformar em retângulo grande (mesmo padrão do calendário)
   - Manter barra de progresso
   - Botão mais elaborado (com hover, gradiente)
   - Remover "Insights de IA" desta posição (será substituído por gráfico de pizza na Etapa 4)

---

## Subetapa 3.3 — Admin Panel Fixes (F14, F15 parcial)

### Arquivo principal: `src/app/(dashboard)/admin/page.tsx`

### Tasks — F14 (Zoom Config)

1. **Lógica de bloqueio de campos:**
   - Campo VAZIO → desbloqueado, editável livremente
   - Campo PREENCHIDO → bloqueado, editar via ícone lápis, salvar
   - Aplicar em: Orador Principal, ID da Reunião Zoom, Link do Zoom

2. **Fix ícone relógio no modo escuro:**
   - Atualmente fica preto no dark mode (invisível)
   - Usar `color: var(--text)` ou `currentColor`

3. **Normalizar ícones de webhooks:**
   - Remover contorno branco no modo escuro do botão copiar
   - Alinhar botões desativar + excluir na mesma linha
   - Visual consistente entre todos os botões

### Tasks — F15 (Usuários)

4. **Mover barra de busca para junto da lista**
   - Remover do topo
   - Posicionar logo acima da tabela de usuários

5. **Botão "Enviar Convite" menor**
   - Não ocupar 100% da largura
   - Tamanho proporcional ao conteúdo

6. **Foto de perfil na lista de usuários**
   - Puxar `photoUrl` do banco
   - Exibir miniatura (thumbnail 64x64) ao lado do nome
   - Placeholder com iniciais se não tiver foto

7. **Admin na lista: apenas botão "Editar"**
   - Se o usuário é admin/super_admin: sem botão desativar/remover
   - Manter apenas botão de editar

8. **Campo email na edição**
   - Aparecer pré-preenchido e editável
   - Junto com: nome, equipe, igreja, subequipe, zoom identifiers

9. **Dropdown nível de acesso**
   - Usar `ALL_ROLES` de `role-hierarchy.ts`
   - Presente na CRIAÇÃO e na EDIÇÃO de usuário
   - Campo obrigatório na criação

10. **Campo email/username Zoom com "+" na criação**
    - Input + botão "+" → adiciona à lista
    - Campo limpa para próximo
    - Mesmo modelo da edição (já funciona)

11. **Campos de senha na criação**
    - "Criar Senha" + "Confirmar Senha"
    - Se preenchidos: botão muda de "Enviar Convite" → "Criar Usuário"
    - Validação: senhas devem coincidir

12. **Campo WhatsApp na criação**
    - Não obrigatório pelo admin
    - Máscara de DDD + número

13. **Nova seção "Permissões" no admin**
    - Criar nova aba no admin panel
    - Duas subseções: "Arquivos do Card Devocional" e "Menus"
    - Para cada item: dropdown com os 5 níveis de acesso
    - Endpoints: GET/PATCH `/api/admin/permissions` (já criados na Etapa 1)

14. **Menu placeholder "Assinaturas"**
    - Nova aba no admin com tela placeholder
    - Mensagem: "Funcionalidade em desenvolvimento"

---

## Subetapa 3.4 — Perfil de Usuário (F10)

### Arquivo: `src/app/(dashboard)/profile/page.tsx`

### O que já foi feito na Etapa 1:
- `src/shared/lib/image-utils.ts` — Compressão de fotos PRONTO
- `src/app/api/profile/password/route.ts` — Alterar senha PRONTO
- `src/app/api/profile/account/route.ts` — Soft delete PRONTO

### Tasks

1. **Upload de foto com compressão**
   - Criar endpoint `POST /api/profile/photo` se não existir
   - Usar `processAndSavePhoto()` de `image-utils.ts`
   - Max 5MB, validação MIME (JPEG, PNG, WebP, GIF)
   - Salvar em `/data/user-photos/{userId}/` (volume Docker persistente)

2. **Campo WhatsApp no perfil**
   - Editável, obrigatório (não pode deixar vazio)
   - Máscara de DDD + número

3. **Botão "Redefinir Senha"**
   - Abre modal com campos: Senha Atual, Nova Senha, Confirmar Nova Senha
   - Chamar `PATCH /api/profile/password`

4. **Nível de acesso visível**
   - Badge abaixo da foto com o nível (ex: "Super Admin", "Membro")
   - Não editável pelo próprio usuário

5. **Botão "Apagar Conta"**
   - Visual com destaque de atenção (vermelho/warning)
   - Modal de confirmação em 2 etapas:
     - Etapa 1: "Tem certeza? Esta ação não pode ser desfeita."
     - Etapa 2: "Digite 'APAGAR' para confirmar"
   - Chamar `DELETE /api/profile/account`
   - Após sucesso: logout automático

---

## Checklist de Conclusão

- [ ] Sidebar mais larga com fontes maiores
- [ ] Menu "Meu Perfil" removido, clique no nome funciona
- [ ] Renomeações: "Devocional", "Progresso"
- [ ] Menu "Presença" removido
- [ ] Calendário: futuros amarelos, passados escuros, hoje destacado
- [ ] Legendas com abreviação em todos os dias
- [ ] Banner de leitura redesenhado
- [ ] Admin: campos vazios desbloqueados, preenchidos com lápis
- [ ] Admin: relógio visível no dark mode
- [ ] Admin: webhooks ícones normalizados
- [ ] Admin: busca junto à lista, botão menor, fotos, roles
- [ ] Admin: seção "Permissões" funcional
- [ ] Perfil: foto persistente, WhatsApp, redefinir senha, apagar conta
- [ ] TUDO testado em dark mode E light mode
