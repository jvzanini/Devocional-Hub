import type { RiskLevel } from "./admin-insights";

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  attention: "Atenção",
  dormant: "Adormecido",
  lost: "Perdido",
};
