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
