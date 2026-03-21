"use client";

import { useState, useEffect, useCallback } from "react";
import { BibleModal } from "./BibleModal";

interface DevocionalContextData {
  bookId: string;
  chapterNumber: number;
  bookName: string;
  referenceLabel: string;
  preferredBibleVersionId?: string;
}

export function BibleBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<DevocionalContextData | null>(null);

  // Carregar contexto devocional ao montar
  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch("/api/bible/context");
        const data = await res.json();
        if (data.context) {
          setContext(data.context);
        }
      } catch (err) {
        console.error("[BibleBubble] Erro ao carregar contexto:", err);
      }
    }
    loadContext();
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <button
        className="bible-bubble"
        onClick={handleOpen}
        aria-label="Abrir Bíblia"
        title="Abrir Bíblia"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      </button>

      <BibleModal
        isOpen={isOpen}
        onClose={handleClose}
        initialBookCode={context?.bookId || "GEN"}
        initialChapter={context?.chapterNumber || 1}
        initialVersionId={context?.preferredBibleVersionId}
      />
    </>
  );
}
