"use client";

interface BibleContentProps {
  reference: string;
  htmlContent: string | null;
  isLoading: boolean;
  error: string | null;
}

function LoadingSkeleton() {
  return (
    <div className="bible-content-skeleton">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="bible-skeleton-line"
          style={{ width: `${60 + Math.random() * 40}%`, animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
  );
}

export function BibleContent({
  reference,
  htmlContent,
  isLoading,
  error,
}: BibleContentProps) {
  if (isLoading) {
    return (
      <div className="bible-content">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bible-content">
        <div className="bible-content-error">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p>{error}</p>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Tente novamente ou escolha outra versão.
          </p>
        </div>
      </div>
    );
  }

  if (!htmlContent) {
    return (
      <div className="bible-content">
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>
          Selecione um livro e capítulo para iniciar a leitura.
        </p>
      </div>
    );
  }

  return (
    <div className="bible-content">
      <h2 className="bible-content-title">{reference}</h2>
      <div
        className="bible-content-text"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
