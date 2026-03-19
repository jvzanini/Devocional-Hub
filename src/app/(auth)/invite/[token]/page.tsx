"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [zoomIdentifier, setZoomIdentifier] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    params.then(async (p) => {
      setToken(p.token);
      const res = await fetch(`/api/invite/${p.token}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setEmail(data.email);
        setLoading(false);
      } else {
        const data = await res.json();
        setError(data.error || "Convite inválido");
        setLoading(false);
      }
    });
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Senha deve ter no mínimo 6 caracteres"); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem"); return; }
    if (!zoomIdentifier.trim()) { setError("O email/username do Zoom é obrigatório"); return; }

    setLoading(true);
    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, zoomIdentifier: zoomIdentifier.trim(), zoomType: "EMAIL" }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao definir senha");
      setLoading(false);
    }
  }

  if (loading && !error) {
    return (
      <div className="page-bg login-container">
        <p style={{ color: "#78716c" }}>Verificando convite...</p>
      </div>
    );
  }

  if (error && !name) {
    return (
      <div className="page-bg login-container">
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg style={{ width: 28, height: 28, color: "#dc2626" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 style={{ color: "#1c1917", marginBottom: 8, fontSize: 20 }}>{error}</h2>
          <p style={{ color: "#78716c", fontSize: 14 }}>Entre em contato com o administrador para um novo convite.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-bg login-container">
        <div style={{ textAlign: "center" }}>
          <span className="badge badge-success" style={{ fontSize: 15, padding: "8px 18px", marginBottom: 16 }}>Conta ativada!</span>
          <p style={{ color: "#78716c", marginTop: 12 }}>Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg login-container">
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="logo-icon" style={{ margin: "0 auto 14px", width: 52, height: 52, borderRadius: 14 }}>
            <svg style={{ width: 24, height: 24, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1c1917" }}>Bem-vindo(a), {name}!</h1>
          <p style={{ color: "#78716c", fontSize: 13, marginTop: 4 }}>Complete seu cadastro para acessar o Devocional Hub</p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="label">Email</label>
              <input className="input-field" value={email} disabled autoComplete="email" />
            </div>
            <div>
              <label className="label">Senha</label>
              <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Confirmar Senha</label>
              <input type="password" className="input-field" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" required autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Email ou Username do Zoom *</label>
              <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 6 }}>
                Usado para registrar sua presença automaticamente nos devocionais.
              </p>
              <input className="input-field" value={zoomIdentifier} onChange={e => setZoomIdentifier(e.target.value)} placeholder="seu.email@zoom.com" required />
            </div>
            {error && (
              <div className="alert-error" style={{ fontSize: 13, color: "#dc2626" }}>{error}</div>
            )}
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", padding: "12px 16px" }}>
              {loading ? "Salvando..." : "Criar Conta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
