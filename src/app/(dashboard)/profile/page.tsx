"use client";

import { useState, useEffect, useRef } from "react";

interface ZoomIdentifier { id: string; value: string; type: string; locked: boolean; }
interface UserProfile {
  id: string; name: string; email: string; church: string; team: string;
  subTeam: string; photoUrl: string | null; role: string;
  zoomIdentifiers: ZoomIdentifier[];
}

function compressImage(file: File, maxWidth: number = 800): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [name, setName] = useState("");
  const [zoomValue, setZoomValue] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => { if (r.status === 401) { window.location.href = "/login"; return null; } return r.json(); })
      .then(data => {
        if (data) {
          setUser(data);
          setName(data.name);
          if (data.photoUrl) setPhotoPreview(data.photoUrl);
          if (data.zoomIdentifiers?.length > 0) setZoomValue(data.zoomIdentifiers[0].value);
        }
      })
      .catch(() => setMsg({ text: "Erro ao carregar perfil", ok: false }))
      .finally(() => setLoading(false));
  }, []);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setMsg({ text: "Use JPEG, PNG, WebP ou GIF", ok: false });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
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
    setUploading(!!selectedFile);
    setMsg(null);

    const formData = new FormData();
    if (name.trim() && name.trim() !== user.name) formData.append("name", name.trim());

    if (selectedFile) {
      try {
        const compressed = await compressImage(selectedFile);
        formData.append("photo", compressed, "photo.jpg");
      } catch {
        formData.append("photo", selectedFile);
      }
    }

    const existingZoom = user.zoomIdentifiers?.[0]?.value || "";
    if (zoomValue.trim() && zoomValue.trim() !== existingZoom) {
      formData.append("zoomIdentifier", zoomValue.trim());
      formData.append("zoomType", "EMAIL");
    }

    if ([...formData.entries()].length === 0) {
      setMsg({ text: "Nenhuma alteração para salvar", ok: false });
      setSaving(false);
      setUploading(false);
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
        if (updated.zoomIdentifiers?.length > 0) setZoomValue(updated.zoomIdentifiers[0].value);
        setMsg({ text: "Perfil atualizado!", ok: true });
      } else {
        const d = await res.json();
        setMsg({ text: d.error || "Erro ao salvar", ok: false });
      }
    } catch {
      setMsg({ text: "Erro de conexão. Verifique sua internet e tente novamente.", ok: false });
    } finally {
      setSaving(false);
      setUploading(false);
      setTimeout(() => setMsg(null), 3000);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <p style={{ fontSize: 16, color: "var(--text-muted)" }}>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  const zoomLocked = user.zoomIdentifiers?.[0]?.locked || false;
  const hasMultipleZoom = (user.zoomIdentifiers?.length || 0) > 1;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Title */}
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 28 }}>
        Meu Perfil
      </h1>

      {/* Avatar + Upload */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
        <div
          onClick={() => fileRef.current?.click()}
          className="avatar-lg"
          style={{
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
            backgroundColor: "var(--surface)",
          }}
        >
          {uploading && (
            <div style={{
              position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
              borderRadius: "50%",
            }}>
              <svg style={{ width: 24, height: 24, color: "#fff", animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
          {photoPreview ? (
            <img src={photoPreview} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          ) : (
            <span style={{ fontSize: 40, fontWeight: 700, color: "var(--accent)" }}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhotoChange} style={{ display: "none" }} />
      </div>

      {/* Role badge */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
        <span className={`badge badge-${user.role === "ADMIN" ? "warning" : "info"}`} style={{ padding: "4px 14px" }}>
          {user.role === "ADMIN" ? "ADMIN" : "MEMBRO"}
        </span>
      </div>

      {/* DADOS PESSOAIS section */}
      <div className="section-card" style={{ marginBottom: 16 }}>
        <div className="section-title">Dados pessoais</div>

        {/* Nome Completo */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Nome Completo
          </label>
          <input
            className="input-field"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Seu nome completo"
          />
        </div>

        {/* Zoom ID / Email */}
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Zoom ID / Email
          </label>

          {hasMultipleZoom ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {user.zoomIdentifiers.map((zi, idx) => (
                <div key={zi.id}>
                  <input
                    className="input-field"
                    value={idx === 0 ? zoomValue : zi.value}
                    onChange={idx === 0 && !zi.locked ? e => setZoomValue(e.target.value) : undefined}
                    readOnly={idx !== 0 || zi.locked}
                    disabled={zi.locked}
                    style={{ opacity: zi.locked ? 0.6 : 1 }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <input
              className="input-field"
              value={zoomValue}
              onChange={e => setZoomValue(e.target.value)}
              placeholder="seu.email@zoom.com"
              disabled={zoomLocked}
              style={{ opacity: zoomLocked ? 0.6 : 1 }}
            />
          )}

          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
            Usado para registrar sua presença automaticamente.
            {zoomLocked && " Para alteração, entre em contato com a equipe do Devocional Hub."}
          </p>

          {zoomLocked && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12, color: "var(--success)" }}>
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Correlação confirmada
            </div>
          )}
        </div>
      </div>

      {/* INFORMAÇÕES DA IGREJA section */}
      <div className="section-card" style={{ marginBottom: 20 }}>
        <div className="section-title">Informações da Igreja</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[
            { label: "Email", value: user.email, icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" },
            { label: "Igreja", value: user.church || "—", icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" },
            { label: "Equipe", value: user.team || "—", icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" },
            { label: "Sub Equipe", value: user.subTeam || "—", icon: "M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" },
          ].map((item, index) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: index < 3 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: "var(--surface-hover)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg style={{ width: 16, height: 16, color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</div>
                <div style={{ fontSize: 15, color: "var(--text)", fontWeight: 600 }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="btn-primary"
        style={{ width: "100%", padding: "12px 0", fontSize: 16, borderRadius: 12 }}
      >
        {saving ? (uploading ? "Enviando foto..." : "Salvando...") : "Salvar Alterações"}
      </button>

      {/* Success/error message */}
      {msg && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <span className={`badge badge-${msg.ok ? "success" : "error"}`} style={{ padding: "4px 14px" }}>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
