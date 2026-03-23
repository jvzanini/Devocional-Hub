"use client";

import { useEffect, useRef } from "react";
import type { DiscoveredVersion } from "../lib/version-discovery";

interface VersionSelectorProps {
  versions: DiscoveredVersion[];
  selectedId: string;
  onSelect: (version: DiscoveredVersion) => void;
  onClose: () => void;
  isMobile: boolean;
}

export function VersionSelector({
  versions,
  selectedId,
  onSelect,
  onClose,
  isMobile,
}: VersionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "center" });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fechar ao clicar fora (desktop)
  useEffect(() => {
    if (isMobile) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMobile, onClose]);

  return (
    <div className={`bible-selector-overlay bible-selector-overlay--version ${isMobile ? "bible-selector-overlay--mobile" : ""}`}>
      {isMobile && (
        <div className="bible-selector-backdrop" onClick={onClose} aria-hidden="true" />
      )}
      <div
        ref={containerRef}
        className={`bible-selector ${isMobile ? "bible-selector--sheet" : "bible-selector--dropdown"}`}
        role="listbox"
        aria-label="Selecionar versão da Bíblia"
      >
        <div className="bible-selector-header">
          <h3>Versão</h3>
          <button className="bible-selector-close" onClick={onClose} aria-label="Fechar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="bible-selector-list">
          {versions.map((version) => {
            const isSelected = version.id === selectedId;
            return (
              <button
                key={version.id}
                ref={isSelected ? selectedRef : undefined}
                className={`bible-version-item ${isSelected ? "bible-version-item--selected" : ""}`}
                onClick={() => {
                  onSelect(version);
                  onClose();
                }}
                role="option"
                aria-selected={isSelected}
              >
                <span className="bible-version-abbr">{version.abbreviation}</span>
                <div className="bible-version-details">
                  <span className="bible-version-name">{version.nameLocal || version.name}</span>
                  {version.audioAvailable && (
                    <span className="bible-version-audio-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                      </svg>
                      Áudio
                    </span>
                  )}
                </div>
                {isSelected && (
                  <svg className="bible-version-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
