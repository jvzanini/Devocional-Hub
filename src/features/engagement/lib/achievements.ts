import type { Achievement, UserEngagementStats } from "./types";

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: "first_step",
    title: "Primeiro Passo",
    description: "Presente em seu primeiro devocional.",
    iconId: "footprints",
    criterion: (s) => s.totalAttended >= 1,
  },
  {
    key: "streak_3",
    title: "Três em Sequência",
    description: "3 devocionais consecutivos.",
    iconId: "flame3",
    criterion: (s) => s.bestStreak >= 3,
  },
  {
    key: "streak_7",
    title: "Semana Fiel",
    description: "7 devocionais consecutivos.",
    iconId: "flame7",
    criterion: (s) => s.bestStreak >= 7,
  },
  {
    key: "streak_15",
    title: "Constância",
    description: "15 devocionais consecutivos.",
    iconId: "flame15",
    criterion: (s) => s.bestStreak >= 15,
  },
  {
    key: "faithful_10",
    title: "Presente 10x",
    description: "10 devocionais no total.",
    iconId: "medal10",
    criterion: (s) => s.totalAttended >= 10,
  },
  {
    key: "faithful_30",
    title: "Presente 30x",
    description: "30 devocionais no total.",
    iconId: "medal30",
    criterion: (s) => s.totalAttended >= 30,
  },
  {
    key: "book_explorer",
    title: "Explorador da Palavra",
    description: "Participou de devocionais de 5 livros diferentes.",
    iconId: "bookOpen",
    criterion: (s) => s.booksReadCount >= 5,
  },
];

export function evaluateAchievements(stats: UserEngagementStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.criterion(stats)).map((a) => a.key);
}

/** Serializável para Client Components — remove `criterion`. */
export const ACHIEVEMENTS_VIEW: import("./types").AchievementView[] = ACHIEVEMENTS.map(({ criterion, ...rest }) => rest);
