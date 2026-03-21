"use client";

interface StudyResourcesProps {
  links: string[];
}

export function StudyResources({ links }: StudyResourcesProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className="planning-card-section">
      <h4>Links de Estudo</h4>
      <div className="planning-links">
        {links.map((link, i) => (
          <a
            key={i}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="planning-link"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
            </svg>
            {new URL(link).hostname.replace("www.", "")}
          </a>
        ))}
      </div>
    </div>
  );
}
