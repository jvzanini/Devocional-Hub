export interface UserEngagementStats {
  totalAttended: number;
  totalSessionsCompleted: number;
  frequencyPct: number;            // 0..1
  currentStreak: number;
  bestStreak: number;
  lastAttendedAt: Date | null;
  booksReadCount: number;
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  iconId: IconId;
  criterion: (s: UserEngagementStats) => boolean;  // usada APENAS no server; nunca atravessar fronteira Client.
}

/** Subset seguro de Achievement para atravessar fronteira Server→Client (sem função). */
export interface AchievementView {
  key: string;
  title: string;
  description: string;
  iconId: IconId;
}

export type IconId =
  | "footprints"
  | "flame3"
  | "flame7"
  | "flame15"
  | "medal10"
  | "medal30"
  | "bookOpen";

export interface EngagementResult {
  stats: UserEngagementStats;
  allUnlocked: { key: string; unlockedAt: Date }[];
  newlyUnlockedKeys: string[];
  silent: boolean;
}
