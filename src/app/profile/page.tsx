"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  church: string;
  team: string;
  subTeam: string;
  photoUrl: string | null;
  role: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [name, setName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => { if (r.status === 401) { window.location.href = "/login"; return null; } return r.json(); })
      .then(data => {
        if (data) {
          setUser(data);
          setName(data.name);
          if (data.photoUrl) setPhotoPreview(data.photoUrl);
        }
      })
      .catch(() => setMsg({ text: "Erro ao carregar perfil", ok: false }))
      .finally(() => setLoading(false));
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ text: "A foto deve ter no máximo 5MB", ok: false });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setSelectedFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    setMsg(null);

    const formData = new FormData();
    if (name.trim() && name.trim() !== user.name) formData.append("name", name.trim());
    if (selectedFile) formData.append("photo", selectedFile);

    if ([...formData.entries()].length === 0) {
      setMsg({ text: "Nenhuma alteração para salvar", ok: false });
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    try {
      const res = await fetch("/api/profile", { method: "PUT", body: formData });
      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setName(updated.name);
        setSelectedFile(null);
        if (updated.photoUrl) setPhotoPreview(updated.photoUrl + "?t=" + Date.now());
        setMsg({ text: "Perfil atualizado!", ok: true });
      } else {
        const d = await res.json();
        setMsg({ text: d.error || "Erro ao salvar", ok: false });
      }
    } catch {
      setMsg({ text: "Erro de conexão", ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="page-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ fontSize: 16, color: "#78716c" }}>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page-bg">
      {/* Header */}
      <header className="app-header">
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/" style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, color: "#78716c", textDecoration: "none", border: "1px solid #e7e5e4" }}>
            <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div style={{ fontWeight: 700, fontSize: 20, color: "#1c1917" }}>Meu Perfil</div>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px 60px" }}>
        {/* Avatar + Upload */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 36 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              overflow: "hidden",
              cursor: "pointer",
              border: "4px solid #fde68a",
              boxShadow: "0 8px 24px rgba(217,119,6,0.15)",
              position: "relative",
              backgroundColor: "#f5f5f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 48, fontWeight: 700, color: "#d97706" }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            {/* Overlay */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 36,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg style={{ width: 18, height: 18, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
          <p style={{ fontSize: 13, color: "#a8a29e", marginTop: 10 }}>Clique para alterar a foto</p>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="section-card" style={{ padding: 24 }}>
            <label className="label" style={{ fontSize: 15 }}>Nome</label>
            <input
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              style={{ fontSize: 16, padding: "12px 16px" }}
            />
          </div>

          <div className="section-card" style={{ padding: 24 }}>
            <label className="label" style={{ fontSize: 15, marginBottom: 10 }}>Informações</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Email", value: user.email, icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" },
                { label: "Igreja", value: user.church || "—", icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" },
                { label: "Equipe", value: user.team || "—", icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" },
                { label: "SubEquipe", value: user.subTeam || "—", icon: "M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #f5f5f4" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#fafaf9", border: "1px solid #e7e5e4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg style={{ width: 18, height: 18, color: "#78716c" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#a8a29e", fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 16, color: "#1c1917", fontWeight: 500 }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badge de role */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span className={`badge badge-${user.role === "ADMIN" ? "warning" : "info"}`} style={{ fontSize: 14, padding: "6px 16px" }}>
              {user.role === "ADMIN" ? "Administrador" : "Membro"}
            </span>
          </div>

          {/* Save button */}
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "14px 0", fontSize: 16, borderRadius: 14 }}
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>

          {msg && (
            <div style={{ textAlign: "center" }}>
              <span className={`badge badge-${msg.ok ? "success" : "error"}`} style={{ fontSize: 14, padding: "6px 14px" }}>
                {msg.text}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
