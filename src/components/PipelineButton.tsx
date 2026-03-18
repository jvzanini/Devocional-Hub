"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PipelineButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/pipeline/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skipNotebookLM: false }) });
      const data = await res.json();
      if (!res.ok) { setMsg({ t: data.error || "Erro", ok: false }); return; }
      setMsg({ t: "Pipeline iniciado!", ok: true });
      setTimeout(() => { router.refresh(); setMsg(null); }, 3000);
    } catch { setMsg({ t: "Erro de conexão", ok: false }); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={run} disabled={loading} className="btn-primary">
        {loading ? (
          <>
            <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processando...
          </>
        ) : (
          <>
            <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            Executar
          </>
        )}
      </button>
      {msg && (
        <span className={msg.ok ? "badge badge-success" : "badge badge-error"} style={{ fontSize: 12 }}>
          {msg.t}
        </span>
      )}
    </div>
  );
}
