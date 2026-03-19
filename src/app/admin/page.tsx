"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BIBLE_BOOKS } from "@/lib/bible-books";

type Tab = "zoom" | "schedule" | "webhooks" | "users" | "reading" | "attendance";

interface ZoomIdentifier { id: string; value: string; type: string; locked: boolean; }
interface Webhook { id: string; name: string; slug: string; active: boolean; createdAt: string; }
interface User {
  id: string; name: string; email: string; role: string; church: string; team: string;
  subTeam: string; active: boolean; inviteToken: string | null; createdAt: string;
  zoomIdentifiers: ZoomIdentifier[];
}
interface ReadingPlan {
  id: string; bookName: string; bookCode: string; bookOrder: number;
  chaptersPerDay: number; totalChapters: number;
  startDate: string; endDate: string; status: string;
  days: ReadingPlanDay[];
}
interface ReadingPlanDay {
  id: string; date: string; chapters: string; completed: boolean; logNote: string | null;
}

// ─── SVG Icons ────────────────────────────────────────────

function IconCopy({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
}
function IconPencil({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>;
}
function IconTrash({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>;
}
function IconCheck({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>;
}
function IconPlus({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>;
}
function IconSearch({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>;
}
function IconX({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>;
}

// ─── Editable Field (lock/edit pattern) ────────────────

function EditableField({ label, value, description, onSave }: {
  label: string; value: string; description?: string;
  onSave: (val: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(value); }, [value]);

  async function handleSave() {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="section-card" style={{ padding: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#78716c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      {description && <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 10 }}>{description}</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="input-field"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          disabled={!editing}
          style={{ flex: 1, opacity: editing ? 1 : 0.7 }}
          onBlur={() => { if (editing && draft === value) setEditing(false); }}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        />
        {editing ? (
          <button className="btn-icon" onClick={handleSave} disabled={saving} title="Salvar" style={{ color: "#059669", borderColor: "#a7f3d0" }}>
            <IconCheck size={16} />
          </button>
        ) : (
          <button className="btn-icon" onClick={() => setEditing(true)} title="Editar">
            <IconPencil size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("zoom");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Webhook form
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookSlug, setNewWebhookSlug] = useState("");

  // User form
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteChurch, setInviteChurch] = useState("");
  const [inviteTeam, setInviteTeam] = useState("");
  const [inviteSubTeam, setInviteSubTeam] = useState("");
  const [inviteZoomId, setInviteZoomId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState<Partial<User>>({});
  const [newZoomId, setNewZoomId] = useState("");

  // Reading plan form
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chaptersPerDay, setChaptersPerDay] = useState(3);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [planMonth, setPlanMonth] = useState(new Date().getMonth());
  const [planYear, setPlanYear] = useState(new Date().getFullYear());
  const [planFilter, setPlanFilter] = useState<string>("all");

  const [copied, setCopied] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, wRes, uRes, pRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/webhooks"),
        fetch("/api/admin/users"),
        fetch("/api/admin/reading-plans"),
      ]);
      if (sRes.status === 403) { router.push("/"); return; }
      setSettings(await sRes.json());
      setWebhooks(await wRes.json());
      setUsers(await uRes.json());
      setPlans(await pRes.json());
    } catch { setMsg("Erro ao carregar dados"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  function showMsg(text: string) { setMsg(text); setTimeout(() => setMsg(""), 3000); }

  async function saveSetting(key: string, value: string) {
    await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
    setSettings(prev => ({ ...prev, [key]: value }));
    showMsg("Salvo!");
  }

  async function createWebhook() {
    if (!newWebhookName || !newWebhookSlug) return;
    const res = await fetch("/api/admin/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newWebhookName, slug: newWebhookSlug }) });
    if (res.ok) { setNewWebhookName(""); setNewWebhookSlug(""); loadData(); showMsg("Webhook criado!"); }
    else { const d = await res.json(); showMsg(d.error || "Erro"); }
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
    if (!inviteName || !inviteEmail || !inviteChurch) { showMsg("Nome, email e igreja são obrigatórios"); return; }
    const zoomIdentifiers = inviteZoomId ? [{ value: inviteZoomId, type: "EMAIL" }] : [];
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: inviteName, email: inviteEmail, church: inviteChurch, team: inviteTeam, subTeam: inviteSubTeam, zoomIdentifiers }),
    });
    if (res.ok) {
      setInviteName(""); setInviteEmail(""); setInviteChurch(""); setInviteTeam(""); setInviteSubTeam(""); setInviteZoomId("");
      loadData(); showMsg("Convite enviado!");
    } else { const d = await res.json(); showMsg(d.error || "Erro"); }
  }

  async function toggleUserActive(id: string, active: boolean) {
    await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) });
    loadData();
  }

  async function saveUserEdit(id: string) {
    await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...editUserData }) });
    setEditingUser(null); setEditUserData({});
    loadData(); showMsg("Usuário atualizado!");
  }

  async function deleteUser(id: string) {
    if (!confirm("Remover este usuário permanentemente?")) return;
    await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadData();
  }

  async function addZoomIdentifier(userId: string) {
    if (!newZoomId.trim()) return;
    await fetch(`/api/admin/users/${userId}/zoom-identifiers`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newZoomId.trim(), type: "EMAIL" }),
    });
    setNewZoomId("");
    loadData(); showMsg("Identificador Zoom adicionado!");
  }

  async function removeZoomIdentifier(userId: string, zoomIdentifierId: string) {
    await fetch(`/api/admin/users/${userId}/zoom-identifiers`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoomIdentifierId }),
    });
    loadData();
  }

  async function createReadingPlan() {
    const book = BIBLE_BOOKS.find(b => b.code === selectedBook);
    if (!book || selectedDates.length === 0) { showMsg("Selecione um livro e as datas"); return; }
    const res = await fetch("/api/admin/reading-plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookName: book.name, bookCode: book.code, bookOrder: book.order,
        chaptersPerDay, totalChapters: book.chapters, selectedDates,
      }),
    });
    if (res.ok) { setSelectedBook(""); setSelectedDates([]); loadData(); showMsg("Plano criado!"); }
    else { const d = await res.json(); showMsg(d.error || "Erro"); }
  }

  async function deleteReadingPlan(id: string) {
    if (!confirm("Remover este plano de leitura?")) return;
    await fetch(`/api/admin/reading-plans/${id}`, { method: "DELETE" });
    loadData();
  }

  async function togglePlanDay(planId: string, dayId: string, completed: boolean) {
    await fetch(`/api/admin/reading-plans/${planId}/days`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayId, completed }),
    });
    loadData();
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Calendar helpers for reading plan
  const DAYS_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  function getCalendarDays() {
    const firstDay = new Date(planYear, planMonth, 1);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(planYear, planMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }

  // Dates used by other plans
  const usedDates = new Set<string>();
  plans.forEach(p => {
    if (p.status !== "COMPLETED") {
      p.days.forEach(d => {
        const dk = new Date(d.date).toISOString().split("T")[0];
        usedDates.add(dk);
      });
    }
  });

  const todayStr = new Date().toISOString().split("T")[0];

  function toggleDate(dateStr: string) {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr].sort()
    );
  }

  // Filtered users
  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.church.toLowerCase().includes(q);
  });

  // Filtered plans
  const filteredPlans = plans.filter(p => planFilter === "all" || p.status === planFilter);

  // Auto-fill dates for reading plan
  const selectedBookData = BIBLE_BOOKS.find(b => b.code === selectedBook);
  const neededDays = selectedBookData ? Math.ceil(selectedBookData.chapters / chaptersPerDay) : 0;

  const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  if (loading) return <div className="page-bg" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}><p style={{ color: "#78716c" }}>Carregando...</p></div>;

  return (
    <div className="page-bg">
      <header className="app-header">
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" className="btn-icon" style={{ textDecoration: "none" }}>
              <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </a>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1c1917" }}>Administração</div>
          </div>
          {msg && <span className="badge badge-success">{msg}</span>}
        </div>
      </header>

      {/* Tabs */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px" }}>
        <div className="tabs-list">
          {([
            { key: "zoom", label: "Configurações Zoom" },
            { key: "schedule", label: "Horários" },
            { key: "webhooks", label: "Webhooks" },
            { key: "users", label: "Usuários" },
            { key: "reading", label: "Leitura" },
            { key: "attendance", label: "Presença" },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`tab-trigger ${tab === t.key ? "active" : ""}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px 60px" }}>

        {/* ─── TAB: Configurações Zoom ─── */}
        {tab === "zoom" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <EditableField
              label="Orador Principal"
              description="Nome do pregador principal. A IA vai focar na fala desta pessoa."
              value={settings.mainSpeakerName || ""}
              onSave={val => saveSetting("mainSpeakerName", val)}
            />
            <EditableField
              label="ID da Reunião Zoom"
              description="ID numérico da reunião recorrente do Zoom (10-11 dígitos)."
              value={settings.zoomMeetingId || ""}
              onSave={val => saveSetting("zoomMeetingId", val)}
            />
            <EditableField
              label="Link do Zoom"
              description="Link completo da reunião para exibir no dashboard."
              value={settings.zoomLink || ""}
              onSave={val => saveSetting("zoomLink", val)}
            />
          </div>
        )}

        {/* ─── TAB: Horários ─── */}
        {tab === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Horários dos Devocionais</div>
              <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 16 }}>
                Configure o horário de cada dia da semana. Segunda a Sexta são obrigatórios.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day, i) => {
                  const labels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
                  const isWeekend = i >= 5;
                  const key = `schedule_${day}`;
                  return (
                    <div key={day} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: isWeekend ? "#a8a29e" : "#44403c" }}>
                        {labels[i]} {!isWeekend && <span style={{ color: "#d97706" }}>*</span>}
                      </label>
                      <input
                        type="time"
                        className="input-field"
                        value={settings[key] || ""}
                        onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ fontSize: 14 }}
                      />
                    </div>
                  );
                })}
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: 16 }}
                onClick={async () => {
                  for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]) {
                    const val = settings[`schedule_${day}`] || "";
                    if (val) await saveSetting(`schedule_${day}`, val);
                  }
                  showMsg("Horários salvos!");
                }}
              >
                Salvar Horários
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB: Webhooks ─── */}
        {tab === "webhooks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Criar Webhook</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input className="input-field" value={newWebhookName} onChange={e => setNewWebhookName(e.target.value)} placeholder="Nome (ex: Zoom meeting.ended)" style={{ flex: 1, minWidth: 180 }} />
                <input className="input-field" value={newWebhookSlug} onChange={e => setNewWebhookSlug(e.target.value)} placeholder="Slug (ex: zoom)" style={{ width: 140 }} />
                <button className="btn-primary" onClick={createWebhook}>Criar</button>
              </div>
              {newWebhookSlug && (
                <div style={{ fontSize: 12, color: "#78716c", marginTop: 8, fontFamily: "monospace" }}>
                  Preview: {baseUrl}/api/webhook/{newWebhookSlug.toLowerCase().replace(/[^a-z0-9-]/g, "")}
                </div>
              )}
            </div>

            {webhooks.length === 0 ? (
              <p style={{ textAlign: "center", color: "#a8a29e", padding: 32 }}>Nenhum webhook cadastrado</p>
            ) : (
              webhooks.map(w => {
                const webhookUrl = `${baseUrl}/api/webhook/${w.slug}`;
                return (
                  <div key={w.id} className="section-card" style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: "#1c1917", marginBottom: 6 }}>{w.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <code style={{ fontSize: 13, color: "#d97706", wordBreak: "break-all", flex: 1 }}>{webhookUrl}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(webhookUrl, w.id)}
                            title="Copiar URL"
                            style={{ flexShrink: 0, color: copied === w.id ? "#059669" : "#78716c", borderColor: copied === w.id ? "#a7f3d0" : "#e7e5e4" }}
                          >
                            {copied === w.id ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          </button>
                        </div>
                        <div style={{ fontSize: 12, color: "#a8a29e" }}>
                          Criado em {new Date(w.createdAt).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <div className="tooltip-wrapper">
                          <button
                            className={`toggle-switch ${w.active ? "active" : ""}`}
                            onClick={() => toggleWebhook(w.id, !w.active)}
                            aria-label={w.active ? "Desativar" : "Ativar"}
                          />
                          <span className="tooltip">{w.active ? "Desativar" : "Ativar"}</span>
                        </div>
                        <div className="tooltip-wrapper">
                          <button className="btn-danger" onClick={() => deleteWebhook(w.id)} aria-label="Excluir">
                            <IconTrash size={14} />
                          </button>
                          <span className="tooltip">Excluir</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── TAB: Usuários ─── */}
        {tab === "users" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a8a29e" }}>
                <IconSearch size={16} />
              </div>
              <input
                className="search-input"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Buscar por nome, email ou igreja..."
              />
            </div>

            {/* Invite form */}
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Convidar Novo Usuário</div>
              <div className="admin-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input className="input-field" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Nome completo *" />
                <input className="input-field" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email *" type="email" />
                <input className="input-field" value={inviteChurch} onChange={e => setInviteChurch(e.target.value)} placeholder="Igreja *" />
                <input className="input-field" value={inviteTeam} onChange={e => setInviteTeam(e.target.value)} placeholder="Equipe" />
                <input className="input-field" value={inviteSubTeam} onChange={e => setInviteSubTeam(e.target.value)} placeholder="SubEquipe" />
                <input className="input-field" value={inviteZoomId} onChange={e => setInviteZoomId(e.target.value)} placeholder="Email/Username do Zoom" />
              </div>
              <button className="btn-primary" onClick={inviteUser} style={{ marginTop: 12, width: "100%" }}>
                Enviar Convite
              </button>
            </div>

            {/* Users list */}
            <div className="section-title">Usuários ({filteredUsers.length})</div>
            {filteredUsers.map(u => (
              <div key={u.id} className="section-card" style={{ padding: 16 }}>
                {editingUser === u.id ? (
                  /* Edit mode */
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="admin-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <input className="input-field" value={editUserData.name ?? u.name} onChange={e => setEditUserData(p => ({ ...p, name: e.target.value }))} placeholder="Nome" />
                      <input className="input-field" value={editUserData.church ?? u.church} onChange={e => setEditUserData(p => ({ ...p, church: e.target.value }))} placeholder="Igreja" />
                      <input className="input-field" value={editUserData.team ?? u.team} onChange={e => setEditUserData(p => ({ ...p, team: e.target.value }))} placeholder="Equipe" />
                      <input className="input-field" value={editUserData.subTeam ?? u.subTeam} onChange={e => setEditUserData(p => ({ ...p, subTeam: e.target.value }))} placeholder="SubEquipe" />
                    </div>
                    {/* Zoom identifiers */}
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#78716c", textTransform: "uppercase" }}>Identificadores Zoom</div>
                    {u.zoomIdentifiers.map(zi => (
                      <div key={zi.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <code style={{ fontSize: 13, color: "#44403c", flex: 1 }}>{zi.value}</code>
                        <button className="btn-icon" onClick={() => removeZoomIdentifier(u.id, zi.id)} style={{ width: 28, height: 28 }}>
                          <IconX size={12} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6 }}>
                      <input className="input-field" value={newZoomId} onChange={e => setNewZoomId(e.target.value)} placeholder="Adicionar email/username do Zoom" style={{ flex: 1 }} />
                      <button className="btn-icon" onClick={() => addZoomIdentifier(u.id)} style={{ color: "#059669", borderColor: "#a7f3d0" }}>
                        <IconPlus size={14} />
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="btn-ghost" onClick={() => { setEditingUser(null); setEditUserData({}); }}>Cancelar</button>
                      <button className="btn-primary" onClick={() => saveUserEdit(u.id)}>Salvar</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="avatar-sm" style={{ width: 40, height: 40, fontSize: 16 }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: "#1c1917" }}>{u.name}</span>
                        <span className={`badge badge-${u.role === "ADMIN" ? "warning" : "info"}`}>
                          {u.role === "ADMIN" ? "Admin" : "Usuário"}
                        </span>
                        {u.inviteToken && <span className="badge" style={{ backgroundColor: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}>Pendente</span>}
                        {!u.active && <span className="badge badge-error">Inativo</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "#78716c" }}>{u.email}</div>
                      {(u.church || u.team) && (
                        <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 2 }}>
                          {[u.church, u.team, u.subTeam].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {u.zoomIdentifiers.length > 0 && (
                        <div style={{ fontSize: 12, color: "#d97706", marginTop: 2 }}>
                          Zoom: {u.zoomIdentifiers.map(z => z.value).join(", ")}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {u.role !== "ADMIN" && (
                        <>
                          <div className="tooltip-wrapper">
                            <button
                              className={`toggle-switch ${u.active ? "active" : ""}`}
                              onClick={() => toggleUserActive(u.id, !u.active)}
                            />
                            <span className="tooltip">{u.active ? "Desativar acesso" : "Ativar acesso"}</span>
                          </div>
                          <div className="tooltip-wrapper">
                            <button className="btn-icon" onClick={() => { setEditingUser(u.id); setEditUserData({}); setNewZoomId(""); }}>
                              <IconPencil size={14} />
                            </button>
                            <span className="tooltip">Editar</span>
                          </div>
                          <div className="tooltip-wrapper">
                            <button className="btn-danger" onClick={() => deleteUser(u.id)}>
                              <IconTrash size={14} />
                            </button>
                            <span className="tooltip">Remover</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB: Plano de Leitura ─── */}
        {tab === "reading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Create plan */}
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Criar Plano de Leitura</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Book selection */}
                <div>
                  <label className="label">Livro da Bíblia</label>
                  <select
                    className="input-field"
                    value={selectedBook}
                    onChange={e => { setSelectedBook(e.target.value); setSelectedDates([]); }}
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">Selecione um livro...</option>
                    <optgroup label="Antigo Testamento">
                      {BIBLE_BOOKS.filter(b => b.testament === "AT").map(b => {
                        const hasActive = plans.some(p => p.bookCode === b.code && p.status !== "COMPLETED");
                        return <option key={b.code} value={b.code} disabled={hasActive}>{b.name} ({b.chapters} caps){hasActive ? " — ativo" : ""}</option>;
                      })}
                    </optgroup>
                    <optgroup label="Novo Testamento">
                      {BIBLE_BOOKS.filter(b => b.testament === "NT").map(b => {
                        const hasActive = plans.some(p => p.bookCode === b.code && p.status !== "COMPLETED");
                        return <option key={b.code} value={b.code} disabled={hasActive}>{b.name} ({b.chapters} caps){hasActive ? " — ativo" : ""}</option>;
                      })}
                    </optgroup>
                  </select>
                </div>

                {/* Chapters per day */}
                {selectedBook && (
                  <div>
                    <label className="label">Capítulos por dia</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <button
                          key={n}
                          onClick={() => { setChaptersPerDay(n); setSelectedDates([]); }}
                          style={{
                            width: 40, height: 40, borderRadius: 10,
                            border: chaptersPerDay === n ? "2px solid #d97706" : "1px solid #e7e5e4",
                            backgroundColor: chaptersPerDay === n ? "#fffbeb" : "#fff",
                            color: chaptersPerDay === n ? "#d97706" : "#44403c",
                            fontWeight: chaptersPerDay === n ? 700 : 500,
                            fontSize: 14, cursor: "pointer",
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 6 }}>
                      {selectedBookData?.chapters} capítulos ÷ {chaptersPerDay}/dia = <strong>{neededDays} dias</strong> necessários
                      {selectedDates.length > 0 && <> · <span style={{ color: "#d97706" }}>{selectedDates.length} selecionados</span></>}
                    </div>
                  </div>
                )}

                {/* Calendar */}
                {selectedBook && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <button className="btn-icon" onClick={() => { if (planMonth === 0) { setPlanMonth(11); setPlanYear(y => y - 1); } else setPlanMonth(m => m - 1); }}>
                        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#1c1917" }}>{MONTHS[planMonth]} {planYear}</span>
                      <button className="btn-icon" onClick={() => { if (planMonth === 11) { setPlanMonth(0); setPlanYear(y => y + 1); } else setPlanMonth(m => m + 1); }}>
                        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                      {DAYS_NAMES.map(d => (
                        <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#a8a29e", padding: 4 }}>{d}</div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                      {getCalendarDays().map((day, i) => {
                        if (day === null) return <div key={`e-${i}`} />;
                        const dateStr = `${planYear}-${String(planMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isPast = dateStr < todayStr;
                        const isUsed = usedDates.has(dateStr);
                        const isSelected = selectedDates.includes(dateStr);
                        const disabled = isPast || isUsed;

                        return (
                          <button
                            key={dateStr}
                            onClick={() => !disabled && toggleDate(dateStr)}
                            disabled={disabled}
                            style={{
                              width: "100%", aspectRatio: "1", borderRadius: 8,
                              border: isSelected ? "2px solid #d97706" : "1px solid transparent",
                              backgroundColor: isSelected ? "#fffbeb" : isPast ? "#f5f5f4" : isUsed ? "#e7e5e4" : "transparent",
                              color: isSelected ? "#d97706" : isPast ? "#a8a29e" : isUsed ? "#78716c" : "#44403c",
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: 13, cursor: disabled ? "default" : "pointer",
                              opacity: disabled ? 0.5 : 1,
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedBook && selectedDates.length > 0 && (
                  <button className="btn-primary" onClick={createReadingPlan} style={{ width: "100%" }}>
                    Criar Plano ({selectedDates.length} dias)
                  </button>
                )}
              </div>
            </div>

            {/* Plans list */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Planos de Leitura ({filteredPlans.length})</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { key: "all", label: "Todos" },
                  { key: "IN_PROGRESS", label: "Em andamento" },
                  { key: "UPCOMING", label: "Próximos" },
                  { key: "COMPLETED", label: "Finalizados" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setPlanFilter(f.key)}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid #e7e5e4",
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                      backgroundColor: planFilter === f.key ? "#fffbeb" : "#fff",
                      color: planFilter === f.key ? "#d97706" : "#78716c",
                      borderColor: planFilter === f.key ? "#fde68a" : "#e7e5e4",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredPlans.map(plan => {
              const completedDays = plan.days.filter(d => d.completed).length;
              const progress = plan.days.length > 0 ? Math.round((completedDays / plan.days.length) * 100) : 0;
              const book = BIBLE_BOOKS.find(b => b.code === plan.bookCode);

              return (
                <div key={plan.id} className="section-card" style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        backgroundColor: `${book?.color || "#78716c"}15`,
                        border: `2px solid ${book?.color || "#78716c"}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, color: book?.color || "#78716c",
                      }}>
                        {book?.abbr || "?"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "#1c1917" }}>{plan.bookName}</div>
                        <div style={{ fontSize: 13, color: "#78716c" }}>
                          {plan.chaptersPerDay} cap/dia · {new Date(plan.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} → {new Date(plan.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={`badge badge-${plan.status === "COMPLETED" ? "success" : plan.status === "IN_PROGRESS" ? "warning" : "info"}`}>
                        {plan.status === "COMPLETED" ? "Concluído" : plan.status === "IN_PROGRESS" ? "Em andamento" : "Próximo"}
                      </span>
                      <button className="btn-danger" onClick={() => deleteReadingPlan(plan.id)}>
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 6, borderRadius: 3, backgroundColor: "#f5f5f4", marginBottom: 12, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, backgroundColor: book?.color || "#d97706", width: `${progress}%`, transition: "width 0.3s" }} />
                  </div>

                  {/* Days log */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {plan.days.map(day => {
                      const dayDate = new Date(day.date);
                      const isPast = dayDate < new Date();
                      return (
                        <button
                          key={day.id}
                          onClick={() => togglePlanDay(plan.id, day.id, !day.completed)}
                          title={`${day.chapters} — ${dayDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`}
                          style={{
                            width: 32, height: 32, borderRadius: 6,
                            border: `1px solid ${day.completed ? (book?.color || "#d97706") : "#e7e5e4"}`,
                            backgroundColor: day.completed ? `${book?.color || "#d97706"}15` : isPast ? "#fef2f2" : "#fff",
                            color: day.completed ? (book?.color || "#d97706") : isPast ? "#dc2626" : "#a8a29e",
                            fontSize: 11, fontWeight: 600, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          {day.completed ? <IconCheck size={14} /> : day.chapters.split("-")[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── TAB: Presença ─── */}
        {tab === "attendance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Relatório de Presença</div>
              <p style={{ fontSize: 13, color: "#a8a29e" }}>
                A presença é calculada automaticamente correlacionando os participantes do Zoom com os identificadores cadastrados.
              </p>
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {users.filter(u => u.role !== "ADMIN").map(u => {
                  return (
                    <div key={u.id} style={{ padding: 14, borderRadius: 10, border: "1px solid #e7e5e4", backgroundColor: "#fafaf9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div className="avatar-sm" style={{ width: 28, height: 28, fontSize: 11 }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>{u.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#78716c" }}>
                        {u.zoomIdentifiers.length > 0 ? (
                          <span style={{ color: "#059669" }}>Zoom vinculado</span>
                        ) : (
                          <span style={{ color: "#dc2626" }}>Sem vínculo Zoom</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
