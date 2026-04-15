"use client";

import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENTS_VIEW } from "../lib/achievements";

const STORAGE_KEY = "devhub-achievement-seen";

interface Props {
  newlyUnlockedKeys: string[];
  silent: boolean;
  allUnlockedKeys: string[];
}

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSeen(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

export function AchievementToast({ newlyUnlockedKeys, silent, allUnlockedKeys }: Props) {
  const [toastKeys, setToastKeys] = useState<string[]>([]);
  const firedRef = useRef(false);
  const newKey = newlyUnlockedKeys.join("|") + "||" + String(silent);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const seen = readSeen();
    if (silent) {
      for (const k of allUnlockedKeys) seen.add(k);
      writeSeen(seen);
      return;
    }
    const unseen = newlyUnlockedKeys.filter((k) => !seen.has(k));
    if (unseen.length === 0) return;
    for (const k of unseen) seen.add(k);
    writeSeen(seen);
    setToastKeys(unseen);
    const t = setTimeout(() => setToastKeys([]), 5000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newKey, silent]);

  if (toastKeys.length === 0) return null;

  const baseStyle: React.CSSProperties = {
    position: "fixed",
    right: 20,
    bottom: 20,
    maxWidth: 320,
    background: "var(--surface)",
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-lg)",
    padding: "14px 18px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
    color: "var(--text)",
    fontSize: 14,
    zIndex: 9998,
  };

  if (toastKeys.length === 1) {
    const a = ACHIEVEMENTS_VIEW.find((x) => x.key === toastKeys[0]);
    return (
      <div style={baseStyle} role="status" aria-live="polite">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>🎉 Nova conquista!</div>
        <div>
          <strong>{a?.title ?? toastKeys[0]}</strong>
        </div>
        {a && (
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            {a.description}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={baseStyle} role="status" aria-live="polite">
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        🎉 {toastKeys.length} conquistas desbloqueadas!
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        {toastKeys.map((k) => {
          const a = ACHIEVEMENTS_VIEW.find((x) => x.key === k);
          return <li key={k}>{a?.title ?? k}</li>;
        })}
      </ul>
    </div>
  );
}
