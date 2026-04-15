# WhatsApp Action — Implementation Plan

> **REQUIRED SUB-SKILL:** `superpowers:subagent-driven-development`. Zero CSS novo.

**Goal:** Link WhatsApp com mensagem pastoral contextual na coluna WhatsApp da tabela "Usuários em Risco".

**Spec:** `docs/superpowers/specs/2026-04-15-whatsapp-action-design.md`

---

## Task 1: Util puro `whatsapp.ts` + TDD

**Files:**
- Create: `src/features/engagement/lib/whatsapp.ts`
- Create: `src/features/engagement/lib/__tests__/whatsapp.test.ts`

- [ ] **Step 1 (TDD):** Criar testes em `src/features/engagement/lib/__tests__/whatsapp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeWhatsApp, buildWhatsAppMessage, buildWhatsAppUrl } from "../whatsapp";

describe("normalizeWhatsApp", () => {
  it("(11) 99999-8888 → 5511999998888", () => {
    expect(normalizeWhatsApp("(11) 99999-8888")).toBe("5511999998888");
  });
  it("+55 11 99999-8888 → 5511999998888", () => {
    expect(normalizeWhatsApp("+55 11 99999-8888")).toBe("5511999998888");
  });
  it("11 9999-8888 (10 dígitos) → 551199998888", () => {
    expect(normalizeWhatsApp("11 9999-8888")).toBe("551199998888");
  });
  it("551199998888 (12 dígitos com 55) → mantém", () => {
    expect(normalizeWhatsApp("551199998888")).toBe("551199998888");
  });
  it("999999999999 (12 dígitos sem 55) → null", () => {
    expect(normalizeWhatsApp("999999999999")).toBeNull();
  });
  it("abc → null", () => {
    expect(normalizeWhatsApp("abc")).toBeNull();
  });
  it("null/undefined/vazio → null", () => {
    expect(normalizeWhatsApp(null)).toBeNull();
    expect(normalizeWhatsApp(undefined)).toBeNull();
    expect(normalizeWhatsApp("")).toBeNull();
  });
});

describe("buildWhatsAppMessage", () => {
  it("contém primeiro nome, sem placeholder literal", () => {
    const msg = buildWhatsAppMessage({ name: "João da Silva", level: "attention" });
    expect(msg).toContain("João");
    expect(msg).not.toContain("{primeiroNome}");
  });
  it("diferente para cada level", () => {
    const a = buildWhatsAppMessage({ name: "A", level: "attention" });
    const d = buildWhatsAppMessage({ name: "A", level: "dormant" });
    const l = buildWhatsAppMessage({ name: "A", level: "lost" });
    expect(a).not.toBe(d);
    expect(d).not.toBe(l);
    expect(a).not.toBe(l);
  });
  it("fallback amigo(a) quando name vazio", () => {
    const msg = buildWhatsAppMessage({ name: "  ", level: "attention" });
    expect(msg).toContain("amigo(a)");
  });
});

describe("buildWhatsAppUrl", () => {
  it("monta URL com wa.me e text", () => {
    const url = buildWhatsAppUrl("+55 11 99999-8888", "Oi");
    expect(url).toBe("https://wa.me/5511999998888?text=Oi");
  });
  it("encoda acentos e espaços", () => {
    const url = buildWhatsAppUrl("11999998888", "Olá João");
    expect(url).toContain("Ol%C3%A1%20Jo%C3%A3o");
  });
  it("número inválido → null", () => {
    expect(buildWhatsAppUrl("abc", "msg")).toBeNull();
  });
});
```

- [ ] **Step 2:** Rodar — deve falhar: `npx vitest run src/features/engagement/lib/__tests__/whatsapp.test.ts`

- [ ] **Step 3:** Criar `src/features/engagement/lib/whatsapp.ts`:

```ts
import type { RiskLevel } from "./admin-insights";

export function normalizeWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return "55" + digits;
  }
  return null;
}

const TEMPLATES: Record<RiskLevel, (firstName: string) => string> = {
  attention: (n) => `Olá ${n}! 😊 Aqui é do grupo devocional. Notei que você não pôde estar conosco nos últimos encontros. Como você está? Conta se podemos te ajudar em algo. Esperamos você no próximo!`,
  dormant: (n) => `Oi ${n}, tudo bem? 🌱 Faz um tempinho que não te vejo no devocional e queria saber como você está. Se houver algo que possamos caminhar juntos, estamos aqui. Sentimos sua falta!`,
  lost: (n) => `${n}, oi! Vi que faz um tempo desde a última vez que você participou do devocional. Espero que esteja tudo bem com você e sua família. Seria uma alegria te ver de volta — sem cobrança, só com carinho. Como posso ajudar? 🙏`,
};

export function buildWhatsAppMessage(params: { name: string; level: RiskLevel }): string {
  const firstName = params.name.trim().split(/\s+/)[0] || "amigo(a)";
  return TEMPLATES[params.level](firstName);
}

export function buildWhatsAppUrl(phoneRaw: string | null | undefined, message: string): string | null {
  const phone = normalizeWhatsApp(phoneRaw);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 4:** Rodar testes — 13 passed.

- [ ] **Step 5:** `npm run test:unit` → 64+ passed.

- [ ] **Step 6:** `npx tsc --noEmit` limpo.

- [ ] **Step 7:** Commit:
```bash
git add src/features/engagement/lib/whatsapp.ts src/features/engagement/lib/__tests__/whatsapp.test.ts
git commit -m "feat(engagement): util whatsapp (normalize + templates + URL builder)"
```

---

## Task 2: Integrar link na tabela "Em Risco"

**File:** Modify `src/app/(dashboard)/admin/page.tsx`

- [ ] **Step 1:** Adicionar imports:
```ts
import { buildWhatsAppUrl, buildWhatsAppMessage } from "@/features/engagement/lib/whatsapp";
```

- [ ] **Step 2:** Localizar no `EngagementTab` a linha `<td>{a.whatsapp ?? "—"}</td>` (dentro do `.map` dos usuários em risco) e substituir por:

```tsx
<td>
  {(() => {
    if (!a.whatsapp) return "—";
    const url = buildWhatsAppUrl(a.whatsapp, buildWhatsAppMessage({ name: a.name, level: a.level }));
    if (!url) return a.whatsapp;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
        title="Abrir WhatsApp com mensagem pastoral"
      >
        {a.whatsapp} ↗
      </a>
    );
  })()}
</td>
```

- [ ] **Step 3:** `git diff --name-only HEAD` → só `admin/page.tsx`.

- [ ] **Step 4:** `npx tsc --noEmit` limpo.

- [ ] **Step 5:** Commit:
```bash
git add "src/app/(dashboard)/admin/page.tsx"
git commit -m "feat(admin): link WhatsApp pastoral na tabela Em Risco"
```

---

## Task 3: Validação

- `npm run test:unit` → 64+ passed
- `npx tsc --noEmit` limpo
- `git diff <sha-pre-feature> HEAD -- src/app/globals.css` vazio

---

## Commits esperados

1. `feat(engagement): util whatsapp (normalize + templates + URL builder)`
2. `feat(admin): link WhatsApp pastoral na tabela Em Risco`

Total: 2 commits.
