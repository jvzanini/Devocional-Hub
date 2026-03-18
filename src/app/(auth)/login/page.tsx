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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) { setError("Email ou senha incorretos"); setLoading(false); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="page-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div className="logo-icon" style={{ margin: "0 auto 16px" }}>
            <svg style={{ width: 28, height: 28, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1c1917" }}>DevocionalHub</h1>
          <p style={{ fontSize: 14, color: "#a8a29e", marginTop: 4 }}>Acesse sua conta para continuar</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus autoComplete="email" className="input-field" placeholder="seu@email.com" />
            </div>
            <div>
              <label htmlFor="password" className="label">Senha</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password" className="input-field" placeholder="••••••••" />
            </div>
            {error && (
              <div className="alert-error" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#dc2626" }}>
                <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px 16px" }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entrando...
                </span>
              ) : "Entrar"}
            </button>
          </form>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#a8a29e", marginTop: 24 }}>DevocionalHub</p>
      </div>
    </div>
  );
}
