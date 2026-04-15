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
    <div className="badge-grid" role="list">
      {catalog.map((a) => {
        const isUnlocked = unlocked.has(a.key);
        const isRecent = recent.has(a.key);
        const classes = ["badge-circle"];
        if (!isUnlocked) classes.push("badge-locked");
        if (isRecent) classes.push("badge-recent");
        return (
          <div
            key={a.key}
            role="listitem"
            className={classes.join(" ")}
            aria-label={`${a.title} — ${isUnlocked ? "desbloqueada" : "bloqueada"}. ${a.description}`}
            tabIndex={0}
            onMouseEnter={() => setHovered(a.key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(a.key)}
            onBlur={() => setHovered(null)}
            style={{ position: "relative" }}
          >
            <BadgeIcon id={a.iconId} />
            {hovered === a.key && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                color: "var(--text)",
                whiteSpace: "nowrap",
                zIndex: 5,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}>
                {a.title}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
