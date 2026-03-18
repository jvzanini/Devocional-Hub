"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PipelineButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleRun() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipNotebookLM: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ text: data.error || "Erro ao executar", type: "error" });
        return;
      }

      setMessage({ text: "Pipeline iniciado!", type: "success" });
      setTimeout(() => {
        router.refresh();
        setMessage(null);
      }, 3000);
    } catch {
      setMessage({ text: "Erro de conexão", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRun}
        disabled={loading}
        aria-label="Executar pipeline de processamento"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-light text-white px-4 py-2 rounded-md text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer active:scale-[0.98]"
        style={{ boxShadow: "0 4px 12px -2px rgba(180, 83, 9, 0.20)" }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processando...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            Executar
          </>
        )}
      </button>

      {message && (
        <span
          role="status"
          className={`text-xs font-medium px-2.5 py-1 rounded-sm animate-fade-in ${
            message.type === "error"
              ? "bg-error-surface text-error border border-red-200"
              : "bg-success-surface text-success border border-emerald-200"
          }`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
