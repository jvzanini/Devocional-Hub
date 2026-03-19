"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Tab = "settings" | "webhooks" | "users";

interface Webhook { id: string; name: string; slug: string; active: boolean; createdAt: string; }
interface User { id: string; name: string; email: string; role: string; church: string; team: string; subTeam: string; inviteToken: string | null; createdAt: string; }

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("settings");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Form states
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookSlug, setNewWebhookSlug] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteChurch, setInviteChurch] = useState("");
  const [inviteTeam, setInviteTeam] = useState("");
  const [inviteSubTeam, setInviteSubTeam] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, wRes, uRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/webhooks"),
        fetch("/api/admin/users"),
      ]);
      if (sRes.status === 403) { router.push("/"); return; }
      setSettings(await sRes.json());
      setWebhooks(await wRes.json());
      setUsers(await uRes.json());
    } catch { setMsg("Erro ao carregar dados"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveSetting(key: string, value: string) {
    await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
    setSettings(prev => ({ ...prev, [key]: value }));
    setMsg("Salvo!");
    setTimeout(() => setMsg(""), 2000);
  }

  async function createWebhook() {
    if (!newWebhookName || !newWebhookSlug) return;
    const res = await fetch("/api/admin/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newWebhookName, slug: newWebhookSlug }) });
    if (res.ok) { setNewWebhookName(""); setNewWebhookSlug(""); loadData(); setMsg("Webhook criado!"); }
    else { const d = await res.json(); setMsg(d.error || "Erro"); }
    setTimeout(() => setMsg(""), 3000);
  }

  async function toggleWebhook(id: string, active: boolean) {
    await fetch("/api/admin/webhooks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) });
    loadData();
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Remover este webhook?")) return;
    await fetch("/api/admin/webhooks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadData();
  }

  async function inviteUser() {
    if (!inviteName || !inviteEmail) return;
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: inviteName, email: inviteEmail, church: inviteChurch, team: inviteTeam, subTeam: inviteSubTeam }) });
    if (res.ok) {
      setInviteName(""); setInviteEmail(""); setInviteChurch(""); setInviteTeam(""); setInviteSubTeam("");
      loadData();
      setMsg("Convite enviado!");
    } else { const d = await res.json(); setMsg(d.error || "Erro"); }
    setTimeout(() => setMsg(""), 3000);
  }

  async function deleteUser(id: string) {
    if (!confirm("Remover este usuário?")) return;
    await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadData();
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) return <div className="page-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><p>Carregando...</p></div>;

  return (
    <div className="page-bg">
      <header className="app-header">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href="/" style={{ color: "#78716c", textDecoration: "none", fontSize: 20 }}>←</a>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1c1917" }}>Admin</div>
          </div>
          {msg && <span className="badge badge-success" style={{ fontSize: 13 }}>{msg}</span>}
        </div>
      </header>

      {/* Tabs */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #d6d3d1", marginBottom: 24 }}>
          {(["settings", "webhooks", "users"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "14px 20px", fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? "#d97706" : "#78716c", background: "none", border: "none", borderBottom: tab === t ? "2px solid #d97706" : "2px solid transparent", cursor: "pointer" }}>
              {t === "settings" ? "Configurações" : t === "webhooks" ? "Webhooks" : "Usuários"}
            </button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 40px" }}>
        {/* ─── Settings ─── */}
        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="section-card">
              <div className="section-title">Orador Principal</div>
              <p style={{ fontSize: 13, color: "#78716c", marginBottom: 12 }}>
                Nome do pregador principal. A IA vai focar na fala desta pessoa ao processar a transcrição. Use o nome como aparece no Zoom.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="input-field" value={settings.mainSpeakerName || ""} onChange={e => setSettings(prev => ({ ...prev, mainSpeakerName: e.target.value }))}
                  placeholder="Ex: João Vitor" style={{ flex: 1 }} />
                <button className="btn-primary" onClick={() => saveSetting("mainSpeakerName", settings.mainSpeakerName || "")}>Salvar</button>
              </div>
            </div>

            <div className="section-card">
              <div className="section-title">ID da Reunião Zoom</div>
              <p style={{ fontSize: 13, color: "#78716c", marginBottom: 12 }}>
                ID numérico da reunião recorrente do Zoom (10-11 dígitos).
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="input-field" value={settings.zoomMeetingId || ""} onChange={e => setSettings(prev => ({ ...prev, zoomMeetingId: e.target.value }))}
                  placeholder="Ex: 89803817919" style={{ flex: 1 }} />
                <button className="btn-primary" onClick={() => saveSetting("zoomMeetingId", settings.zoomMeetingId || "")}>Salvar</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Webhooks ─── */}
        {tab === "webhooks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="section-card">
              <div className="section-title">Criar Webhook</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input className="input-field" value={newWebhookName} onChange={e => setNewWebhookName(e.target.value)} placeholder="Nome (ex: Zoom meeting.ended)" style={{ flex: 1, minWidth: 200 }} />
                <input className="input-field" value={newWebhookSlug} onChange={e => setNewWebhookSlug(e.target.value)} placeholder="Slug (ex: zoom)" style={{ width: 160 }} />
                <button className="btn-primary" onClick={createWebhook}>Criar</button>
              </div>
            </div>

            {webhooks.length === 0 ? (
              <p style={{ textAlign: "center", color: "#a8a29e", padding: 32 }}>Nenhum webhook cadastrado</p>
            ) : (
              webhooks.map(w => (
                <div key={w.id} className="section-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#1c1917", marginBottom: 4 }}>{w.name}</div>
                    <div style={{ fontSize: 13, color: "#d97706", fontFamily: "monospace", wordBreak: "break-all" }}>{baseUrl}/api/webhook/{w.slug}</div>
                    <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>
                      Status: <span style={{ color: w.active ? "#059669" : "#dc2626" }}>{w.active ? "Ativo" : "Inativo"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => toggleWebhook(w.id, !w.active)}
                      style={{ padding: "6px 12px", fontSize: 13, border: "1px solid #d6d3d1", borderRadius: 8, background: "none", cursor: "pointer", color: "#57534e" }}>
                      {w.active ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => deleteWebhook(w.id)}
                      style={{ padding: "6px 12px", fontSize: 13, border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", cursor: "pointer", color: "#dc2626" }}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Users ─── */}
        {tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="section-card">
              <div className="section-title">Convidar Usuário</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input className="input-field" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Nome completo" />
                <input className="input-field" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email" type="email" />
                <input className="input-field" value={inviteChurch} onChange={e => setInviteChurch(e.target.value)} placeholder="Igreja" />
                <input className="input-field" value={inviteTeam} onChange={e => setInviteTeam(e.target.value)} placeholder="Equipe" />
                <input className="input-field" value={inviteSubTeam} onChange={e => setInviteSubTeam(e.target.value)} placeholder="SubEquipe (número)" />
                <button className="btn-primary" onClick={inviteUser} style={{ justifyContent: "center" }}>Enviar Convite</button>
              </div>
            </div>

            <div className="section-title">Usuários Cadastrados ({users.length})</div>
            {users.map(u => (
              <div key={u.id} className="section-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  <div className="avatar-sm" style={{ width: 36, height: 36, fontSize: 14 }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#1c1917", display: "flex", alignItems: "center", gap: 6 }}>
                      {u.name}
                      <span className={`badge badge-${u.role === "ADMIN" ? "warning" : "info"}`}>{u.role}</span>
                      {u.inviteToken && <span className="badge" style={{ backgroundColor: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}>Pendente</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "#78716c" }}>{u.email}</div>
                    {(u.church || u.team) && (
                      <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 2 }}>
                        {[u.church, u.team, u.subTeam].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
                {u.role !== "ADMIN" && (
                  <button onClick={() => deleteUser(u.id)}
                    style={{ padding: "6px 12px", fontSize: 13, border: "1px solid #fecaca", borderRadius: 8, background: "#fef2f2", cursor: "pointer", color: "#dc2626", flexShrink: 0 }}>
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
