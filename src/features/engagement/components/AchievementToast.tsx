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
  }, [newKey, silent, newlyUnlockedKeys, allUnlockedKeys]);

  if (toastKeys.length === 0) return null;

  if (toastKeys.length === 1) {
    const a = ACHIEVEMENTS_VIEW.find((x) => x.key === toastKeys[0]);
    return (
      <div className="achievement-toast" role="status" aria-live="polite">
        <div style={{ fontWeight: 700, marginBottom: 4 }}>🎉 Nova conquista!</div>
        <div><strong>{a?.title ?? toastKeys[0]}</strong></div>
        {a && <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{a.description}</div>}
      </div>
    );
  }

  return (
    <div className="achievement-toast" role="status" aria-live="polite">
      <div style={{ fontWeight: 700, marginBottom: 4 }}>🎉 {toastKeys.length} conquistas desbloqueadas!</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        {toastKeys.map((k) => {
          const a = ACHIEVEMENTS_VIEW.find((x) => x.key === k);
          return <li key={k}>{a?.title ?? k}</li>;
        })}
      </ul>
    </div>
  );
}
