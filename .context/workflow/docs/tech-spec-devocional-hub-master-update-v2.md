# Tech Spec — DevocionalHub Master Update v2

> **Versão:** 1.0
> **Data:** 2026-03-20
> **Status:** Em Revisão

---

## 1. Stack Atual & Mudanças Necessárias

### 1.1 Stack Mantida (sem mudanças)
- Next.js 16 (App Router) + React 19 + TypeScript 5
- Tailwind CSS 4 (classes em globals.css, CSS variables)
- Prisma 5.22 + PostgreSQL
- NextAuth v5 (beta) + Credentials + JWT
- Docker Swarm + Portainer + Traefik
- Playwright (NotebookLM automation)

### 1.2 Novas Dependências

| Pacote | Propósito | Feature |
|--------|----------|---------|
| `@anthropic-ai/sdk` | Claude API (se viável) | F19 |
| `sharp` | Compressão de imagens | F10 |
| `recharts` (já existe) | Gráfico de pizza + linha | F11, F12 |
| `nodemailer` (já existe) | Fix + novos templates | F16 |

### 1.3 Pacotes a Remover
- Nenhum removido, apenas ajustes de configuração

---

## 2. Mudanças no Schema do Banco de Dados (Prisma)

### 2.1 Alteração do Enum UserRole

```prisma
enum UserRole {
  SUPER_ADMIN
  ADMIN
  SUBSCRIBER_VIP
  SUBSCRIBER
  MEMBER
}
```

**Migração:**
```sql
-- Renomear ADMIN → SUPER_ADMIN para usuários existentes
UPDATE "User" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';
-- Renomear MEMBER → MEMBER (sem mudança)
```

### 2.2 Novos Campos no Model User

```prisma
model User {
  // ... campos existentes ...
  whatsapp    String?          // Número de WhatsApp
  deletedAt   DateTime?        // Soft delete (LGPD)
  deletedBy   String?          // Quem deletou (admin ou self)
}
```

### 2.3 Novo Model: Permission

```prisma
model Permission {
  id          String    @id @default(cuid())
  resource    String    // "document:slides", "document:video", "menu:planning"
  minRole     UserRole  // Nível mínimo de acesso
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([resource])
}
```

### 2.4 Novo Model: PasswordResetToken

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

### 2.5 Alteração do Model Participant

```prisma
model Participant {
  id        String   @id @default(cuid())
  sessionId String
  name      String
  email     String?
  // NOVO: Múltiplas entradas/saídas
  entries   ParticipantEntry[]
  // Campo calculado (somatório)
  totalDuration Int  // Total em segundos (soma de todas as entries)

  session Session @relation(fields: [sessionId], references: [id])
}

// NOVO MODEL
model ParticipantEntry {
  id            String   @id @default(cuid())
  participantId String
  joinTime      DateTime
  leaveTime     DateTime
  duration      Int      // Duração em segundos

  participant Participant @relation(fields: [participantId], references: [id])
}
```

### 2.6 Alteração do Model ReadingPlanDay

```prisma
model ReadingPlanDay {
  id              String   @id @default(cuid())
  planId          String
  date            DateTime
  chapters        String   // "1-5" ou "1, 3, 5"
  completed       Boolean  @default(false)
  logNote         String?
  actualChapters  String?
  // NOVOS CAMPOS
  chapterReadings ChapterReading[]

  plan ReadingPlan @relation(fields: [planId], references: [id])
  @@unique([planId, date])
}

// NOVO MODEL - Leitura parcial/completa por capítulo
model ChapterReading {
  id          String   @id @default(cuid())
  dayId       String
  chapter     Int       // Número do capítulo
  isComplete  Boolean   @default(false)
  isPartial   Boolean   @default(false)
  sessions    Int       @default(1) // Quantas sessões foram necessárias
  completedAt DateTime?

  day ReadingPlanDay @relation(fields: [dayId], references: [id])
  @@unique([dayId, chapter])
}
```

### 2.7 Alteração do Model Session

```prisma
model Session {
  id              String   @id @default(cuid())
  // ... campos existentes ...
  startTime       DateTime? // NOVO: Horário de início da reunião
  // NOVO: Referência para merge de sessões
  relatedSessionIds String[] // IDs de sessões do mesmo capítulo
}
```

### 2.8 Alteração do Model Document

```prisma
enum DocType {
  TRANSCRIPT_RAW
  TRANSCRIPT_CLEAN
  BIBLE_TEXT
  INFOGRAPHIC     // Renomear display para "Mapa Mental"
  SLIDES
  AUDIO_OVERVIEW
  AI_SUMMARY      // NOVO: Resumo gerado pela IA (baseado no arquivo de contexto)
  PLANNING        // NOVO: Material de planejamento
}
```

### 2.9 Novo Model: PlanningCard

```prisma
model PlanningCard {
  id            String   @id @default(cuid())
  planId        String
  bookName      String
  bookCode      String
  chapter       Int
  analysis      String   @db.Text // Análise do capítulo (JSON com seções)
  references    String   @db.Text // Referências bíblicas com texto (JSON)
  studyLinks    String[] // URLs de estudo
  imageUrls     String[] // URLs de imagens geradas
  themeGroup    String?  // Grupo temático (se agrupado com outros capítulos)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  plan ReadingPlan @relation(fields: [planId], references: [id])
}
```

---

## 3. Novos Endpoints de API

### 3.1 Autenticação & Perfil

```
POST   /api/auth/forgot-password      # Enviar email de redefinição
POST   /api/auth/reset-password        # Redefinir senha com token
PATCH  /api/profile/password           # Alterar senha (logado)
DELETE /api/profile/account            # Soft delete (apagar conta)
POST   /api/profile/photo              # Upload de foto (com compressão)
```

### 3.2 Permissões

```
GET    /api/admin/permissions          # Listar permissões
PATCH  /api/admin/permissions          # Atualizar permissões (batch)
```

### 3.3 Usuários (Admin)

```
PATCH  /api/admin/users/[id]           # Editar usuário (incluindo role, email)
DELETE /api/admin/users/[id]           # Desativar usuário
PATCH  /api/admin/users/[id]/role      # Alterar nível de acesso
```

### 3.4 Bíblia Interativa

```
GET    /api/bible/versions             # Listar versões (português + áudio)
GET    /api/bible/books/[versionId]    # Listar livros de uma versão
GET    /api/bible/chapters/[versionId]/[bookId]    # Listar capítulos
GET    /api/bible/content/[versionId]/[chapterId]  # Conteúdo do capítulo
GET    /api/bible/audio/[versionId]/[chapterId]    # URL do áudio
```

### 3.5 Planejamento

```
GET    /api/planning/current           # Plano ativo com cards
GET    /api/planning/cards/[planId]    # Cards de um plano
GET    /api/planning/card/[cardId]     # Detalhe de um card
POST   /api/planning/generate/[planId] # Gerar cards via IA
```

### 3.6 Busca

```
GET    /api/search?q=keyword           # Busca inteligente
```

### 3.7 Relatórios

```
GET    /api/reports/presence           # Dados de presença (com filtros)
GET    /api/reports/frequency          # Frequência semanal/mensal
GET    /api/reports/evolution          # Evolução (gráfico de linha)
GET    /api/reports/books-distribution # Distribuição por livro (pizza)
GET    /api/reports/hours              # Horas de devocional
```

### 3.8 Reading Plan (expandir existente)

```
PATCH  /api/admin/reading-plans/[id]/days/[dayId]/chapters  # Marcar capítulos
POST   /api/admin/reading-plans/[id]/retroactive            # Processamento retroativo
```

---

## 4. Arquitetura de Componentes (Novos/Modificados)

### 4.1 Novos Componentes

```
src/features/
├── bible-reader/                    # F21: Bíblia Interativa
│   ├── components/
│   │   ├── BibleBubble.tsx          # Bubble flutuante
│   │   ├── BibleModal.tsx           # Container desktop/mobile
│   │   ├── BibleHeader.tsx          # Cabeçalho com seletores
│   │   ├── VersionSelector.tsx      # Seletor customizado de versão
│   │   ├── BookSelector.tsx         # Seletor customizado de livro
│   │   ├── ChapterSelector.tsx      # Seletor customizado de capítulo
│   │   ├── BibleContent.tsx         # Área de leitura
│   │   ├── BibleNavigation.tsx      # Anterior/Próximo
│   │   ├── AudioPlayer.tsx          # Player completo
│   │   └── SpeedControl.tsx         # Controle de velocidade
│   └── lib/
│       ├── bible-api-client.ts      # Cliente API.Bible
│       ├── version-discovery.ts     # Descoberta de versões PT + áudio
│       ├── audio-manager.ts         # Gerenciamento de áudio
│       └── devocional-context.ts    # Resolver de contexto devocional
│
├── planning/                        # F20: Módulo Planejamento
│   ├── components/
│   │   ├── PlanningPage.tsx         # Página principal
│   │   ├── PlanningCard.tsx         # Card por capítulo
│   │   ├── ThemeGroup.tsx           # Agrupamento temático
│   │   └── StudyResources.tsx       # Links + imagens
│   └── lib/
│       ├── planning-generator.ts    # Geração via IA
│       ├── reference-fetcher.ts     # Buscar textos de referência
│       └── cron-scheduler.ts        # Agendamento meia-noite
│
├── search/                          # F4: Busca Inteligente
│   ├── components/
│   │   └── SmartSearch.tsx
│   └── lib/
│       └── search-engine.ts         # Full-text search
│
├── permissions/                     # F13: Permissões
│   ├── components/
│   │   └── PermissionsPanel.tsx
│   └── lib/
│       ├── permission-guard.ts      # Middleware de autorização
│       └── role-hierarchy.ts        # Hierarquia de roles
```

### 4.2 Componentes Modificados

```
src/features/
├── sessions/components/
│   ├── SessionDetail.tsx            # Redesign: layout vertical, navegação
│   ├── ParticipantLog.tsx           # NOVO: Log de entradas/saídas
│   └── ProtectedDocuments.tsx       # PDF format, nomenclatura, permissões
│
├── dashboard/components/
│   ├── DashboardCalendar.tsx        # Redesign: legendas, cores, abreviações
│   ├── ReadingBanner.tsx            # NOVO: Banner de leitura redesenhado
│   └── BooksChart.tsx              # NOVO: Gráfico de pizza
│
├── pipeline/lib/
│   ├── ai.ts                        # Adicionar Claude, remover GPT-3.5
│   ├── pipeline.ts                  # Triagem inteligente, multi-sessão
│   └── transcription-triage.ts      # NOVO: Triagem teológica
│
├── admin/components/
│   ├── AdminReadingPlan.tsx         # Redesign completo
│   ├── AdminUsers.tsx               # Redesign: busca, fotos, roles
│   ├── AdminZoom.tsx                # Fix: lógica de bloqueio, dark mode
│   └── AdminPermissions.tsx         # NOVO: Painel de permissões
│
├── email/lib/
│   ├── email.ts                     # Fix: envio funcional
│   └── templates/
│       ├── invite.html              # Template de convite
│       └── reset-password.html      # Template de redefinição

src/shared/components/
├── Sidebar.tsx                      # Redesign: largura, fontes, menus
└── ui/
    ├── CustomSelect.tsx             # NOVO: Select customizado (não padrão)
    ├── CustomCheckbox.tsx           # NOVO: Checkbox customizado
    └── CustomModal.tsx              # NOVO: Modal responsivo

src/app/(dashboard)/
├── planning/page.tsx                # NOVA ROTA
├── reports/page.tsx                 # Redesign (renomear "Progresso")
```

---

## 5. Arquitetura da Bíblia Interativa (F21)

### 5.1 Diagrama de Seções

```
┌─────────────────────────────────────────────────┐
│                SEÇÃO 1: Bubble                    │
│  [📖 Ícone] → posição: fixed, bottom-right       │
└──────────────────────┬──────────────────────────┘
                       │ click
┌──────────────────────▼──────────────────────────┐
│            SEÇÃO 2: Container                     │
│  Desktop: Modal centralizado (80vw x 85vh)        │
│  Mobile: Fullscreen com X                         │
│ ┌─────────────────────────────────────────────┐  │
│ │          SEÇÃO 3: Header                     │  │
│ │  [Romanos 11] [NVI] [🔊] [🔍] [⋯]          │  │
│ └─────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────┐  │
│ │       SEÇÃO 4: Seletores (overlay)           │  │
│ │  Versão: NVI, NAA, A21, ARC, TB             │  │
│ │  Livro: Gênesis...Apocalipse (expandível)    │  │
│ │  Capítulo: Grid de números                   │  │
│ └─────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────┐  │
│ │          SEÇÃO 5: Área de Leitura            │  │
│ │  "O remanescente de Israel"                  │  │
│ │  ¹ Pergunto, pois: acaso Deus rejeitou...    │  │
│ │  ² Deus não rejeitou o seu povo...           │  │
│ │  [scroll interno]                            │  │
│ └─────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────┐  │
│ │        SEÇÃO 6: Navegação                    │  │
│ │  [◀ Anterior]    [▶ Próximo]                 │  │
│ └─────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────┐  │
│ │          SEÇÃO 7: Player                     │  │
│ │  [⏮] [▶/⏸] [⏭]                             │  │
│ │  0:03 ━━━━━━━━━●━━━━━━━ 6:17               │  │
│ │  [2x]  [Esconder Controles]  [⏱]            │  │
│ └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

┌─ SEÇÃO 8: Resolver de Contexto Devocional ──────┐
│  Input: ReadingPlan ativo → bookId + chapter      │
│  Fallback: Gênesis 1, versão default              │
└──────────────────────────────────────────────────┘

┌─ SEÇÃO 9: Camada de API ────────────────────────┐
│  Client HTTP → API.Bible                          │
│  Headers: api-key, fums-version=3                 │
│  Funções: getBibles, getBooks, getChapters, etc.  │
└──────────────────────────────────────────────────┘
```

### 5.2 Modelo de Estados

```typescript
interface BibleReaderState {
  // UI State
  isOpen: boolean;
  isMobile: boolean;
  activeSelector: 'version' | 'book' | 'chapter' | null;

  // Content State
  currentVersion: BibleVersion | null;
  currentBook: BibleBook | null;
  currentChapter: BibleChapter | null;
  chapterContent: VerseContent[] | null;

  // Loading State
  isLoadingContent: boolean;
  isLoadingAudio: boolean;
  error: string | null;

  // Audio State
  isPlaying: boolean;
  isPaused: boolean;
  playbackSpeed: 1 | 1.25 | 1.5 | 1.75 | 2;
  currentTime: number;
  duration: number;
  autoplayEnabled: boolean;
  audioUrl: string | null;
  audioAvailable: boolean;

  // Context
  devocionalContext: DevocionalContext | null;
  isDevocionalContextResolved: boolean;
}

interface DevocionalContext {
  bookId: string;
  chapterNumber: number;
  bookName: string;
  referenceLabel: string;
  preferredBibleVersionId?: string;
}
```

### 5.3 API.Bible Integration

```typescript
// Client HTTP
const BIBLE_API_BASE = 'https://api.scripture.api.bible/v1';

// Endpoints utilizados
GET /bibles?language=por                    // Listar versões em português
GET /bibles/{bibleId}/books                 // Listar livros
GET /bibles/{bibleId}/books/{bookId}/chapters  // Listar capítulos
GET /bibles/{bibleId}/chapters/{chapterId}  // Conteúdo do capítulo
GET /bibles/{bibleId}/chapters/{chapterId}/audio  // Áudio (se disponível)

// Headers obrigatórios
{
  'api-key': process.env.BIBLE_API_KEY,
  'fums-version': '3'
}

// Filtro de versões elegíveis
interface BibleVersion {
  id: string;
  abbreviation: string;    // NVI, NAA, A21, ARC, TB
  name: string;
  language: { id: string; name: string; }
  audioAvailable: boolean;
  license: string;
}
```

---

## 6. Algoritmos Críticos

### 6.1 Deduplicação de Participantes Zoom

```typescript
function deduplicateParticipants(rawParticipants: ZoomParticipant[]): DeduplicatedParticipant[] {
  const byEmail = new Map<string, ZoomParticipant[]>();

  for (const p of rawParticipants) {
    const key = p.email?.toLowerCase() || `name:${p.name}`;
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(p);
  }

  return Array.from(byEmail.entries()).map(([key, entries]) => ({
    name: entries.reduce((a, b) => a.name.length > b.name.length ? a : b).name,
    email: entries[0].email,
    entries: entries.map(e => ({
      joinTime: e.join_time,
      leaveTime: e.leave_time,
      duration: e.duration
    })),
    totalDuration: entries.reduce((sum, e) => sum + e.duration, 0)
  }));
}
```

### 6.2 Triagem Teológica de Transcrição

```typescript
async function triageTranscription(
  rawTranscript: string,
  bibleText: string,
  theologicalBase: string
): Promise<string> {
  const prompt = `
    Você é um especialista em teologia bíblica. Analise a transcrição de um devocional
    e produza uma síntese limpa seguindo estas regras:

    1. REMOVER: nomes pessoais, referências a áudio/música, comentários irrelevantes
    2. CORRIGIR: fatos bíblicos comprovadamente errados (com referência)
    3. REMOVER: informações grotescamente falsas sem base bíblica
    4. MANTER: interpretações espirituais, experiências pessoais, dons espirituais
    5. MANTER: tudo que não se pode comprovar como errado

    TEXTO BÍBLICO DE REFERÊNCIA:
    ${bibleText}

    BASE TEOLÓGICA:
    ${theologicalBase}

    TRANSCRIÇÃO:
    ${rawTranscript}

    Produza a síntese organizada focando na essência do que foi discutido
    sobre o texto bíblico.
  `;

  return await callAI(prompt, 4000);
}
```

### 6.3 Detecção de Capítulo Multi-Sessão

```typescript
async function detectMultiSession(
  chapterRef: string,
  transcript: string
): Promise<{ isMultiSession: boolean; existingSessionId?: string }> {
  // 1. Verificar se já existe sessão para este capítulo
  const existing = await prisma.session.findFirst({
    where: { chapterRef, status: 'COMPLETED' }
  });

  // 2. Analisar transcrição para sinais de continuidade
  const continuityPatterns = [
    /continua(mos|remos)?\s+(amanhã|na\s+próxima)/i,
    /não\s+termina(mos|ram)/i,
    /próxima\s+sessão/i,
    /parte\s+\d/i
  ];

  const hasPartialSignal = continuityPatterns.some(p => p.test(transcript));

  return {
    isMultiSession: !!existing || hasPartialSignal,
    existingSessionId: existing?.id
  };
}
```

### 6.4 Plano de Leitura — Recálculo Inteligente

```typescript
function recalculateReadingPlan(
  plan: ReadingPlan,
  selectedDate: Date,
  chaptersPerDay: number,
  blockedDays: number[] // 0=domingo, 6=sábado
): ReadingPlanDay[] {
  const totalDays = Math.ceil(plan.totalChapters / chaptersPerDay);
  const days: ReadingPlanDay[] = [];
  let currentDate = new Date(selectedDate);
  let chapterIndex = 0;

  while (days.length < totalDays) {
    const dayOfWeek = currentDate.getDay();

    if (!blockedDays.includes(dayOfWeek)) {
      const startChapter = chapterIndex * chaptersPerDay + 1;
      const endChapter = Math.min(startChapter + chaptersPerDay - 1, plan.totalChapters);

      days.push({
        date: new Date(currentDate),
        chapters: startChapter === endChapter
          ? `${startChapter}`
          : `${startChapter}-${endChapter}`,
        completed: false
      });
      chapterIndex++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}
```

### 6.5 Hierarquia de Permissões

```typescript
const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  SUBSCRIBER_VIP: 60,
  SUBSCRIBER: 40,
  MEMBER: 20
};

function hasAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Middleware
async function checkPermission(resource: string, userRole: UserRole): Promise<boolean> {
  const permission = await prisma.permission.findUnique({
    where: { resource }
  });

  if (!permission) return true; // Sem restrição = público
  return hasAccess(userRole, permission.minRole);
}
```

---

## 7. Estratégia de Storage

### 7.1 Fotos de Perfil (Fix persistência)

```
/data/user-photos/{userId}/
├── original.jpg     # Upload original (max 5MB)
├── profile.jpg      # Comprimido para perfil (300x300, ~50KB)
└── thumbnail.jpg    # Miniatura para listas (64x64, ~10KB)
```

**Processo:**
1. Upload recebido (max 5MB)
2. `sharp`: redimensionar + comprimir para profile e thumbnail
3. Salvar em volume Docker persistente (`/data/user-photos/`)
4. Atualizar `user.photoUrl` com path relativo
5. Servir via `/api/profile/photo/{userId}?size=profile|thumbnail`

### 7.2 Documentos da Sessão (Mudanças)

```
/data/sessions/{sessionId}/
├── {Livro} {Cap} (NVI).pdf          # Texto bíblico (era .txt)
├── {Livro} {Cap} - Slides.pdf       # Slides
├── {Livro} {Cap} - Mapa Mental.pdf  # Infográfico (renomeado)
├── {Livro} {Cap} - Video Resumo.mp4 # Vídeo
├── {Livro} {Cap} - Resumo IA.pdf    # NOVO: resumo gerado
└── knowledge-base.md                 # Base de conhecimento (interno)
```

**Nomenclatura para multi-sessão:**
```
├── Romanos 11 - Parte 1 - Slides.pdf
├── Romanos 11 - Parte 2 - Slides.pdf
├── Romanos 11 - Cap Completo - Slides.pdf
```

---

## 8. Templates de Email

### 8.1 Convite

```html
<!-- Layout responsivo, max-width 600px -->
<!-- Cores: bg #0c0c0e, accent #f5a623, text #f0f0f0 -->
<!-- Logo DevocionalHub no topo -->
<!-- Mensagem: "Olá {nome}, você foi convidado para o DevocionalHub!" -->
<!-- Botão: "Aceitar Convite" → {baseUrl}/invite/{token} -->
<!-- Footer: "Este convite expira em 7 dias" -->
```

### 8.2 Redefinição de Senha

```html
<!-- Mesmo layout -->
<!-- Mensagem: "Você solicitou a redefinição da sua senha" -->
<!-- Botão: "Redefinir Senha" → {baseUrl}/reset-password/{token} -->
<!-- Footer: "Se você não solicitou, ignore este email" -->
<!-- Expira em 1 hora -->
```

---

## 9. Configuração de IA (Cascata Atualizada)

```typescript
// Ordem de prioridade (atualizada)
const AI_PROVIDERS = [
  {
    name: 'Claude (Assinatura Max)',
    enabled: () => !!process.env.ANTHROPIC_API_KEY,
    models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
    defaultModel: 'claude-sonnet-4-6',
    priority: 1
  },
  {
    name: 'OpenAI',
    enabled: () => !!process.env.OPENAI_API_KEY,
    models: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o4-mini', 'o3', 'o3-mini'],
    // REMOVIDO: gpt-3.5-turbo
    defaultModel: 'gpt-4.1-mini',
    priority: 2
  },
  {
    name: 'OpenRouter (Gratuito)',
    enabled: () => !!process.env.OPENROUTER_API_KEY,
    models: ['nvidia/nemotron-3-super-120b-a12b:free'],
    priority: 3
  },
  {
    name: 'Gemini (Gratuito)',
    enabled: () => !!process.env.GEMINI_API_KEY,
    models: ['gemini-2.5-flash'],
    priority: 4
  }
];
```

---

## 10. Cron Jobs

### 10.1 Geração de Planejamento (F20)

```
Trigger: 00:00 (meia-noite) do dia de início de um ReadingPlan
Action: Gerar PlanningCards para todos os capítulos do plano
Processo:
  1. Verificar se há plano com startDate = hoje
  2. Se sim: carregar texto bíblico + pesquisa teológica
  3. Gerar cards por capítulo via IA
  4. Salvar PlanningCard no banco
```

### 10.2 Adição Automática de Ano (F11)

```
Trigger: 1o de dezembro de cada ano
Action: Verificar se o próximo ano está disponível nos filtros
Processo: Automático via lógica no frontend (sem cron)
```

---

## 11. Segurança

### 11.1 LGPD Compliance (F10)

- Soft delete: manter apenas dados mínimos (email, nome, igreja, WhatsApp)
- Remover: senha, foto, dados de sessão vinculados
- Reter dados por período legal antes de hard delete
- Log de quem e quando deletou

### 11.2 Permissões

- Middleware em TODOS os endpoints para verificar role
- Hierarquia numérica: SUPER_ADMIN(100) > ADMIN(80) > SUBSCRIBER_VIP(60) > SUBSCRIBER(40) > MEMBER(20)
- Permissões de recursos configuráveis pelo admin

### 11.3 Upload de Arquivos

- Limite: 5MB para fotos de perfil
- Validação de tipo MIME
- Compressão via `sharp` antes de persistir
- Sanitização de nomes de arquivo

---

## 12. Performance

### 12.1 Cache

- Versões da Bíblia: cache em memória (muda raramente)
- Conteúdo bíblico: cache no lado do servidor (24h TTL)
- Planos de leitura: cache por sessão do usuário

### 12.2 Otimizações

- Lazy loading da Bíblia Interativa (code splitting)
- Skeleton loading para cards e gráficos
- Paginação para lista de participantes
- Debounce na busca inteligente (300ms)
- Compressão de imagens no upload

---

## 13. Testes Necessários

### 13.1 Unitários

- Deduplicação de participantes
- Hierarquia de permissões
- Recálculo de plano de leitura
- Detecção de multi-sessão
- Triagem teológica (mock IA)

### 13.2 Integração

- Fluxo completo de email (convite + redefinição)
- API.Bible: descoberta de versões
- Pipeline com triagem + multi-sessão
- Upload + compressão de foto

### 13.3 E2E (se viável)

- Login → Dashboard → Bíblia → Leitura → Áudio
- Admin → Criar Plano → Checklist → Relatório
- Criar Usuário → Convite → Aceitar → Login
