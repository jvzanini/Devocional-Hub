"use client";

import React from "react";
import { StudyResources } from "./StudyResources";

interface AnalysisData {
  abordagem: string;
  temas: { titulo: string; versiculos: string; descricao: string }[];
  aplicacoes: string;
  contexto_historico: string;
}

interface ReferenceData {
  label: string;
  text: string;
}

interface PlanningCardProps {
  bookName: string;
  chapter: number;
  analysis: string;      // JSON string
  references: string;    // JSON string
  studyLinks: string[];
  imageUrls: string[];
  themeGroup?: string | null;
}

/** Renderiza markdown básico: **bold**, \n → <br/>, parágrafos */
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return <></>;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        // Separar por \n para line breaks
        const lines = part.split("\n");
        return lines.map((line, j) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < lines.length - 1 && <br />}
          </span>
        ));
      })}
    </>
  );
}

function ImagePlaceholder({ bookName, chapter }: { bookName: string; chapter: number }) {
  return (
    <div className="planning-image-placeholder">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM8.25 8.25h.008v.008H8.25V8.25z" />
      </svg>
      <span>{bookName} {chapter}</span>
    </div>
  );
}

export function PlanningCard({
  bookName,
  chapter,
  analysis,
  references,
  studyLinks,
  imageUrls,
}: PlanningCardProps) {
  let analysisData: AnalysisData = { abordagem: "", temas: [], aplicacoes: "", contexto_historico: "" };
  let refsData: ReferenceData[] = [];

  try {
    analysisData = JSON.parse(analysis);
  } catch {}
  try {
    refsData = JSON.parse(references);
  } catch {}

  const hasImages = imageUrls && imageUrls.length > 0;

  return (
    <div className="planning-card">
      <div className="planning-card-header">
        <h3 className="planning-card-title">{bookName} {chapter}</h3>
      </div>

      {/* Imagens ou placeholders com ícone */}
      <div className="planning-card-images">
        {hasImages ? (
          imageUrls.map((url, i) => (
            <div key={i} className="planning-image-wrapper">
              <img
                src={url}
                alt={`Ilustração ${i + 1} — ${bookName} ${chapter}`}
                loading="lazy"
                className="planning-image"
              />
            </div>
          ))
        ) : (
          <ImagePlaceholder bookName={bookName} chapter={chapter} />
        )}
      </div>

      <div className="planning-card-body">
        {analysisData.abordagem && (
          <div className="planning-card-section">
            <h4>Como Abordar</h4>
            <p>{renderMarkdown(analysisData.abordagem)}</p>
          </div>
        )}

        {analysisData.temas && analysisData.temas.length > 0 && (
          <div className="planning-card-section">
            <h4>Temas</h4>
            {analysisData.temas.map((tema, i) => (
              <div key={i} style={{ marginBottom: "12px" }}>
                <p style={{ fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>
                  {tema.titulo} {tema.versiculos && <span style={{ fontWeight: 400, fontSize: "13px", color: "var(--text-secondary)" }}>(v. {tema.versiculos})</span>}
                </p>
                <p>{renderMarkdown(tema.descricao)}</p>
              </div>
            ))}
          </div>
        )}

        {analysisData.contexto_historico && (
          <div className="planning-card-section">
            <h4>Contexto Histórico</h4>
            <p>{renderMarkdown(analysisData.contexto_historico)}</p>
          </div>
        )}

        {analysisData.aplicacoes && (
          <div className="planning-card-section">
            <h4>Aplicações Práticas</h4>
            <p>{renderMarkdown(analysisData.aplicacoes)}</p>
          </div>
        )}

        {refsData.length > 0 && (
          <div className="planning-card-section">
            <h4>Referências Bíblicas</h4>
            <div className="planning-references">
              {refsData.map((ref, i) => (
                <div key={i} className="planning-reference">
                  <div className="planning-reference-label">{ref.label}</div>
                  <div className="planning-reference-text">{ref.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <StudyResources links={studyLinks} />
      </div>
    </div>
  );
}
