"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [tokenError, setTokenError] = useState("");

  useEffect(() => {
    params.then(async (p) => {
      setToken(p.token);
      // Validar token antes de mostrar o formulário
      try {
        const res = await fetch(`/api/auth/validate-reset-token?token=${p.token}`);
        if (res.ok) {
          const data = await res.json();
          setUserName(data.name || "");
          setWhatsapp(data.whatsapp || "");
          setLoading(false);
        } else {
          setTokenError("Este link de redefinição é inválido ou expirou.");
          setLoading(false);
        }
      } catch {
        // Se o endpoint de validação não existir, mostrar o formulário mesmo assim
        setLoading(false);
      }
    });
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, whatsapp: whatsapp.trim() || undefined }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao redefinir senha");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-bg login-container">
        <p style={{ color: "var(--text-muted)" }}>Verificando link de redefinição...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="page-bg login-container">
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(220,38,38,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg style={{ width: 28, height: 28, color: "var(--error)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 style={{ color: "var(--text)", marginBottom: 8, fontSize: 20 }}>Link expirado</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{tokenError}</p>
          <button
            onClick={() => router.push("/login")}
            className="btn-primary"
            style={{ marginTop: 24, padding: "10px 24px" }}
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-bg login-container">
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg style={{ width: 28, height: 28, color: "#22c55e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 style={{ color: "var(--text)", marginBottom: 8, fontSize: 20 }}>Senha redefinida!</h2>
          <p style={{ color: "var(--text-muted)", marginTop: 12 }}>Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg login-container">
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="logo-icon" style={{ margin: "0 auto 14px", width: 52, height: 52, borderRadius: 14 }}>
            <svg style={{ width: 24, height: 24, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Redefinir Senha</h1>
          {userName && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
              Olá, {userName}! Crie uma nova senha para sua conta.
            </p>
          )}
        </div>

        {/* Card */}
        <div className="login-card">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="password" className="label">Nova Senha</label>
              <input
                id="password"
                type="password"
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="label">Confirmar Senha</label>
              <input
                id="confirmPassword"
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="whatsapp" className="label">WhatsApp</label>
              <input
                id="whatsapp"
                type="tel"
                className="input-field"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
              />
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Confirme ou atualize seu WhatsApp (opcional).
              </p>
            </div>

            {error && (
              <div className="alert-error" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--error)" }}>
                <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary" style={{ width: "100%", padding: "12px 16px", fontSize: 15, borderRadius: 10 }}>
              {submitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Redefinindo...
                </span>
              ) : "Redefinir Senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
