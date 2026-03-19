"use client";

import { useState, useCallback, useEffect } from "react";

interface DocItem {
  id: string;
  type: string;
  fileName: string;
  fileSize: number | null;
  isProtected: boolean;
  label: string;
  bg: string;
  color: string;
  border: string;
}

interface Props {
  sessionId: string;
  documents: DocItem[];
  hasPassword: boolean;
}

function fmtSize(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function ProtectedDocuments({ sessionId, documents, hasPassword }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocItem | null>(null);

  const handleDocClick = useCallback((doc: DocItem) => {
    if (doc.isProtected && hasPassword && !unlocked) {
      setShowModal(true);
      return;
    }
    // Se é PDF, mostrar viewer inline
    if (doc.fileName.endsWith(".pdf")) {
      setViewingDoc(doc);
      return;
    }
    // Se é vídeo/áudio, mostrar player inline
    const ext = doc.fileName.split(".").pop()?.toLowerCase() || "";
    if (["mp4", "webm", "wav", "mp3", "ogg"].includes(ext)) {
      setViewingDoc(doc);
      return;
    }
    // Download direto para outros tipos
    window.open(`/api/files/${doc.id}`, "_blank");
  }, [hasPassword, unlocked]);

  const verifyPassword = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.valid) {
        setUnlocked(true);
        setShowModal(false);
        setPassword("");
        sessionStorage.setItem(`unlocked-${sessionId}`, "true");
      } else {
        setError("Senha incorreta. Tente novamente.");
      }
    } catch {
      setError("Erro ao verificar senha.");
    } finally {
      setLoading(false);
    }
  };

  // Verificar sessionStorage ao montar
  useEffect(() => {
    const stored = sessionStorage.getItem(`unlocked-${sessionId}`);
    if (stored === "true") setUnlocked(true);
  }, [sessionId]);

  if (documents.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#a8a29e", textAlign: "center", padding: "14px 0" }}>
        Nenhum arquivo gerado ainda.
      </p>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {documents.map((doc) => {
          const isLocked = doc.isProtected && hasPassword && !unlocked;

          return (
            <div
              key={doc.id}
              onClick={() => handleDocClick(doc)}
              className="file-row"
              style={{
                backgroundColor: doc.bg,
                borderColor: doc.border,
                textDecoration: "none",
                cursor: "pointer",
                opacity: isLocked ? 0.7 : 1,
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: doc.bg, border: `1px solid ${doc.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {isLocked ? (
                    <svg style={{ width: 16, height: 16, color: doc.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  ) : (
                    <svg style={{ width: 16, height: 16, color: doc.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: doc.color }}>
                    {doc.label}
                    {isLocked && <span style={{ fontSize: 11, marginLeft: 6, color: "#a8a29e" }}>(protegido)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#a8a29e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.fileName}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {doc.fileSize && <span style={{ fontSize: 11, color: "#a8a29e" }}>{fmtSize(doc.fileSize)}</span>}
                {isLocked ? (
                  <svg style={{ width: 16, height: 16, color: "#a8a29e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ) : (
                  <svg style={{ width: 16, height: 16, color: "#a8a29e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de senha */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white", borderRadius: 16, padding: 24,
              maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, backgroundColor: "#fef3c7",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg style={{ width: 20, height: 20, color: "#d97706" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1c1917" }}>Conteúdo Protegido</div>
                <div style={{ fontSize: 13, color: "#78716c" }}>Digite a senha do devocional</div>
              </div>
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && verifyPassword()}
              placeholder="Senha..."
              autoFocus
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: error ? "1.5px solid #ef4444" : "1.5px solid #e7e5e4",
                fontSize: 15, outline: "none", marginBottom: 8,
                boxSizing: "border-box",
              }}
            />

            {error && (
              <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 8 }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 10,
                  border: "1px solid #e7e5e4", backgroundColor: "white",
                  fontSize: 14, cursor: "pointer", color: "#57534e",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={verifyPassword}
                disabled={loading || !password}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 10,
                  border: "none", backgroundColor: loading ? "#a8a29e" : "#1c1917",
                  color: "white", fontSize: 14, fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "Verificando..." : "Desbloquear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer inline (PDF / vídeo) */}
      {viewingDoc && (
        <div
          onClick={() => setViewingDoc(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.8)", display: "flex",
            flexDirection: "column", zIndex: 1000,
          }}
        >
          {/* Header do viewer */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", backgroundColor: "rgba(0,0,0,0.6)",
            }}
          >
            <span style={{ color: "white", fontSize: 15, fontWeight: 600 }}>{viewingDoc.label}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <a
                href={`/api/files/${viewingDoc.id}`}
                download={viewingDoc.fileName}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: "6px 14px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)",
                  color: "white", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </a>
              <button
                onClick={() => setViewingDoc(null)}
                style={{
                  padding: "6px 14px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)",
                  color: "white", fontSize: 13, border: "none", cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          >
            {viewingDoc.fileName.endsWith(".pdf") ? (
              <iframe
                src={`/api/files/${viewingDoc.id}`}
                style={{ width: "100%", maxWidth: 900, height: "80vh", borderRadius: 12, border: "none", backgroundColor: "white" }}
                title={viewingDoc.label}
              />
            ) : (
              <video
                controls
                autoPlay
                style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 12 }}
                src={`/api/files/${viewingDoc.id}`}
              >
                Seu navegador não suporta vídeo.
              </video>
            )}
          </div>
        </div>
      )}
    </>
  );
}
