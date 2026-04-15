import { prisma } from "@/shared/lib/db";

export interface ExistingUnlock {
  key: string;
  unlockedAt: Date;
}

/**
 * Persiste as conquistas desbloqueadas de forma idempotente.
 * - `existingBefore`: snapshot das conquistas já desbloqueadas (injetado pelo orquestrador
 *   para evitar double-fetch). Se omitido, busca aqui.
 * - Usa `createMany({ skipDuplicates: true })` para evitar race em uma única query.
 * - Após insert, refaz `findMany` para obter `unlockedAt` oficial e computa
 *   `newlyUnlockedKeys` como diff entre "depois" e "antes" — robusto a race real.
 */
export async function persistUnlocks(
  userId: string,
  evaluatedKeys: string[],
  existingBefore?: ExistingUnlock[]
): Promise<{ allUnlocked: ExistingUnlock[]; newlyUnlockedKeys: string[] }> {
  const before =
    existingBefore ??
    (await prisma.userAchievement.findMany({
      where: { userId },
      select: { key: true, unlockedAt: true },
    }));
  const beforeKeys = new Set(before.map((e) => e.key));
  const toCreate = evaluatedKeys.filter((k) => !beforeKeys.has(k));

  if (toCreate.length > 0) {
    await prisma.userAchievement.createMany({
      data: toCreate.map((key) => ({ userId, key })),
      skipDuplicates: true,
    });
  }

  const after = await prisma.userAchievement.findMany({
    where: { userId },
    select: { key: true, unlockedAt: true },
  });

  const newlyUnlockedKeys = after.filter((a) => !beforeKeys.has(a.key)).map((a) => a.key);

  return {
    allUnlocked: after,
    newlyUnlockedKeys,
  };
}
