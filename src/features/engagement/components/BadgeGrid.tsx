"use client";

import { useState } from "react";
import type { AchievementView } from "../lib/types";
import { BadgeIcon } from "./BadgeIcon";

interface Props {
  catalog: AchievementView[];
  unlockedKeys: string[];
  recentlyUnlockedKeys?: string[];
}

export function BadgeGrid({ catalog, unlockedKeys, recentlyUnlockedKeys = [] }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const unlocked = new Set(unlockedKeys);
  const recent = new Set(recentlyUnlockedKeys);

  return (
    <div
      role="list"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(44px, 1fr))",
        gap: 12,
        maxWidth: 7 * 56,
      }}
    >
      {catalog.map((a) => {
        const isU = unlocked.has(a.key);
        const isR = recent.has(a.key);
        return (
          <div
            key={a.key}
            role="listitem"
            tabIndex={0}
            onMouseEnter={() => setHovered(a.key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(a.key)}
            onBlur={() => setHovered(null)}
            aria-label={`${a.title} — ${isU ? "desbloqueada" : "bloqueada"}. ${a.description}`}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `2px solid ${isU ? "var(--accent)" : "var(--border)"}`,
              backgroundColor: "var(--surface)",
              color: isU ? "var(--accent)" : "var(--text-muted)",
              opacity: isU ? 1 : 0.45,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: "pointer",
              boxShadow: isR
                ? "0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent)"
                : "none",
              transition: "transform 0.15s",
              outline: "none",
            }}
          >
            <BadgeIcon id={a.iconId} />
            {hovered === a.key && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  color: "var(--text)",
                  zIndex: 5,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                }}
              >
                {a.title}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
