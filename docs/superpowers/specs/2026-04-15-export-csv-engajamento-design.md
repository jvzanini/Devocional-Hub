# Export CSV — Engajamento Admin — Design Spec

**Data:** 2026-04-15
**Autor:** Claude (modo autônomo)
**Status:** Draft
**Escopo:** Permitir ao admin exportar as tabelas "Top Streaks" e "Usuários em Risco" (já presentes na aba Engajamento) como arquivos CSV, para uso offline / planilhas.

---

## 1. Objetivo

Entregar ao admin/super_admin a capacidade de baixar em CSV as listas que hoje só podem ser lidas no painel. Caso de uso pastoral: admin quer imprimir, ordenar no Excel, compartilhar com co-líderes, armazenar histórico mensal.

## 2. Não-Objetivos

- Não exportar dados individuais fora das listas já visíveis (sem campos novos).
- Não criar relatórios agendados nem enviar por email (V2+).
- Não suportar formatos alternativos (XLSX, PDF) — só CSV UTF-8.
- Não adicionar filtros/range custom (V1 usa o mesmo `computeAdminInsights` já exibido).

## 3. Contexto e Reaproveitamento

- Endpoint `/api/admin/engagement/insights` retorna `AdminInsights` com `topStreaks`, `atRisk`, `distribution`.
- Client `EngagementTab` já consome. Vamos apenas adicionar botões "Baixar CSV" próximos às tabelas.
- Util puro novo `insightsToCsv` converte `AdminInsights` em strings CSV.

## 4. Funcionalidades (V1)

### 4.1 Botões "Baixar CSV"

3 botões, 1 em cada seção:
- **Top Streaks:** `.btn-outline` no canto superior direito do card da tabela. Download gera `devocional-top-streaks-YYYY-MM-DD.csv`.
- **Usuários em Risco:** idem, gera `devocional-em-risco-YYYY-MM-DD.csv`.
- **Distribuição de Conquistas:** idem, gera `devocional-conquistas-YYYY-MM-DD.csv`.

Posicionamento: ao lado do título da seção, alinhado à direita, via flex space-between (padrão já usado no header de "Em Risco" com contagem truncada).

### 4.2 Conteúdo dos CSVs

**Top Streaks** (colunas):
```
Nome,Igreja,Equipe,Streak Atual,Melhor Streak,Total de Presenças,Última Presença
```

**Usuários em Risco**:
```
Nível,Nome,Igreja,Equipe,Melhor Streak,Última Presença,WhatsApp
```
Onde `Nível` é pt-BR ("Atenção"/"Adormecido"/"Perdido"). **Ação de refactor preliminar:** hoje `LEVEL_LABEL` está inline em `admin/page.tsx`. Mover para `src/features/engagement/lib/risk-labels.ts` como export nomeado e importar em ambos (`admin/page.tsx` e `csv-export.ts`). Evita duplicação de strings pt-BR.

**Distribuição de Conquistas**:
```
Conquista,Descrição,Usuários,Percentual
```
Percentual formatado como `75%` (inteiro): `Math.round(Math.min(pct, 1) * 100) + "%"`. Clamp obrigatório pois `admin-insights` pode devolver `pct > 1` se conquistas históricas superam `activeCommunity` atual.

### 4.3 Formato CSV

- **Encoding:** UTF-8 com BOM `\uFEFF` prefixado ao conteúdo. `downloadCsv` aplica o BOM internamente (`blob = new Blob(["\uFEFF" + content], ...)`) — garante consistência.
- Separador `,` (vírgula). Terminador `\r\n`.
- **Escape RFC 4180:** campos contendo vírgula, aspas duplas ou quebra de linha são envolvidos em aspas duplas; aspas internas duplicadas.
- **Datas:** valores `Date` devem ser formatados via `toBrazilDate()` ANTES de chegar em `escapeCsvField`. Nunca passar `Date` cru ao escape. Se `Date | null`, null vira string vazia.

### 4.3.1 CSV Injection Protection (OBRIGATÓRIO — segurança)

Campos de texto vindos do banco (`name`, `church`, `team`, `whatsapp`) podem começar com caracteres que Excel/Google Sheets interpretam como fórmula executável (`=1+1`, `+CMD()`, `-2+3`, `@SUM(...)`). Isso é vetor de ataque clássico (Formula Injection / CSV injection).

**Mitigação em `escapeCsvField`:** se o primeiro char do valor for um de `=`, `+`, `-`, `@`, `\t`, `\r`, prefixar o campo com aspa simples (`'`) antes da avaliação RFC 4180. Ex: `=SUM(A:A)` vira `'=SUM(A:A)`. Como `'` isolado não aciona envolver em aspas (RFC 4180 só exige aspas para `,`, `"`, `\r`, `\n`), o resultado final é `'=SUM(A:A)` sem aspas. Se houver vírgula no campo (`=A,B` → `'=A,B` → envolve: `"'=A,B"`), aspas são aplicadas normalmente. Planilhas exibem o apóstrofo como literal ou omitem silenciosamente, mas jamais executam.

### 4.3.2 WhatsApp/números

Colunas como `whatsapp` (`+5511...`) podem sofrer mesma interpretação (`+` no início). A regra de §4.3.1 já resolve — prefixa com `'`.

### 4.4 Gatilho de download

Download 100% client-side a partir dos dados JÁ carregados pelo `EngagementTab` — sem novo request à API. Usa `Blob` + `URL.createObjectURL` + `<a download>`.

**Nome do arquivo:** data atual em TZ America/Sao_Paulo via `toBrazilDate` (já existe em `time-utils.ts`).

## 5. Arquitetura

### 5.1 Util puro: `src/features/engagement/lib/csv-export.ts`

```ts
export function toCsv(headers: string[], rows: (string | number)[][]): string;
export function escapeCsvField(value: unknown): string;
export function downloadCsv(content: string, filename: string): void;

// High-level builders (formatam colunas):
export function buildTopStreaksCsv(rows: TopStreakRow[]): string;
export function buildAtRiskCsv(rows: AtRiskRow[]): string;
export function buildDistributionCsv(rows: DistributionRow[]): string;
```

- `toCsv`/`escapeCsvField` são puros e testáveis.
- `downloadCsv` é o único com side-effect (DOM) — não testável unit, mas trivial e isolado. Pode ser testado via E2E.

### 5.2 UI: integração em `EngagementTab`

Adicionar 3 botões, cada um chamando o builder correspondente + `downloadCsv`. Ex:

```tsx
<button
  className="btn-outline"
  onClick={() => {
    const csv = buildTopStreaksCsv(data.topStreaks);
    downloadCsv(csv, `devocional-top-streaks-${toBrazilDate(new Date())}.csv`);
  }}
  style={{ padding: "4px 12px", fontSize: 13 }}
>
  Baixar CSV
</button>
```

## 6. Classes CSS

Zero classe nova. Reusa `.btn-outline` (já presente em `globals.css`).

## 7. Segurança

- Exportação é puramente client-side sobre dados já autorizados pelo endpoint `/api/admin/engagement/insights` (que exige `requireRole("ADMIN")`).
- Não adiciona superfície de ataque.
- LGPD: dados exportados são os mesmos já visíveis na tela; nenhum novo campo sensível.

## 8. Testes

### 8.1 Unit (Vitest)

`src/features/engagement/lib/__tests__/csv-export.test.ts`:
- `escapeCsvField` com string simples → sem aspas.
- `escapeCsvField` com vírgula → envolve em aspas.
- `escapeCsvField` com aspas → envolve em aspas e duplica aspas internas.
- `escapeCsvField` com quebra de linha (`\n`) → envolve em aspas.
- `escapeCsvField` com null/undefined → string vazia.
- **CSV injection**: `escapeCsvField("=SUM(A:A)")` → `"'=SUM(A:A)"` (apóstrofo prefixado; sem aspas pois não tem `,"\r\n`).
- **CSV injection**: `escapeCsvField("+5511999998888")` → `"'+5511999998888"`.
- **CSV injection**: `escapeCsvField("@hack()")` e `escapeCsvField("-2+3")` idem.
- **CSV injection + vírgula** (combina prefix + aspas): `escapeCsvField("=A,B")` → `'"\'=A,B"'`.
- `toCsv` produz cabeçalho + linhas separadas por `\r\n`.
- `buildTopStreaksCsv` produz header correto + 1 linha por streak.
- `buildTopStreaksCsv` formata `lastAttendedAt` como `YYYY-MM-DD` em TZ Brasil via `toBrazilDate` — ou string vazia se null.
- `buildAtRiskCsv` usa label pt-BR ("Atenção"/"Adormecido"/"Perdido") e formato de data.
- `buildDistributionCsv` clampa pct em 100% antes de formatar (ex: pct=1.5 → "100%").

Mínimo 13 casos.

### 8.2 E2E (Playwright)

`tests/e2e/engagement-csv-export.spec.ts`:
- Login admin → abre aba Engajamento → clica "Baixar CSV" de Top Streaks → valida que download foi disparado (`page.waitForEvent("download")`).
- Verifica que o filename contém "top-streaks" e a data.

## 9. Rollback

- Zero mudança de schema. Rollback = reverter commits.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Excel exibe acentos como `Ã§` | BOM `\uFEFF` no início do arquivo. |
| Quebra de linha em nome | `escapeCsvField` envolve em aspas. |
| Nome de arquivo inválido em Windows | Nomes usam apenas `a-z0-9-` — seguro. |
| Download bloqueado em algum browser | `<a download>` é pattern universal; aceitar fallback nativo do navegador. |

## 11. Futuro

- V2: Filtros de data customizados.
- V2: Export XLSX via biblioteca `xlsx` (adicionar dep).
- V2: Relatório agendado por email (liga com futura feature de email).
- V2: Export da aba "Usuários" global (inclui dados não-engajamento).
