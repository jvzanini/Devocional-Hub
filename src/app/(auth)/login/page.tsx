"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Formulário inline "Esqueci minha senha"
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) { setError("Email ou senha incorretos"); setLoading(false); return; }
    router.push("/");
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      if (res.ok) {
        setForgotMessage("Se este email estiver cadastrado, você receberá um link de redefinição.");
      } else {
        const data = await res.json();
        setForgotError(data.error || "Erro ao enviar email");
      }
    } catch {
      setForgotError("Erro de conexão. Tente novamente.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="page-bg login-container">
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="logo-icon" style={{ margin: "0 auto 16px", width: 56, height: 56 }}>
            <svg style={{ width: 30, height: 30, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Devocional Hub</h1>
          <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 6 }}>Sua plataforma de devocionais inteligentes</p>
        </div>

        {/* Card — transição entre Login e Esqueci Senha */}
        <div className="login-card">
          {!showForgot ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoFocus autoComplete="username" className="input-field" placeholder="joao@email.com" />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label htmlFor="password" className="label" style={{ marginBottom: 0 }}>Senha</label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotMessage(""); setForgotError(""); }}
                    style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500, cursor: "pointer", background: "none", border: "none", padding: 0 }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password" className="input-field" placeholder="••••••••" />
              </div>
              {error && (
                <div className="alert-error" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--error)" }}>
                  <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "12px 16px", fontSize: 15, borderRadius: 10 }}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : "Entrar na plataforma"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>Redefinir Senha</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                  Informe seu email e enviaremos um link para redefinir sua senha.
                </p>
              </div>
              <div>
                <label htmlFor="forgotEmail" className="label">Email</label>
                <input
                  id="forgotEmail"
                  type="email"
                  className="input-field"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoFocus
                />
              </div>
              {forgotMessage && (
                <div style={{ fontSize: 13, color: "#22c55e", padding: "10px 14px", backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 8 }}>
                  {forgotMessage}
                </div>
              )}
              {forgotError && (
                <div className="alert-error" style={{ fontSize: 13, color: "var(--error)" }}>
                  {forgotError}
                </div>
              )}
              <button
                type="submit"
                disabled={forgotLoading}
                className="btn-primary"
                style={{ width: "100%", padding: "12px 16px", fontSize: 15, borderRadius: 10 }}
              >
                {forgotLoading ? "Enviando..." : "Enviar Link de Redefinição"}
              </button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500, cursor: "pointer", background: "none", border: "none", padding: "4px 0", textAlign: "center" }}
              >
                Voltar ao login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
