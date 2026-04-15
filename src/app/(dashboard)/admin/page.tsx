"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ALL_ROLES, isAdmin as checkIsAdmin, type UserRoleType } from "@/features/permissions/lib/role-hierarchy";
import { timeAgoPtBR } from "@/features/engagement/lib/time-utils";
import type { AdminInsights, RiskLevel } from "@/features/engagement/lib/admin-insights";
import { UserJourneyModal } from "@/features/engagement/components/UserJourneyModal";

type Tab = "zoom" | "schedule" | "webhooks" | "users" | "reading" | "attendance" | "ia" | "permissions" | "subscriptions" | "engagement";

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

interface AttendanceRecord {
  id: string;
  userId: string;
  joinTime: string;
  leaveTime: string;
  duration: number;
  user: { id: string; name: string; email: string; church: string; team: string; subTeam: string };
  session: { id: string; date: string; chapterRef: string };
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
  const isEmpty = !value || value.trim() === "";
  const [editing, setEditing] = useState(isEmpty);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
    setEditing(!value || value.trim() === "");
  }, [value]);

  async function handleSave() {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="section-card" style={{ padding: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      {description && <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 10 }}>{description}</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="input-field"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          disabled={!editing}
          style={{ flex: 1, opacity: editing ? 1 : 0.7, transition: "opacity 0.15s" }}
          onBlur={() => { if (editing && draft === value && !isEmpty) setEditing(false); }}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setDraft(value); if (!isEmpty) setEditing(false); } }}
        />
        {editing ? (
          <button className="btn-icon" onClick={handleSave} disabled={saving} title="Salvar" style={{ color: "var(--success)", borderColor: "var(--success-border)" }}>
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

// ─── Engagement Tab ────────────────────────────────────

const LEVEL_LABEL: Record<RiskLevel, string> = {
  attention: "Atenção",
  dormant: "Adormecido",
  lost: "Perdido",
};

interface ParsedInsights extends Omit<AdminInsights, "topStreaks" | "atRisk"> {
  topStreaks: (Omit<AdminInsights["topStreaks"][number], "lastAttendedAt"> & { lastAttendedAt: Date | null })[];
  atRisk: (Omit<AdminInsights["atRisk"][number], "lastAttendedAt"> & { lastAttendedAt: Date })[];
}

function EngagementTab({ onSelectUser }: { onSelectUser: (id: string) => void }) {
  const [data, setData] = useState<ParsedInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/engagement/insights")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((json: AdminInsights) => {
        const parsed: ParsedInsights = {
          ...json,
          topStreaks: json.topStreaks.map((t) => ({ ...t, lastAttendedAt: t.lastAttendedAt ? new Date(t.lastAttendedAt) : null })),
          atRisk: json.atRisk.map((a) => ({ ...a, lastAttendedAt: new Date(a.lastAttendedAt) })),
        };
        setData(parsed);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 24, color: "var(--text-muted)" }}>Carregando insights…</div>;
  if (error) return <div style={{ padding: 24, color: "var(--accent)" }}>Erro: {error}</div>;
  if (!data) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="stat-card">
          <div className="section-title">Comunidade Ativa</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{data.summary.activeCommunity}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>últimos 30 dias</div>
        </div>
        <div className="stat-card">
          <div className="section-title">Streaks Ativos</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{data.summary.activeStreaks}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>com 3+ seguidos</div>
        </div>
        <div className="stat-card">
          <div className="section-title">Em Risco</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{data.summary.atRisk}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>precisam de atenção</div>
        </div>
        <div className="stat-card">
          <div className="section-title">Conquistas</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{data.summary.totalAchievements}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>total desbloqueado</div>
        </div>
      </div>

      {/* Top Streaks */}
      <div className="card" style={{ padding: 20 }}>
        <div className="section-title">Top Streaks</div>
        {data.topStreaks.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Sem streaks ainda.</p>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Igreja/Equipe</th>
                <th scope="col">Atual</th>
                <th scope="col">Melhor</th>
                <th scope="col">Total</th>
                <th scope="col">Última</th>
              </tr>
            </thead>
            <tbody>
              {data.topStreaks.map((t) => (
                <tr key={t.userId}>
                  <td>
                    <button
                      onClick={() => onSelectUser(t.userId)}
                      style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit", textAlign: "left" }}
                    >
                      {t.name}
                    </button>
                  </td>
                  <td>{[t.church, t.team].filter(Boolean).join(" · ")}</td>
                  <td>{t.currentStreak}</td>
                  <td>{t.bestStreak}</td>
                  <td>{t.totalAttended}</td>
                  <td>{t.lastAttendedAt ? timeAgoPtBR(t.lastAttendedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Distribuição */}
      <div className="card" style={{ padding: 20 }}>
        <div className="section-title">Distribuição de Conquistas</div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {data.distribution.map((d) => (
            <li key={d.key} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <strong>{d.title}</strong>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.description}</div>
              </div>
              <div style={{ textAlign: "right", minWidth: 120 }}>
                <div style={{ fontWeight: 700, color: "var(--accent)" }}>{d.count}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{Math.round(Math.min(d.pct, 1) * 100)}%</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Em Risco */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>Usuários em Risco</div>
          {data.summary.atRisk > data.atRisk.length && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              mostrando {data.atRisk.length} de {data.summary.atRisk} (mais prioritários)
            </span>
          )}
        </div>
        {data.atRisk.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Ninguém em risco agora 🙌</p>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                <th scope="col">Nível</th>
                <th scope="col">Nome</th>
                <th scope="col">Igreja/Equipe</th>
                <th scope="col">Melhor</th>
                <th scope="col">Última</th>
                <th scope="col">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {data.atRisk.map((a) => (
                <tr key={a.userId}>
                  <td>{LEVEL_LABEL[a.level]}</td>
                  <td>
                    <button
                      onClick={() => onSelectUser(a.userId)}
                      style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, font: "inherit", textAlign: "left" }}
                    >
                      {a.name}
                    </button>
                  </td>
                  <td>{[a.church, a.team].filter(Boolean).join(" · ")}</td>
                  <td>{a.bestStreak}</td>
                  <td>{timeAgoPtBR(a.lastAttendedAt)}</td>
                  <td>{a.whatsapp ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
        Atualizado {timeAgoPtBR(new Date(data.computedAt))}
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
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [editWebhookName, setEditWebhookName] = useState("");

  // User form
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteChurch, setInviteChurch] = useState("");
  const [inviteTeam, setInviteTeam] = useState("");
  const [inviteSubTeam, setInviteSubTeam] = useState("");
  const [inviteZoomId, setInviteZoomId] = useState("");
  const [inviteZoomIds, setInviteZoomIds] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState<string>("MEMBER");
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState("");
  const [inviteWhatsApp, setInviteWhatsApp] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState<Partial<User & { role: string; email: string }>>({});
  const [newZoomId, setNewZoomId] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");

  // Reading plan form
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chaptersPerDay, setChaptersPerDay] = useState(3);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planMonth, setPlanMonth] = useState(new Date().getMonth());
  const [planYear, setPlanYear] = useState(new Date().getFullYear());
  const [planFilter, setPlanFilter] = useState<string>("all");

  // Modal retroativo
  const [retroModal, setRetroModal] = useState<{ planId: string; retroDays: { dayId: string; date: string; chapters: string }[] } | null>(null);
  const [retroChecks, setRetroChecks] = useState<Record<string, boolean>>({});

  // Popup horário dia bloqueado
  const [timePopup, setTimePopup] = useState<{ dateStr: string; dayName: string } | null>(null);
  const [timePopupValue, setTimePopupValue] = useState("07:00");

  // Attendance state
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [attendanceChurch, setAttendanceChurch] = useState("");
  const [attendanceTeam, setAttendanceTeam] = useState("");
  const [attendanceSubTeam, setAttendanceSubTeam] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

  // Permissions state
  const [permissions, setPermissions] = useState<Record<string, string>>({});
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Journey modal state
  const [journeyUserId, setJourneyUserId] = useState<string | null>(null);

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

  // Load attendance data
  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const params = new URLSearchParams();
      if (attendanceMonth) params.set("month", attendanceMonth);
      if (attendanceChurch) params.set("church", attendanceChurch);
      if (attendanceTeam) params.set("team", attendanceTeam);
      if (attendanceSubTeam) params.set("subTeam", attendanceSubTeam);
      const res = await fetch(`/api/attendance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceData(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setAttendanceLoading(false); }
  }, [attendanceMonth, attendanceChurch, attendanceTeam, attendanceSubTeam]);

  useEffect(() => {
    if (tab === "attendance") loadAttendance();
  }, [tab, loadAttendance]);

  // Load permissions
  useEffect(() => {
    if (tab === "permissions") {
      setPermissionsLoading(true);
      fetch("/api/admin/permissions")
        .then(r => r.ok ? r.json() : [])
        .then((data: { resource: string; minRole: string }[]) => {
          const map: Record<string, string> = {};
          for (const p of data) map[p.resource] = p.minRole;
          setPermissions(map);
        })
        .finally(() => setPermissionsLoading(false));
    }
  }, [tab]);

  async function savePermission(resource: string, minRole: string) {
    await fetch("/api/admin/permissions", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: [{ resource, minRole }] }),
    });
    setPermissions(prev => ({ ...prev, [resource]: minRole }));
    showMsg("Permissão atualizada!");
  }

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

  async function saveWebhookName(id: string) {
    await fetch("/api/admin/webhooks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name: editWebhookName }) });
    setEditingWebhook(null);
    loadData(); showMsg("Webhook atualizado!");
  }

  function addInviteZoomId() {
    if (!inviteZoomId.trim()) return;
    setInviteZoomIds(prev => [...prev, inviteZoomId.trim()]);
    setInviteZoomId("");
  }

  function formatWhatsApp(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  const hasPassword = invitePassword.length > 0 || invitePasswordConfirm.length > 0;

  async function inviteUser() {
    if (!inviteName || !inviteEmail || !inviteChurch) { showMsg("Nome, email e igreja são obrigatórios"); return; }
    if (hasPassword && invitePassword !== invitePasswordConfirm) { showMsg("As senhas não coincidem"); return; }
    const zoomIdentifiers = inviteZoomIds.map(v => ({ value: v, type: "EMAIL" }));
    const body: Record<string, unknown> = {
      name: inviteName, email: inviteEmail, church: inviteChurch,
      team: inviteTeam, subTeam: inviteSubTeam, zoomIdentifiers,
      role: inviteRole,
    };
    if (hasPassword) { body.password = invitePassword; body.confirmPassword = invitePasswordConfirm; }
    if (inviteWhatsApp) body.whatsapp = inviteWhatsApp.replace(/\D/g, "");

    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setInviteName(""); setInviteEmail(""); setInviteChurch(""); setInviteTeam(""); setInviteSubTeam("");
      setInviteZoomId(""); setInviteZoomIds([]); setInviteRole("MEMBER");
      setInvitePassword(""); setInvitePasswordConfirm(""); setInviteWhatsApp("");
      loadData(); showMsg(hasPassword ? "Usuário criado!" : "Convite enviado!");
    } else { const d = await res.json(); showMsg(d.error || "Erro"); }
  }

  async function toggleUserActive(id: string, active: boolean) {
    await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) });
    loadData();
  }

  async function saveUserEdit(id: string) {
    if (resetPassword && resetPassword !== resetPasswordConfirm) { showMsg("As senhas não coincidem"); return; }
    const payload: Record<string, unknown> = { id, ...editUserData };
    if (resetPassword) payload.newPassword = resetPassword;
    await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setEditingUser(null); setEditUserData({}); setResetPassword(""); setResetPasswordConfirm("");
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
    if (res.ok) {
      const data = await res.json();
      const hasRetroDates = selectedDates.some(d => d <= todayStr);
      if (hasRetroDates && data.plan?.id) {
        // Abrir modal retroativo obrigatório
        const retroDays = (data.plan.days || [])
          .filter((d: { date: string }) => d.date.split("T")[0] <= todayStr)
          .map((d: { id: string; date: string; chapters: string }) => ({
            dayId: d.id,
            date: d.date.split("T")[0],
            chapters: d.chapters,
          }));
        if (retroDays.length > 0) {
          setRetroModal({ planId: data.plan.id, retroDays });
          setRetroChecks({});
        }
      }
      setSelectedBook(""); setSelectedDates([]); loadData(); showMsg("Plano criado!");
    }
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
    const startDay = (firstDay.getDay() + 6) % 7;
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

  // Auto-fill: select first available date and auto-fill N consecutive days
  function autoFillDates(startDateStr: string) {
    const dates: string[] = [];
    const start = new Date(startDateStr + "T12:00:00");
    let current = new Date(start);
    let filled = 0;

    while (filled < neededDays) {
      const key = current.toISOString().split("T")[0];
      if (key >= todayStr && !usedDates.has(key)) {
        dates.push(key);
        filled++;
      }
      current.setDate(current.getDate() + 1);
      // Safety: don't loop more than 365 days
      if (dates.length === 0 && current.getTime() - start.getTime() > 365 * 86400000) break;
    }
    setSelectedDates(dates.sort());
  }

  function toggleDate(dateStr: string) {
    if (selectedDates.includes(dateStr)) {
      // Deselecting a day: remove it and extend by 1 day at the end
      const remaining = selectedDates.filter(d => d !== dateStr);
      if (remaining.length > 0 && remaining.length < neededDays) {
        const lastDate = new Date(remaining[remaining.length - 1] + "T12:00:00");
        let next = new Date(lastDate);
        next.setDate(next.getDate() + 1);
        let attempts = 0;
        while (remaining.length < neededDays && attempts < 60) {
          const key = next.toISOString().split("T")[0];
          if (!usedDates.has(key) && !remaining.includes(key)) {
            remaining.push(key);
          }
          next.setDate(next.getDate() + 1);
          attempts++;
        }
      }
      setSelectedDates(remaining.sort());
    } else if (selectedDates.length === 0) {
      // First selection: auto-fill from this date
      autoFillDates(dateStr);
    } else if (selectedDates.length > 0 && dateStr < selectedDates[0]) {
      // Clicar antes da data de início = nova data de início, recalcular
      autoFillDates(dateStr);
    } else if (selectedDates.length >= neededDays) {
      // Rotação: remover primeiro dia, adicionar novo no final
      setSelectedDates(prev => [...prev.slice(1), dateStr].sort());
    } else {
      setSelectedDates(prev => [...prev, dateStr].sort());
    }
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

  // Attendance stats calculation
  const userAttendanceMap = new Map<string, { name: string; church: string; team: string; count: number; lastDate: string }>();
  for (const a of attendanceData) {
    const existing = userAttendanceMap.get(a.userId);
    if (existing) {
      existing.count++;
      if (a.joinTime > existing.lastDate) existing.lastDate = a.joinTime;
    } else {
      userAttendanceMap.set(a.userId, {
        name: a.user.name, church: a.user.church, team: a.user.team,
        count: 1, lastDate: a.joinTime,
      });
    }
  }

  const totalUniqueAttendees = userAttendanceMap.size;
  const totalAttendances = attendanceData.length;

  // Weekly chart data for attendance
  function getWeeklyChartData() {
    if (!attendanceMonth) return [];
    const [y, m] = attendanceMonth.split("-").map(Number);
    const weeks: { week: string; count: number }[] = [];
    const daysInMonth = new Date(y, m, 0).getDate();

    for (let w = 0; w < 5; w++) {
      const startDay = w * 7 + 1;
      const endDay = Math.min((w + 1) * 7, daysInMonth);
      if (startDay > daysInMonth) break;

      const weekStart = new Date(y, m - 1, startDay);
      const weekEnd = new Date(y, m - 1, endDay, 23, 59, 59);

      const weekAttendances = attendanceData.filter(a => {
        const d = new Date(a.joinTime);
        return d >= weekStart && d <= weekEnd;
      });

      weeks.push({
        week: `Sem ${w + 1}`,
        count: weekAttendances.length,
      });
    }
    return weeks;
  }

  // Unique values for filters
  const uniqueChurches = [...new Set(users.map(u => u.church).filter(Boolean))];
  const uniqueTeams = [...new Set(users.map(u => u.team).filter(Boolean))];
  const uniqueSubTeams = [...new Set(users.map(u => u.subTeam).filter(Boolean))];

  // Filtered attendance users
  const filteredAttendanceUsers = [...userAttendanceMap.entries()]
    .filter(([, data]) => {
      if (attendanceSearch) {
        return data.name.toLowerCase().includes(attendanceSearch.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => b[1].count - a[1].count);

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}><p style={{ color: "var(--text-muted)" }}>Carregando...</p></div>;

  return (
    <>
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontWeight: 700, fontSize: 22, color: "var(--text)" }}>Administração</h1>
        {msg && <span className="badge badge-success">{msg}</span>}
      </div>

      {/* Tabs */}
      <div>
        <div className="tabs-list">
          {([
            { key: "zoom", label: "Config. Zoom", icon: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a7.723 7.723 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
            { key: "schedule", label: "Horários", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" },
            { key: "webhooks", label: "Webhooks", icon: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.9-3.572a4.5 4.5 0 00-6.364-6.364L4.5 8.25a4.5 4.5 0 006.364 6.364l4.5-4.5z" },
            { key: "users", label: "Usuários", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
            { key: "reading", label: "Leitura", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
            { key: "attendance", label: "Presença", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { key: "ia", label: "IA", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" },
            { key: "permissions", label: "Permissões", icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" },
            { key: "subscriptions", label: "Assinaturas", icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" },
            { key: "engagement", label: "Engajamento", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
          ] as { key: Tab; label: string; icon: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`tab-trigger ${tab === t.key ? "active" : ""}`}>
              <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>

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
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Funcionalidades</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={(settings.engagementEnabled ?? "true") !== "false"}
                    onChange={(e) => saveSetting("engagementEnabled", e.target.checked ? "true" : "false")}
                    style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Ativar "Sua Jornada" (streaks + conquistas)</span>
                </label>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 26 }}>
                  Exibe o módulo de engajamento com streaks de leitura e conquistas no dashboard. Linha ausente = habilitado por padrão.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Horários ─── */}
        {tab === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Horários dos Devocionais</div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
                Configure o horário de cada dia da semana. Segunda a Sexta são obrigatórios.
              </p>
              <div className="time-picker-grid">
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day, i) => {
                  const labels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
                  const isWeekend = i >= 5;
                  const key = `schedule_${day}`;
                  return (
                    <div key={day} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: isWeekend ? "var(--text-muted)" : "var(--text)" }}>
                        {labels[i]} {!isWeekend && <span style={{ color: "var(--accent)" }}>*</span>}
                      </label>
                      <input
                        type="time"
                        className="input-field"
                        value={settings[key] || ""}
                        onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ fontSize: 15 }}
                      />
                    </div>
                  );
                })}
              </div>
              <button
                className="btn-primary"
                style={{ marginTop: 16 }}
                onClick={async () => {
                  // Validate weekdays
                  const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
                  const missing = weekdays.filter(d => !settings[`schedule_${d}`]);
                  if (missing.length > 0) {
                    showMsg("Preencha todos os dias úteis (Seg-Sex)");
                    return;
                  }
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
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, fontFamily: "monospace" }}>
                  Preview: {baseUrl}/api/webhook/{newWebhookSlug.toLowerCase().replace(/[^a-z0-9-]/g, "")}
                </div>
              )}
            </div>

            {webhooks.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>Nenhum webhook cadastrado</p>
            ) : (
              webhooks.map(w => {
                const webhookUrl = `${baseUrl}/api/webhook/${w.slug}`;
                return (
                  <div key={w.id} className="section-card" style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          {editingWebhook === w.id ? (
                            <div style={{ display: "flex", gap: 6, flex: 1 }}>
                              <input className="input-field" value={editWebhookName} onChange={e => setEditWebhookName(e.target.value)} style={{ flex: 1 }} />
                              <button className="btn-icon" onClick={() => saveWebhookName(w.id)} style={{ color: "var(--success)", borderColor: "var(--success-border)" }}>
                                <IconCheck size={14} />
                              </button>
                              <button className="btn-icon" onClick={() => setEditingWebhook(null)}>
                                <IconX size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span style={{ fontWeight: 600, fontSize: 16, color: "var(--text)" }}>{w.name}</span>
                              <button className="btn-icon" onClick={() => { setEditingWebhook(w.id); setEditWebhookName(w.name); }} style={{ width: 28, height: 28 }}>
                                <IconPencil size={12} />
                              </button>
                            </>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <code style={{ fontSize: 14, color: "var(--accent)", wordBreak: "break-all", flex: 1 }}>{webhookUrl}</code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(webhookUrl, w.id)}
                            title="Copiar URL"
                            style={{ flexShrink: 0, color: copied === w.id ? "var(--success)" : "var(--text-muted)", borderColor: copied === w.id ? "var(--success-border)" : "var(--border)" }}
                          >
                            {copied === w.id ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          </button>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
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
            {/* Invite form */}
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Novo Usuário</div>
              <div className="admin-grid-2">
                <input className="input-field" value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Nome completo *" />
                <input className="input-field" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email *" type="email" />
                <input className="input-field" value={inviteChurch} onChange={e => setInviteChurch(e.target.value)} placeholder="Igreja *" />
                <input className="input-field" value={inviteTeam} onChange={e => setInviteTeam(e.target.value)} placeholder="Equipe" />
                <input className="input-field" value={inviteSubTeam} onChange={e => setInviteSubTeam(e.target.value)} placeholder="SubEquipe" />
                <select className="input-field" value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ cursor: "pointer" }}>
                  {ALL_ROLES.filter(r => r.value !== "SUPER_ADMIN").map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Zoom identifiers com + */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Identificadores Zoom</div>
                {inviteZoomIds.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {inviteZoomIds.map((zi, idx) => (
                      <span key={idx} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "4px 10px", borderRadius: 6,
                        backgroundColor: "var(--accent-light)", color: "var(--accent)",
                        fontSize: 13, fontWeight: 500,
                      }}>
                        {zi}
                        <button onClick={() => setInviteZoomIds(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: 0 }}>
                          <IconX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="input-field" value={inviteZoomId} onChange={e => setInviteZoomId(e.target.value)} placeholder="Email/Username do Zoom" style={{ flex: 1 }}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addInviteZoomId(); } }}
                  />
                  <button className="btn-icon" onClick={addInviteZoomId} style={{ color: "var(--success)", borderColor: "var(--success-border)" }}>
                    <IconPlus size={14} />
                  </button>
                </div>
              </div>

              {/* WhatsApp */}
              <div style={{ marginTop: 12 }}>
                <input className="input-field" value={inviteWhatsApp} onChange={e => setInviteWhatsApp(formatWhatsApp(e.target.value))} placeholder="WhatsApp (DDD + número)" style={{ maxWidth: 280 }} />
              </div>

              {/* Campos de senha */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Senha (opcional — se preenchido, cria usuário sem enviar convite)</div>
                <div className="admin-grid-2">
                  <input className="input-field" type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Criar Senha" />
                  <input className="input-field" type="password" value={invitePasswordConfirm} onChange={e => setInvitePasswordConfirm(e.target.value)} placeholder="Confirmar Senha" />
                </div>
                {hasPassword && invitePassword !== invitePasswordConfirm && invitePasswordConfirm.length > 0 && (
                  <div style={{ fontSize: 13, color: "var(--error)", marginTop: 4 }}>As senhas não coincidem</div>
                )}
              </div>

              <button className="btn-primary" onClick={inviteUser} style={{ marginTop: 14, width: "auto", padding: "10px 24px" }}>
                {hasPassword ? "Criar Usuário" : "Enviar Convite"}
              </button>
            </div>

            {/* Users list with search */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Usuários ({filteredUsers.length})</div>
              <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
                <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                  <IconSearch size={16} />
                </div>
                <input
                  className="search-input"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Buscar..."
                />
              </div>
            </div>
            {filteredUsers.map(u => {
              const roleLabel = ALL_ROLES.find(r => r.value === u.role)?.label || u.role;
              const isUserAdmin = checkIsAdmin(u.role as UserRoleType);
              return (
                <div key={u.id} className="section-card" style={{ padding: 16 }}>
                  {editingUser === u.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="admin-grid-2">
                        <input className="input-field" value={editUserData.name ?? u.name} onChange={e => setEditUserData(p => ({ ...p, name: e.target.value }))} placeholder="Nome" />
                        <input className="input-field" value={editUserData.email ?? u.email} onChange={e => setEditUserData(p => ({ ...p, email: e.target.value }))} placeholder="Email" type="email" />
                        <input className="input-field" value={editUserData.church ?? u.church} onChange={e => setEditUserData(p => ({ ...p, church: e.target.value }))} placeholder="Igreja" />
                        <input className="input-field" value={editUserData.team ?? u.team} onChange={e => setEditUserData(p => ({ ...p, team: e.target.value }))} placeholder="Equipe" />
                        <input className="input-field" value={editUserData.subTeam ?? u.subTeam} onChange={e => setEditUserData(p => ({ ...p, subTeam: e.target.value }))} placeholder="SubEquipe" />
                        <select className="input-field" value={editUserData.role ?? u.role} onChange={e => setEditUserData(p => ({ ...p, role: e.target.value }))} style={{ cursor: "pointer" }}>
                          {ALL_ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Identificadores Zoom</div>
                      {u.zoomIdentifiers.map(zi => (
                        <div key={zi.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <code style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>{zi.value}</code>
                          <button className="btn-icon" onClick={() => removeZoomIdentifier(u.id, zi.id)} style={{ width: 28, height: 28 }}>
                            <IconX size={12} />
                          </button>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 6 }}>
                        <input className="input-field" value={newZoomId} onChange={e => setNewZoomId(e.target.value)} placeholder="Adicionar email/username do Zoom" style={{ flex: 1 }} />
                        <button className="btn-icon" onClick={() => addZoomIdentifier(u.id)} style={{ color: "var(--success)", borderColor: "var(--success-border)" }}>
                          <IconPlus size={14} />
                        </button>
                      </div>
                      {/* Redefinir senha */}
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Redefinir Senha</div>
                        <div className="admin-grid-2">
                          <input className="input-field" type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Nova senha" />
                          <input className="input-field" type="password" value={resetPasswordConfirm} onChange={e => setResetPasswordConfirm(e.target.value)} placeholder="Confirmar nova senha" />
                        </div>
                        {resetPassword && resetPasswordConfirm && resetPassword !== resetPasswordConfirm && (
                          <div style={{ fontSize: 13, color: "var(--error)", marginTop: 4 }}>As senhas não coincidem</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn-ghost" onClick={() => { setEditingUser(null); setEditUserData({}); setResetPassword(""); setResetPasswordConfirm(""); }}>Cancelar</button>
                        <button className="btn-primary" onClick={() => saveUserEdit(u.id)}>Salvar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="avatar-sm" style={{ width: 44, height: 44, fontSize: 16, overflow: "hidden" }}>
                        {(u as unknown as { photoUrl?: string }).photoUrl ? (
                          <img src={`/api/profile/photo/${u.id}?size=thumbnail`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          u.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 16, color: "var(--text)" }}>{u.name}</span>
                          <span className={`badge badge-${isUserAdmin ? "warning" : "info"}`}>
                            {roleLabel}
                          </span>
                          {u.inviteToken && <span className="badge" style={{ backgroundColor: "var(--warning-bg)", color: "var(--warning)", borderColor: "var(--warning-border)" }}>Pendente</span>}
                          {!u.active && <span className="badge badge-error">Inativo</span>}
                        </div>
                        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{u.email}</div>
                        {(u.church || u.team) && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {[u.church, u.team, u.subTeam].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        {u.zoomIdentifiers.length > 0 && (
                          <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}>
                            Zoom: {u.zoomIdentifiers.map(z => z.value).join(", ")}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => setJourneyUserId(u.id)}
                          className="btn-outline"
                          title="Ver jornada"
                          style={{ padding: "4px 10px", fontSize: 13 }}
                        >
                          Ver Jornada
                        </button>
                        <div className="tooltip-wrapper">
                          <button className="btn-icon" onClick={() => { setEditingUser(u.id); setEditUserData({}); setNewZoomId(""); }}>
                            <IconPencil size={14} />
                          </button>
                          <span className="tooltip">Editar</span>
                        </div>
                        {!isUserAdmin && (
                          <>
                            <div className="tooltip-wrapper">
                              <button
                                className={`toggle-switch ${u.active ? "active" : ""}`}
                                onClick={() => toggleUserActive(u.id, !u.active)}
                              />
                              <span className="tooltip">{u.active ? "Desativar acesso" : "Ativar acesso"}</span>
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
              );
            })}
          </div>
        )}

        {/* ─── TAB: Plano de Leitura ─── */}
        {tab === "reading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Criar Plano de Leitura</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

                {selectedBook && (
                  <div>
                    <label className="label">Capítulos por dia</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <button
                          key={n}
                          onClick={() => { setChaptersPerDay(n); setSelectedDates([]); }}
                          style={{
                            width: 42, height: 42, borderRadius: 10,
                            border: chaptersPerDay === n ? "2px solid #d97706" : "1px solid #e7e5e4",
                            backgroundColor: chaptersPerDay === n ? "#fffbeb" : "#fff",
                            color: chaptersPerDay === n ? "#d97706" : "#44403c",
                            fontWeight: chaptersPerDay === n ? 700 : 500,
                            fontSize: 15, cursor: "pointer",
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 10,
                      marginTop: 10,
                      padding: 12,
                      borderRadius: 10,
                      background: "var(--surface-hover)",
                    }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{selectedBookData?.chapters}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Capítulos</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{neededDays}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Dias necessários</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                          {selectedDates.length > 0
                            ? new Date(selectedDates[selectedDates.length - 1]).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                            : "—"}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Previsão término</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedBook && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <button className="btn-icon" onClick={() => { if (planMonth === 0) { setPlanMonth(11); setPlanYear(y => y - 1); } else setPlanMonth(m => m - 1); }}>
                        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                      </button>
                      <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>{MONTHS[planMonth]} {planYear}</span>
                      <button className="btn-icon" onClick={() => { if (planMonth === 11) { setPlanMonth(0); setPlanYear(y => y + 1); } else setPlanMonth(m => m + 1); }}>
                        <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                      {DAYS_NAMES.map(d => (
                        <div key={d} style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", padding: 6 }}>{d}</div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                      {getCalendarDays().map((day, i) => {
                        if (day === null) return <div key={`e-${i}`} />;
                        const dateStr = `${planYear}-${String(planMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isPast = dateStr < todayStr;
                        const isUsed = usedDates.has(dateStr);
                        const isSelected = selectedDates.includes(dateStr);
                        const disabled = isUsed; // Permitir datas passadas para criação retroativa

                        return (
                          <button
                            key={dateStr}
                            onClick={() => !disabled && toggleDate(dateStr)}
                            disabled={disabled}
                            style={{
                              width: "100%", aspectRatio: "1", borderRadius: 10,
                              border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border, rgba(128,128,128,0.15))",
                              backgroundColor: isSelected ? "rgba(245,166,35,0.1)" : isUsed ? "var(--surface-hover)" : "var(--surface)",
                              color: isSelected ? "var(--accent)" : isUsed ? "var(--text-muted)" : isPast ? "var(--text-muted)" : "var(--text)",
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: 15, cursor: disabled ? "default" : "pointer",
                              opacity: disabled ? 0.4 : 1,
                              transition: "all 0.15s ease",
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
                  <button
                    onClick={createReadingPlan}
                    style={{
                      width: "100%",
                      padding: "12px 24px",
                      borderRadius: 10,
                      border: "none",
                      background: "linear-gradient(135deg, var(--accent), var(--accent-hover))",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(245,166,35,0.3)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    Criar Plano — {selectedDates.length} dias
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
                        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{plan.bookName}</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {plan.chaptersPerDay} cap/dia · {new Date(plan.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} → {new Date(plan.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Percentual circular */}
                      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width={40} height={40} style={{ transform: "rotate(-90deg)" }}>
                          <circle cx={20} cy={20} r={16} fill="none" stroke="var(--border, rgba(128,128,128,0.15))" strokeWidth={3} />
                          <circle cx={20} cy={20} r={16} fill="none" stroke={book?.color || "var(--accent)"} strokeWidth={3} strokeDasharray={100.53} strokeDashoffset={100.53 - (progress / 100) * 100.53} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.4s" }} />
                        </svg>
                        <span style={{ position: "absolute", fontSize: 10, fontWeight: 700, color: "var(--text)" }}>{progress}%</span>
                      </div>
                      <span className={`badge badge-${plan.status === "COMPLETED" ? "success" : plan.status === "IN_PROGRESS" ? "warning" : "info"}`}>
                        {plan.status === "COMPLETED" ? "Concluído" : plan.status === "IN_PROGRESS" ? "Em andamento" : "Próximo"}
                      </span>
                      <button className="btn-ghost" title="Editar plano" onClick={() => {
                        setSelectedBook(plan.bookCode);
                        setChaptersPerDay(plan.chaptersPerDay);
                        setEditingPlanId(plan.id);
                      }}>
                        <IconPencil size={14} />
                      </button>
                      <button className="btn-danger" onClick={() => deleteReadingPlan(plan.id)}>
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        {completedDays} de {plan.days.length} dias ({progress}%)
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: book?.color || "var(--accent)" }}>
                        {completedDays * plan.chaptersPerDay} de {plan.totalChapters} capítulos
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, backgroundColor: "var(--surface-hover)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, backgroundColor: book?.color || "var(--accent)", width: `${progress}%`, transition: "width 0.3s" }} />
                    </div>
                  </div>

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

        {/* ─── Modal Retroativo ─── */}
        {retroModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, width: "90vw", maxWidth: 500, maxHeight: "80vh", overflowY: "auto" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Dias Retroativos</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>Marque os capítulos que já foram lidos nos dias passados:</p>
              {retroModal.retroDays.map((day) => (
                <div key={day.dayId} style={{ padding: "10px 0", borderBottom: "1px solid var(--border, rgba(128,128,128,0.1))" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                      {new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Cap. {day.chapters}</span>
                  </div>
                  <div
                    role="checkbox"
                    aria-checked={!!retroChecks[day.dayId]}
                    tabIndex={0}
                    onClick={() => setRetroChecks(prev => ({ ...prev, [day.dayId]: !prev[day.dayId] }))}
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setRetroChecks(prev => ({ ...prev, [day.dayId]: !prev[day.dayId] })); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 8, cursor: "pointer",
                      background: retroChecks[day.dayId] ? "rgba(34,197,94,0.1)" : "transparent",
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: `2px solid ${retroChecks[day.dayId] ? "var(--success)" : "var(--border, rgba(128,128,128,0.3))"}`,
                      background: retroChecks[day.dayId] ? "var(--success)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {retroChecks[day.dayId] && (
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                    <span style={{ fontSize: 14, color: "var(--text)" }}>Lido</span>
                  </div>
                </div>
              ))}
              <button
                onClick={async () => {
                  const completedDayIds = Object.entries(retroChecks).filter(([, v]) => v).map(([k]) => k);
                  await fetch(`/api/admin/reading-plans/${retroModal.planId}/retroactive`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ completedDayIds }),
                  });
                  setRetroModal(null);
                  loadData();
                  showMsg("Dias retroativos salvos!");
                }}
                style={{
                  width: "100%", marginTop: 16, padding: "12px 24px", borderRadius: 10,
                  border: "none", background: "var(--accent)", color: "#fff",
                  fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}
              >
                Salvar ({Object.values(retroChecks).filter(Boolean).length} dias marcados)
              </button>
            </div>
          </div>
        )}

        {/* ─── Popup Horário Dia Bloqueado ─── */}
        {timePopup && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={() => setTimePopup(null)}>
            <div style={{ background: "var(--surface)", borderRadius: 14, padding: 20, width: "90vw", maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Definir Horário</h4>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>Defina o horário para {timePopup.dayName}:</p>
              <input
                type="time"
                value={timePopupValue}
                onChange={(e) => setTimePopupValue(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: "1px solid var(--border, rgba(128,128,128,0.2))",
                  background: "var(--surface)", color: "var(--text)",
                  fontSize: 16, marginBottom: 14,
                }}
              />
              <button
                onClick={async () => {
                  await fetch("/api/admin/settings", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: `schedule:${timePopup.dayName}`, value: timePopupValue }),
                  });
                  setTimePopup(null);
                  showMsg(`Horário ${timePopupValue} salvo para ${timePopup.dayName}`);
                }}
                style={{
                  width: "100%", padding: "10px 20px", borderRadius: 8,
                  border: "none", background: "var(--accent)", color: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB: Presença (REDESIGN COMPLETO) ─── */}
        {tab === "attendance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Stats topo */}
            <div className="attendance-stats">
              <div className="stat-card">
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>{totalAttendances}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Total de Presenças</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)" }}>{totalUniqueAttendees}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Membros Presentes</div>
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
                  {users.length > 0 ? Math.round((totalUniqueAttendees / users.filter(u => u.role !== "ADMIN").length) * 100) : 0}%
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Participação</div>
              </div>
            </div>

            {/* Filtros */}
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Filtros</div>
              <div className="admin-grid-2">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Mês</label>
                  <input type="month" className="input-field" value={attendanceMonth} onChange={e => setAttendanceMonth(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Igreja</label>
                  <select className="input-field" value={attendanceChurch} onChange={e => setAttendanceChurch(e.target.value)} style={{ cursor: "pointer" }}>
                    <option value="">Todas</option>
                    {uniqueChurches.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Equipe</label>
                  <select className="input-field" value={attendanceTeam} onChange={e => setAttendanceTeam(e.target.value)} style={{ cursor: "pointer" }}>
                    <option value="">Todas</option>
                    {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>SubEquipe</label>
                  <select className="input-field" value={attendanceSubTeam} onChange={e => setAttendanceSubTeam(e.target.value)} style={{ cursor: "pointer" }}>
                    <option value="">Todas</option>
                    {uniqueSubTeams.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              </div>
              {/* Search by name */}
              <div style={{ position: "relative", marginTop: 12 }}>
                <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
                  <IconSearch size={16} />
                </div>
                <input
                  className="search-input"
                  value={attendanceSearch}
                  onChange={e => setAttendanceSearch(e.target.value)}
                  placeholder="Buscar por nome..."
                />
              </div>
            </div>

            {/* Gráfico semanal */}
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Presença por Semana</div>
              {attendanceLoading ? (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  Carregando...
                </div>
              ) : (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getWeeklyChartData()} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                      <XAxis dataKey="week" tick={{ fontSize: 13, fill: "#78716c" }} />
                      <YAxis tick={{ fontSize: 13, fill: "#78716c" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e7e5e4", borderRadius: 10, fontSize: 14 }}
                        formatter={(value) => [`${value} presenças`, "Total"]}
                      />
                      <Bar dataKey="count" fill="#d97706" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Users attendance cards */}
            <div className="section-title">Presença por Usuário ({filteredAttendanceUsers.length})</div>
            {filteredAttendanceUsers.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>Nenhuma presença registrada no período</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {filteredAttendanceUsers.map(([userId, data]) => (
                  <div key={userId} className="section-card" style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div className="avatar-sm" style={{ width: 36, height: 36, fontSize: 14 }}>
                        {data.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{data.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{data.church}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{data.count}</span>
                        <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: 4 }}>presenças</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Última: {new Date(data.lastDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* ─── TAB: Configuração de IA ─── */}
        {tab === "ia" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Modelo de IA</div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
                Selecione o modelo OpenAI para processamento de transcrições, pesquisa teológica e extração de senha.
                Os modelos gratuitos do OpenRouter são usados como fallback automático.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Modelo Principal (OpenAI)
                </label>
                <select
                  className="input-field"
                  value={settings.aiModel || "gpt-4.1-mini"}
                  onChange={async (e) => {
                    const val = e.target.value;
                    await saveSetting("aiModel", val);
                  }}
                  style={{ maxWidth: 400 }}
                >
                  <optgroup label="GPT-4.1 (Mais recentes)">
                    <option value="gpt-4.1-mini">GPT-4.1 Mini — Rápido e econômico</option>
                    <option value="gpt-4.1">GPT-4.1 — Mais capaz, custo moderado</option>
                    <option value="gpt-4.1-nano">GPT-4.1 Nano — Mais rápido e barato</option>
                  </optgroup>
                  <optgroup label="GPT-4o">
                    <option value="gpt-4o">GPT-4o — Multimodal, alta qualidade</option>
                    <option value="gpt-4o-mini">GPT-4o Mini — Versão compacta do 4o</option>
                  </optgroup>
                  <optgroup label="Série o (Raciocínio)">
                    <option value="o4-mini">o4-mini — Raciocínio avançado, compacto</option>
                    <option value="o3">o3 — Raciocínio avançado</option>
                    <option value="o3-mini">o3-mini — Raciocínio avançado, econômico</option>
                  </optgroup>
                </select>
              </div>

              <div style={{ padding: 14, backgroundColor: "var(--surface-hover)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Cascata de Fallback</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8 }}>
                  <div>1. <span style={{ color: "#10b981" }}>OpenAI</span> — <strong>{settings.aiModel || "gpt-4.1-mini"}</strong> (primário)</div>
                  <div>2. <span style={{ color: "#f59e0b" }}>OpenRouter</span> — Nemotron 120B (gratuito)</div>
                  <div>3. <span style={{ color: "#3b82f6" }}>Gemini</span> — 2.5 Flash (gratuito)</div>
                </div>
              </div>
            </div>

            <div className="section-card" style={{ padding: 18 }}>
              <div className="section-title">Status das APIs</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: process.env.NEXT_PUBLIC_HAS_OPENAI === "true" ? "#10b981" : "var(--text-muted)", display: "inline-block" }} />
                  <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>OpenAI — Configurada via variável de ambiente</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }} />
                  <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>OpenRouter — Fallback gratuito</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }} />
                  <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Gemini — Fallback gratuito</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Permissões ─── */}
        {tab === "permissions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {permissionsLoading ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>Carregando permissões...</div>
            ) : (
              <>
                <div className="section-card" style={{ padding: 18 }}>
                  <div className="section-title">Arquivos do Card Devocional</div>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
                    Defina o nível mínimo de acesso para visualizar cada tipo de arquivo.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { resource: "document:bible_text", label: "Texto Bíblico" },
                      { resource: "document:slides", label: "Slides" },
                      { resource: "document:infographic", label: "Mapa Mental" },
                      { resource: "document:video", label: "Vídeo Resumo" },
                      { resource: "document:ai_summary", label: "Resumo IA" },
                    ].map(item => (
                      <div key={item.resource} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
                        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{item.label}</span>
                        <select
                          className="input-field"
                          value={permissions[item.resource] || "MEMBER"}
                          onChange={e => savePermission(item.resource, e.target.value)}
                          style={{ width: 200, cursor: "pointer" }}
                        >
                          {ALL_ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section-card" style={{ padding: 18 }}>
                  <div className="section-title">Menus</div>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
                    Defina o nível mínimo de acesso para cada menu da plataforma.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      { resource: "menu:planning", label: "Planejamento" },
                      { resource: "menu:subscriptions", label: "Assinaturas" },
                    ].map(item => (
                      <div key={item.resource} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
                        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>{item.label}</span>
                        <select
                          className="input-field"
                          value={permissions[item.resource] || "ADMIN"}
                          onChange={e => savePermission(item.resource, e.target.value)}
                          style={{ width: 200, cursor: "pointer" }}
                        >
                          {ALL_ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── TAB: Assinaturas (placeholder) ─── */}
        {tab === "subscriptions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="section-card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg style={{ width: 32, height: 32, color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Assinaturas</h3>
              <p style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 400, margin: "0 auto" }}>
                Funcionalidade em desenvolvimento. Em breve será possível gerenciar planos de assinatura, pagamentos e acessos premium.
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB: Engajamento ─── */}
        {tab === "engagement" && <EngagementTab onSelectUser={setJourneyUserId} />}

      </div>
    </div>

    {journeyUserId && (
      <UserJourneyModal userId={journeyUserId} onClose={() => setJourneyUserId(null)} />
    )}
    </>
  );
}
