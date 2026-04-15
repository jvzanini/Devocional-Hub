# Engajamento & Streaks v1 — Design Spec

**Data:** 2026-04-15
**Autor:** Claude (modo autônomo)
**Status:** Draft
**Escopo:** Sistema de gamificação leve baseado em presença (Attendance) e leitura, com widget no dashboard e conquistas persistentes.

---

## 1. Objetivo

Aumentar engajamento e retenção dos membros oferecendo feedback visual/emocional sobre sua consistência devocional, sem adicionar dependências externas (pagamentos, push notifications) e reaproveitando o máximo dos dados já coletados (`Attendance`, `Session`, `ReadingPlanDay`).

## 2. Não-Objetivos

- Não introduz monetização, planos pagos, Stripe ou similares.
- Não altera o fluxo de pipeline Zoom → IA.
- Não adiciona notificações por email/push nesta V1 (fica para V2).
- Não expõe ranking competitivo entre usuários (princípio pastoral: evitar comparação).
- Não substitui os cards de estatística atuais — complementa.

## 3. Contexto e Origem dos Dados

- `Attendance`: registro por usuário × sessão (`userId + sessionId` único). Tem `joinTime`, `leaveTime`, `duration`.
- `Session`: tem `date` e `status` (`COMPLETED` = processada com sucesso).
- `ReadingPlanDay` + `ChapterReading`: progresso agregado (não por usuário).
- Usuário atual vem do NextAuth (`session.user.id`).

Conclusão: streaks e estatísticas pessoais serão derivadas primariamente de `Attendance` (sinal concreto de presença). Leitura pessoal fica de fora da V1.

## 4. Funcionalidades (V1)

### 4.1 Estatísticas do usuário (derivadas)

Calculadas em um único util (`@/features/engagement/lib/user-stats.ts`):

| Métrica | Definição |
|---|---|
| `totalAttended` | `count(Attendance where userId = X)` |
| `totalSessionsCompleted` | `count(Session where status = COMPLETED)` |
| `frequencyPct` | `totalAttended / totalSessionsCompleted` — número em [0, 1]. Formatação para "XX%" feita no componente de view. |
| `currentStreak` | Nº de sessões COMPLETED consecutivas (ordem desc de `date`) em que o usuário tem `Attendance`. Para no primeiro "miss". |
| `bestStreak` | Maior sequência histórica de sessões COMPLETED consecutivas com presença. |
| `lastAttendedAt` | `max(joinTime)` do usuário (quando efetivamente entrou no Zoom). |
| `booksReadCount` | Nº de livros distintos extraídos de `Session.chapterRef` dos devocionais que o usuário participou. Reutiliza `extractBookName()` que hoje vive inline em `page.tsx` — refactor preliminar (task 0 do plan) move para `@/shared/lib/bible-utils.ts`. Consumidores iniciais: `src/app/(dashboard)/page.tsx` e `src/features/engagement/lib/user-stats.ts`. Qualquer outro consumidor descoberto via `grep -rn extractBookName src` migra junto. |

**Definição de streak:**
- Base = lista ordenada de sessões COMPLETED em ordem cronológica **ASC**.
- `currentStreak` = comprimento da run contínua de presenças terminando na **última sessão COMPLETED**. Se o usuário não compareceu à última sessão COMPLETED, aplica-se janela de tolerância: se a última COMPLETED aconteceu há menos de **36h**, `currentStreak` mantém o valor da run imediatamente anterior (suaviza atraso no pipeline Zoom→pipeline). Após 36h, zera.
- `bestStreak` = maior run contínua histórica (varredura única ASC).

**Edge cases:**
- Usuário sem nenhuma presença: `currentStreak=0`, `bestStreak=0`.
- Sessão futura agendada mas ainda não acontecida: ignorada (apenas `COMPLETED`).
- `totalSessionsCompleted=0`: `frequencyPct=0` (sem divisão por zero).

### 4.1.1 Timezone

Toda normalização para "dia" usa **America/Sao_Paulo** (consistente com `getGreeting()` em `page.tsx`). Streak em V1 é por sessão (não por dia), então TZ só afeta apresentação ("há N dias" no toast). Util helper: `toBrazilDate(date: Date): string` retornando `YYYY-MM-DD` em TZ Brasil. A janela de 36h em `currentStreak` compara timestamps absolutos (sem TZ), portanto é segura.

### 4.2 Conquistas (Achievements)

Catálogo fixo em código (não editável por admin na V1), avaliado no servidor após cada cálculo de stats. Quando o critério passa de falso→verdadeiro e ainda não há registro em `UserAchievement`, cria o registro.

Catálogo inicial (7 conquistas):

| Key | Título | Descrição | Critério |
|---|---|---|---|
| `first_step` | Primeiro Passo | Presente em seu primeiro devocional. | `totalAttended >= 1` |
| `streak_3` | Três em Sequência | 3 devocionais consecutivos. | `bestStreak >= 3` |
| `streak_7` | Semana Fiel | 7 devocionais consecutivos. | `bestStreak >= 7` |
| `streak_15` | Constância | 15 devocionais consecutivos. | `bestStreak >= 15` |
| `faithful_10` | Presente 10x | 10 devocionais no total. | `totalAttended >= 10` |
| `faithful_30` | Presente 30x | 30 devocionais no total. | `totalAttended >= 30` |
| `book_explorer` | Explorador da Palavra | Participou de devocionais de 5 livros diferentes. | `booksReadCount >= 5` |

**Persistência:** nova tabela `UserAchievement` (ver §6).

### 4.3 Widget "Sua Jornada" no Dashboard

Card novo posicionado **após o Reading Banner e antes de "Distribuição por Livro"**, visível para todos os roles. Esta posição preserva o CTA principal (Zoom) no topo do fold, especialmente em mobile. Estrutura:

```
┌─────────────────────────────────────────────┐
│ Sua Jornada                                 │
│                                             │
│ 🔥 7 em sequência   ⭐ Melhor: 12           │
│                                             │
│ ▓▓▓▓▓▓▓░░░░░░ 7/10 para "Faithful 10"       │
│                                             │
│ [Badge1] [Badge2] [Badge3] … (+2)           │
│                                             │
│ Última conquista: "Semana Fiel" · há 3 dias │
└─────────────────────────────────────────────┘
```

Se `totalAttended === 0`: mostra estado vazio motivacional ("Sua jornada começa no próximo devocional").

### 4.4 Notificação de desbloqueio

Quando um achievement é desbloqueado durante a navegação (detectado via flag `justUnlocked` no resultado da API), mostrar toast discreto por 5s na mesma página. Na V1, detecção ocorre **na carga do dashboard**: se há conquistas desbloqueadas desde o último `lastSeenAchievementAt` do usuário, exibe celebração uma única vez por sessão de navegação.

- Armazenar `lastSeenAchievementAt` em `localStorage` (`devhub-achievement-seen`) — não polui DB.

## 5. Arquitetura

Nova feature isolada: `src/features/engagement/`.

```
src/features/engagement/
├── lib/
│   ├── user-stats.ts          # getUserEngagementStats(userId): computa stats
│   ├── achievements.ts        # Catálogo + evaluateAchievements(stats) → unlocks
│   └── achievement-sync.ts    # Upsert em UserAchievement (idempotente)
└── components/
    ├── JourneyCard.tsx        # Widget "Sua Jornada" (Server Component)
    ├── BadgeGrid.tsx          # Grid de badges (Client, hover/tooltip)
    └── AchievementToast.tsx   # Toast celebratório (Client)
```

**Fluxo de render do dashboard:**
1. `page.tsx` chama `getUserEngagementStats(userId, sessionsAlreadyLoaded)` → retorna `{ stats, allUnlocked, newlyUnlockedKeys }`.
2. Internamente: calcula stats → chama `evaluateAchievements` → `achievement-sync` faz upsert das novas.
3. Retorna `newlyUnlockedKeys` (array de keys desbloqueadas nesta request).
4. `<JourneyCard stats={stats} unlocked={allUnlocked} />` renderiza no SSR.
5. `<AchievementToast newlyUnlockedKeys={newlyUnlockedKeys} />` (client) exibe toast se a key ainda não foi "vista" via localStorage.

**Otimização (single-fetch):** o dashboard já faz `prisma.session.findMany({ orderBy: { date: "desc" } })`. `getUserEngagementStats` recebe esse array por injeção de dependência para evitar double-fetch. Assinatura: `getUserEngagementStats(userId: string, sessionsAlreadyLoaded: Session[])`.

**Contrato do retorno de `getUserEngagementStats`:**
```ts
{
  stats: UserEngagementStats,
  allUnlocked: UserAchievement[],       // todas (inclui antigas + recém)
  newlyUnlockedKeys: string[],          // só as criadas nesta request. VAZIO quando silent=true (backfill).
  silent: boolean,                      // true quando backfill de usuário antigo (ver §12.2)
}
```

**Contrato de props:**
- `JourneyCard` (Server): `{ stats: UserEngagementStats, unlocked: UserAchievement[] }`. Internamente converte `unlocked.map(u => u.key)` em `Set<string>` e passa para `BadgeGrid`.
- `BadgeGrid` (Client): `{ catalog: Achievement[], unlockedKeys: Set<string>, recentlyUnlockedKeys?: string[] }`.
- `AchievementToast` (Client): `{ newlyUnlockedKeys: string[], silent: boolean }`. Na hydration:
  - Lê `devhub-achievement-seen` de `localStorage` (array de keys já vistas).
  - Se `silent === true`: semeia `devhub-achievement-seen` com todas as keys atualmente desbloqueadas (merge) e **não** exibe toast.
  - Caso contrário: diff entre `newlyUnlockedKeys` e o Set visto; se houver novas, exibe toast (agrupado se >1) e grava as keys em `devhub-achievement-seen`.

**Idempotência e concorrência:** `achievement-sync` usa `prisma.userAchievement.upsert` por `(userId, key)`. Captura `P2002` silenciosamente (race benigna entre requests paralelas do mesmo usuário — unique constraint garante integridade).

## 6. Modelo de Dados (Prisma)

Adicionar ao `schema.prisma`:

```prisma
model UserAchievement {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  key         String   // e.g. "streak_7"
  unlockedAt  DateTime @default(now())

  @@unique([userId, key])
  @@index([userId])
  @@index([userId, unlockedAt])
}
```

Adicionar em `User`:
```prisma
achievements UserAchievement[]
```

**Migração:** `npx prisma db push` roda no entrypoint Docker; sem necessidade de data-migration (tabela nova).

## 7. API e Segurança

V1 **não** expõe endpoints públicos novos. Tudo roda no SSR do dashboard, reduzindo superfície.

**Regra de segurança explícita:** `getUserEngagementStats` só aceita `userId` vindo de `session.user.id` no Server Component. **Nunca** aceitar `userId` via query string, body ou header. Isso blinda contra enumeration entre usuários e garante que stats de um usuário jamais vazem para outro (sem necessidade de guards adicionais).

**LGPD:** conquistas e streaks não contêm dados sensíveis (nome, email, identificadores de terceiros). A tabela nova `UserAchievement` só guarda `userId + key + unlockedAt`. Soft delete de `User` (`deletedAt`) já propaga via `onDelete: Cascade` configurado no modelo.

**Exceção futura (não V1):** `/api/engagement/stats` — se formos consumir do client. Deixar de fora.

## 8. Design Visual (ui-ux-pro-max)

- Reaproveita tokens atuais: `var(--accent)`, `var(--surface)`, `var(--radius-xl)`.
- Ícone de chama (🔥) para streak atual; estrela (⭐) para melhor streak.
- Badges: círculos 48×48 com ícone central em SVG monocromático e aro dourado (`var(--accent)`) — dark e light mode.
- Badge bloqueada: opacidade 40% + cadeado no canto.
- Badge desbloqueada hoje: leve "glow" (box-shadow pulsante por 2s).
- Toast: 320px, canto inferior direito, entra com slide-up, auto-dismiss 5s.
- Classes novas adicionadas em `globals.css`: `.journey-card`, `.badge-circle`, `.badge-locked`, `.achievement-toast`.
- Mobile: badges em grid 4 colunas em <480px, stats com fonte menor (24→20), card ocupa full width.
- Humanização relativa ("há 3 dias") via helper local `timeAgoPtBR(date: Date): string` — sem adicionar `date-fns` (não existe no projeto).

**ATENÇÃO (gotchas do CLAUDE.md):**
- Classes novas entram como CSS hardcoded em `globals.css` usando `var(--*)` existentes.
- **NUNCA usar `@theme inline` do Tailwind v4** (CSS vars não existem em runtime no Docker).
- Animação "glow" definida via `@keyframes` em `globals.css`, nunca inline.
- SVGs de badges com `aria-hidden="true"`; texto visível ou `sr-only` carrega o nome da conquista.

A skill `ui-ux-pro-max` será usada na fase de implementação para refinar componentes visuais.

## 9. Acessibilidade

- Badges com `aria-label` descrevendo nome + estado (desbloqueada/bloqueada).
- Toast com `role="status"` + `aria-live="polite"`.
- Contraste mínimo 4.5:1 em ambos temas (verificar badge-locked).

## 10. Testes (Playwright + unit)

**Decisão de runner:** adicionar `vitest@^1` + `tsx` **apenas em `devDependencies`**. Validar durante o plan se o `Dockerfile` do projeto usa `npm ci --omit=dev` (ou equivalente) — em caso negativo, garantir que vitest não vá para a imagem final. Script `npm run test:unit` → `vitest run`. Zero-config com TS, padrão de mercado, compatível com o projeto.

**Unit (Vitest):**
- `user-stats.test.ts`: streak com cenários (sem presenças, 1 presença, gap, sequência longa, duas runs e melhor ≠ atual, janela de 36h de tolerância).
- `achievements.test.ts`: cada critério, idempotência, apenas novas são retornadas.

**E2E (Playwright em `tests/e2e/engagement.spec.ts`):**
- Login com credenciais do .env, abre dashboard, verifica presença do card "Sua Jornada", screenshot desktop (Chrome) + mobile (Pixel 7). Projetos já configurados em `playwright.config.ts`.

Rodar após implementação conforme CLAUDE.md §Processo de Desenvolvimento.

## 11. Risco e Mitigação

| Risco | Mitigação |
|---|---|
| Cálculo pesado no SSR do dashboard (N queries) | Em V1 o volume é baixo (<1k sessions). Uma query agregada `findMany` + redução em memória. Se crescer, cachear por 60s. |
| Badges visuais quebrando mobile | Grid responsivo com `minmax`, limitar a 4 colunas em <480px. |
| Conquista desbloqueada em request paralela (duplicata) | `@@unique([userId, key])` garante. `upsert` silencia colisão. |
| Usuário antigo com 30+ presenças abre dashboard pela 1ª vez e dispara 5 toasts | Toast agrupa múltiplos unlocks no mesmo render ("🎉 5 conquistas desbloqueadas!"), botão "Ver todas". |

## 12. Rollout

1. **Feature flag:** lida via `AppSetting` key `engagementEnabled`. **Convenção:** linha ausente = habilitado (default `true` no helper async `getEngagementEnabled(): Promise<boolean>` em `src/features/engagement/lib/feature-flag.ts`). Para evitar waterfall no SSR do dashboard, a leitura é paralelizada com as demais queries via `Promise.all`. Toggle exposto no painel admin (aba "Configurações") nesta V1 (custo baixo — o painel já tem seção de AppSetting). Documentar convenção em `CLAUDE.md` após implementação.
2. **Backfill silencioso de toasts:** heurística auto-contida (sem acoplamento com CI/deploy): na primeira execução por usuário, se `UserAchievement` estava vazio **E** `totalAttended >= 2` (ou seja, o usuário já tinha histórico antes desta feature existir), todos os unlocks gerados nesta request são persistidos mas retornados com a flag `silent: true`. A lista `newlyUnlockedKeys` enviada ao client fica vazia nesse cenário, e o componente client semeia `devhub-achievement-seen` com todas as keys desbloqueadas para que qualquer carga futura também pule toast. Badges aparecem já "conquistadas" sem celebração falsa.
3. **Deploy:** uma única release com migration + util + card + toasts. Feature flag serve como kill switch caso algum bug apareça.

## 13. Futuro (fora desta spec)

- V2: Streaks baseados em leitura pessoal (requer `UserChapterReading` per-user).
- V2: Notificações por email quando streak quebra.
- V2: Compartilhar conquista (gera card exportável).
- V2: Admin pode criar conquistas customizadas via painel.
