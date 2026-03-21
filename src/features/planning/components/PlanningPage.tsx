"use client";

import { useState, useEffect } from "react";
import { PlanningCard } from "./PlanningCard";
import { ThemeGroup } from "./ThemeGroup";

interface PlanningCardData {
  id: string;
  bookName: string;
  bookCode: string;
  chapter: number;
  analysis: string;
  references: string;
  studyLinks: string[];
  imageUrls: string[];
  themeGroup: string | null;
}

interface PlanData {
  id: string;
  bookName: string;
  bookCode: string;
  status: string;
  planningCards: PlanningCardData[];
}

export function PlanningPage() {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
  }, []);

  async function loadPlan() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/planning/current");
      if (!res.ok) throw new Error("Erro ao carregar plano");
      const data = await res.json();
      setPlan(data.plan);
    } catch (err) {
      console.error("[PlanningPage] Erro:", err);
      setError("Erro ao carregar planejamento");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    if (!plan) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/planning/generate/${plan.id}`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao gerar cards");
      const data = await res.json();
      alert(`${data.generated} card(s) gerado(s) com sucesso!`);
      await loadPlan();
    } catch (err) {
      console.error("[PlanningPage] Erro ao gerar:", err);
      setError("Erro ao gerar cards de planejamento");
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="planning-page">
        <div className="planning-header">
          <h1>Planejamento</h1>
          <p>Carregando...</p>
        </div>
        <div className="planning-cards">
          {[1, 2, 3].map((i) => (
            <div key={i} className="planning-card" style={{ overflow: "hidden" }}>
              <div className="planning-card-header">
                <div className="bible-skeleton-line" style={{ width: 140, height: 20 }} />
              </div>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="bible-skeleton-line" style={{ width: "90%", height: 14 }} />
                <div className="bible-skeleton-line" style={{ width: "75%", height: 14 }} />
                <div className="bible-skeleton-line" style={{ width: "60%", height: 14 }} />
                <div className="bible-skeleton-line" style={{ width: "80%", height: 14, marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="planning-page">
        <div className="planning-header">
          <h1>Planejamento</h1>
        </div>
        <div className="planning-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <h3>Nenhum plano de leitura encontrado</h3>
          <p>Crie um plano de leitura no painel admin para começar o planejamento.</p>
        </div>
      </div>
    );
  }

  const cards = plan.planningCards || [];
  const hasCards = cards.length > 0;

  // Agrupar por tema quando disponível
  const grouped = new Map<string, PlanningCardData[]>();
  const ungrouped: PlanningCardData[] = [];

  for (const card of cards) {
    if (card.themeGroup) {
      if (!grouped.has(card.themeGroup)) {
        grouped.set(card.themeGroup, []);
      }
      grouped.get(card.themeGroup)!.push(card);
    } else {
      ungrouped.push(card);
    }
  }

  return (
    <div className="planning-page">
      <div className="planning-header">
        <h1>Planejamento — {plan.bookName}</h1>
        <p>
          {hasCards
            ? `${cards.length} card(s) de planejamento gerados`
            : "Nenhum card gerado ainda"}
        </p>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--radius)",
          background: "rgba(239, 68, 68, 0.1)",
          color: "var(--error)",
          marginBottom: "16px",
          fontSize: "14px",
        }}>
          {error}
        </div>
      )}

      {!hasCards && (
        <div className="planning-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <h3>Cards ainda não gerados</h3>
          <p>Clique no botão abaixo para gerar a análise teológica de cada capítulo via IA.</p>
          <button
            className="planning-generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
                Gerando...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Gerar Cards via IA
              </>
            )}
          </button>
        </div>
      )}

      {hasCards && (
        <>
          {/* Cards agrupados por tema */}
          {Array.from(grouped.entries()).map(([theme, themeCards]) => (
            <ThemeGroup key={theme} theme={theme}>
              <div className="planning-cards">
                {themeCards.map((card) => (
                  <PlanningCard
                    key={card.id}
                    bookName={card.bookName}
                    chapter={card.chapter}
                    analysis={card.analysis}
                    references={card.references}
                    studyLinks={card.studyLinks}
                    imageUrls={card.imageUrls}
                    themeGroup={card.themeGroup}
                  />
                ))}
              </div>
            </ThemeGroup>
          ))}

          {/* Cards sem agrupamento */}
          <div className="planning-cards">
            {ungrouped.map((card) => (
              <PlanningCard
                key={card.id}
                bookName={card.bookName}
                chapter={card.chapter}
                analysis={card.analysis}
                references={card.references}
                studyLinks={card.studyLinks}
                imageUrls={card.imageUrls}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
