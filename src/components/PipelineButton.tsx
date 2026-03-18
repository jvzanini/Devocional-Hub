"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PipelineButtonProps {
  skipNotebookLM?: boolean;
}

export function PipelineButton({ skipNotebookLM = false }: PipelineButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRun() {
    if (!confirm("Iniciar pipeline? Isso irá buscar a última gravação do Zoom.")) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipNotebookLM }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Erro: ${data.error}`);
        return;
      }

      setMessage(`Pipeline iniciado! Sessão: ${data.sessionId}`);
      setTimeout(() => {
        router.refresh();
        setMessage("");
      }, 3000);
    } catch {
      setMessage("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRun}
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processando...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Executar Pipeline
          </>
        )}
      </button>

      {message && (
        <span className={`text-sm ${message.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
