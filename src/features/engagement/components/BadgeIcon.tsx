import type { IconId } from "../lib/types";

export function BadgeIcon({ id, size = 24 }: { id: IconId; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (id) {
    case "footprints":
      return (<svg {...common}><path d="M4 16c.5-2 2-3 4-3s3.5 1 4 3-1 4-3 4-4-2-5-4z"/><path d="M14 8c.5-2 2-3 4-3s3.5 1 4 3-1 4-3 4-4-2-5-4z"/></svg>);
    case "flame3":
    case "flame7":
    case "flame15":
      return (<svg {...common}><path d="M12 2s4 5 4 9a4 4 0 11-8 0c0-2 1-3 2-4 0 0-1 3 1 4 2 1 3-2 1-5-1-1-1-2 0-4z"/></svg>);
    case "medal10":
    case "medal30":
      return (<svg {...common}><circle cx="12" cy="14" r="6"/><path d="M8 14l-2 8 6-3 6 3-2-8"/><path d="M7 5h10l-2 4H9z"/></svg>);
    case "bookOpen":
      return (<svg {...common}><path d="M2 4h8a3 3 0 013 3v13a2 2 0 00-2-2H2V4z"/><path d="M22 4h-8a3 3 0 00-3 3v13a2 2 0 012-2h9V4z"/></svg>);
  }
}
