"use client";

const AVATAR_COLORS = ["#f59e0b", "#ea580c", "#059669", "#7c3aed", "#6b7280", "#2563eb", "#db2777", "#0891b2"];

interface Entry {
  id: string;
  joinTime: string;
  leaveTime: string;
  duration: number;
}

interface Participant {
  id: string;
  displayName: string;
  isMember: boolean;
  duration: number;
  totalDuration: number;
  entries: Entry[];
}

interface ParticipantLogProps {
  participants: Participant[];
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  return `${m}min`;
}

function fmtTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ParticipantLog({ participants }: ParticipantLogProps) {
  if (participants.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
        Nenhum participante registrado.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {participants.map((p, idx) => {
        const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
        const hasMultipleEntries = p.entries.length > 1;

        return (
          <div
            key={p.id}
            style={{
              borderBottom: idx < participants.length - 1 ? "1px solid var(--border, rgba(128,128,128,0.12))" : "none",
              paddingBottom: idx < participants.length - 1 ? 14 : 0,
              paddingTop: idx > 0 ? 14 : 0,
            }}
          >
            {/* Nome + Avatar + Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: p.entries.length > 0 ? 8 : 0 }}>
              <div
                className="avatar-md"
                style={{
                  backgroundColor: avatarColor,
                  flexShrink: 0,
                }}
              >
                {p.displayName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>
                  {p.displayName}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {p.isMember ? "Membro" : "Visitante"}
                </div>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 20,
                background: "rgba(16,185,129,0.15)",
                color: "#10b981",
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}>
                <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Total: {fmtDuration(p.totalDuration || p.duration)}
              </div>
            </div>

            {/* Entries (log de entradas/saídas) */}
            {p.entries.length > 0 && (
              <div style={{ marginLeft: 48, display: "flex", flexDirection: "column", gap: 4 }}>
                {p.entries.map((entry, eIdx) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      padding: "4px 0",
                      borderBottom: hasMultipleEntries && eIdx < p.entries.length - 1
                        ? "1px dashed var(--border, rgba(128,128,128,0.1))"
                        : "none",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="var(--success)" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      Entrada: {fmtTime(entry.joinTime)}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="var(--error)" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Saída: {fmtTime(entry.leaveTime)}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {fmtDuration(entry.duration)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
