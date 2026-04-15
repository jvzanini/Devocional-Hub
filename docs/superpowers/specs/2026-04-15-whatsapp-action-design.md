# WhatsApp Action para Usuários em Risco — Design Spec

**Data:** 2026-04-15
**Autor:** Claude (modo autônomo)
**Status:** Draft
**Escopo:** Na tabela "Usuários em Risco" da aba Engajamento, transformar a coluna WhatsApp em link clicável que abre WhatsApp Web com mensagem pastoral pré-preenchida baseada no `level` (Atenção/Adormecido/Perdido). Zero backend.

---

## 1. Objetivo

Reduzir fricção pastoral: admin vê usuário "Adormecido" → um clique abre WhatsApp com mensagem contextual ("Oi {nome}, sentimos sua falta no devocional...") já pronta para revisar e enviar. Admin controla cada envio (nunca automatizado).

## 2. Não-Objetivos

- Não envia automaticamente (sempre abre UI do WhatsApp).
- Não usa API oficial do WhatsApp (que exige business account + aprovação).
- Não cria tabela de "convites enviados" (V2).
- Não altera backend/endpoints/schema.

## 3. Abordagem técnica

WhatsApp aceita URL scheme oficial:
```
https://wa.me/<NUMERO>?text=<MENSAGEM_URLENCODED>
```

- `<NUMERO>`: só dígitos, com código do país (ex: `5511999998888`).
- `<MENSAGEM_URLENCODED>`: texto pré-preenchido, em URL encoding.

Admin clica → abre WhatsApp Web / app em nova aba → mensagem sugerida aparece → admin pode editar antes de enviar.

## 4. Funcionalidades (V1)

### 4.1 Link clicável na tabela "Em Risco"

Na célula `<td>` da coluna WhatsApp:
- Se `whatsapp` está presente e é válido (pelo menos 10 dígitos após normalização): `<a>` link.
- Caso contrário: mostra `—` como hoje.

Link abre em nova aba (`target="_blank" rel="noopener noreferrer"`) com mensagem contextual por nível.

### 4.2 Templates de mensagem

Função pura `buildWhatsAppMessage({ name, level })` retorna string:

**attention** ("Atenção" — 7-30 dias):
```
Olá {primeiroNome}! 😊 Aqui é do grupo devocional. Notei que você não pôde estar conosco nos últimos encontros. Como você está? Conta se podemos te ajudar em algo. Esperamos você no próximo!
```

**dormant** ("Adormecido" — 30-90 dias):
```
Oi {primeiroNome}, tudo bem? 🌱 Faz um tempinho que não te vejo no devocional e queria saber como você está. Se houver algo que possamos caminhar juntos, estamos aqui. Sentimos sua falta!
```

**lost** ("Perdido" — 90+ dias):
```
{primeiroNome}, oi! Vi que faz um tempo desde a última vez que você participou do devocional. Espero que esteja tudo bem com você e sua família. Seria uma alegria te ver de volta — sem cobrança, só com carinho. Como posso ajudar? 🙏
```

Extração de primeiro nome: `name.trim().split(/\s+/)[0] || "amigo(a)"` — fallback quando `name` é vazio ou só whitespace.

### 4.3 Normalização de número

Função pura `normalizeWhatsApp(raw)` — **ordem das checagens importa**:

1. Remove tudo que não é dígito.
2. Se começa com "55" E tem 12 ou 13 dígitos → retorna como está.
3. Se NÃO começa com "55" E tem 10 ou 11 dígitos → prefixa "55".
4. Todos os outros casos (incluindo 12/13 dígitos sem prefixo 55, < 10 dígitos, string vazia/null/undefined) → retorna `null`.

Resultado: string só-dígitos (ex: `5511999998888`) ou `null`. V1 é pt-BR apenas; números estrangeiros retornam `null` (admin vê o número cru sem link).

## 5. Arquitetura

### 5.1 Util puro: `src/features/engagement/lib/whatsapp.ts`

```ts
export function normalizeWhatsApp(raw: string | null | undefined): string | null;
export function buildWhatsAppMessage(params: { name: string; level: RiskLevel }): string;
export function buildWhatsAppUrl(phoneRaw: string, message: string): string | null;
// Retorna url ou null se phoneRaw normaliza pra null.
```

### 5.2 UI: modificação na célula da tabela "Em Risco"

Em `src/app/(dashboard)/admin/page.tsx`, dentro do `EngagementTab`, substituir:
```tsx
<td>{a.whatsapp ?? "—"}</td>
```
por:
```tsx
<td>
  {(() => {
    const url = a.whatsapp ? buildWhatsAppUrl(a.whatsapp, buildWhatsAppMessage({ name: a.name, level: a.level })) : null;
    if (!url) return a.whatsapp ?? "—";
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }} title="Abrir WhatsApp com mensagem pastoral">
        {a.whatsapp} ↗
      </a>
    );
  })()}
</td>
```

## 6. Classes CSS

Zero CSS nova. Apenas inline `var(--accent)` para cor do link.

## 7. Segurança e privacidade

- O link `wa.me` é público e não exige autenticação — qualquer pessoa com o número pode enviar mensagem. Admin já tem acesso ao número hoje; não há nova exposição.
- `target="_blank" rel="noopener noreferrer"` previne `window.opener` hijack.
- A mensagem é montada **client-side** a partir de dados já carregados; nada novo é enviado ao backend.
- Admin revê e edita a mensagem antes de enviar — controle humano total.

## 8. Testes

### 8.1 Unit (Vitest)

`src/features/engagement/lib/__tests__/whatsapp.test.ts`:
- `normalizeWhatsApp("(11) 99999-8888")` → `"5511999998888"` (11 dígitos → prefixa 55).
- `normalizeWhatsApp("+55 11 99999-8888")` → `"5511999998888"`.
- `normalizeWhatsApp("11 9999-8888")` → `"551199998888"` (10 dígitos → prefixa 55).
- `normalizeWhatsApp("551199998888")` → `"551199998888"` (12 dígitos com prefixo 55 → mantém).
- `normalizeWhatsApp("999999999999")` → `null` (12 dígitos sem prefixo 55 → inválido).
- `normalizeWhatsApp("abc")` → `null`.
- `normalizeWhatsApp(null)` → `null`.
- `normalizeWhatsApp("")` → `null`.
- `buildWhatsAppMessage({name: "João da Silva", level: "attention"})` contém `"João"` (primeiro nome) e não contém placeholder `{primeiroNome}`.
- `buildWhatsAppMessage` retorna mensagem diferente para cada level.
- `buildWhatsAppUrl("+55 11 99999-8888", "Oi")` → `"https://wa.me/5511999998888?text=Oi"`.
- `buildWhatsAppUrl` faz URL encoding correto (quebra de linha → `%0A`, espaço → `%20`, acento: `João` → `Jo%C3%A3o`).
- `buildWhatsAppUrl("abc", "msg")` → `null` (número inválido).

### 8.2 E2E (Playwright)

Opcional: tempo de verificar link `href` começa com `https://wa.me/` na tabela Em Risco. Não clicar (abriria WhatsApp real).

## 9. Rollback

Zero schema. Revert commits.

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Número em formato estrangeiro sem código de país | Assume Brasil (+55); documentar que outros países retornam `null`. V2 pode ter heurística melhor. |
| Mensagem muito longa truncada pelo WhatsApp | WhatsApp aceita até ~65k chars via URL; templates têm <300. OK. |
| Admin esquece de editar e envia `{primeiroNome}` literal | `buildWhatsAppMessage` garante que o placeholder sempre é substituído. |
| iOS não abrir `wa.me` corretamente | `wa.me` é o domínio oficial e funciona em iOS/Android/desktop. |

## 11. Futuro

- V2: tabela de logs de convites enviados (requer cliques rastreados via endpoint).
- V2: permitir editar template no painel admin.
- V2: templates em outros idiomas.
