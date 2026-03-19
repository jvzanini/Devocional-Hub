/**
 * Sincronização de presença — correlaciona participantes do Zoom com usuários da plataforma
 * via ZoomIdentifier (email ou username do Zoom)
 */

import { prisma } from "@/lib/db";

/**
 * Para cada Participant da sessão:
 *   1. Buscar ZoomIdentifier WHERE value == participant.email OR value == participant.name
 *   2. Se achou → criar Attendance(userId, sessionId, ...)
 *   3. Se já existe Attendance(userId, sessionId) → pular
 */
export async function syncAttendanceForSession(sessionId: string): Promise<number> {
  const participants = await prisma.participant.findMany({ where: { sessionId } });
  if (participants.length === 0) return 0;

  const allIdentifiers = await prisma.zoomIdentifier.findMany({
    include: { user: { select: { id: true, active: true } } },
  });

  // Build lookup map: lowercase value -> userId
  const identifierMap = new Map<string, string>();
  for (const zi of allIdentifiers) {
    if (zi.user.active) {
      identifierMap.set(zi.value.toLowerCase(), zi.userId);
    }
  }

  let matched = 0;

  for (const p of participants) {
    // Try matching by email first, then by name
    const candidateValues = [
      p.email?.toLowerCase(),
      p.name.toLowerCase(),
    ].filter(Boolean) as string[];

    let userId: string | undefined;
    for (const val of candidateValues) {
      userId = identifierMap.get(val);
      if (userId) break;
    }

    if (!userId) continue;

    // Check if attendance already exists
    const existing = await prisma.attendance.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
    });

    if (existing) continue;

    await prisma.attendance.create({
      data: {
        userId,
        sessionId,
        joinTime: p.joinTime,
        leaveTime: p.leaveTime,
        duration: p.duration,
      },
    });

    // Lock the ZoomIdentifier after confirmed match
    const matchedVal = candidateValues.find(v => identifierMap.get(v) === userId);
    if (matchedVal) {
      const zi = allIdentifiers.find(z => z.value.toLowerCase() === matchedVal && z.userId === userId);
      if (zi && !zi.locked) {
        await prisma.zoomIdentifier.update({ where: { id: zi.id }, data: { locked: true } });
      }
    }

    matched++;
  }

  console.log(`[AttendanceSync] Sessão ${sessionId}: ${matched} presenças registradas de ${participants.length} participantes`);
  return matched;
}

/**
 * Sync retroativo: quando um usuário adiciona um ZoomIdentifier,
 * buscar todas as sessões passadas e registrar presenças
 */
export async function syncAttendanceForUser(userId: string): Promise<number> {
  const identifiers = await prisma.zoomIdentifier.findMany({
    where: { userId },
    select: { value: true },
  });

  if (identifiers.length === 0) return 0;

  const values = identifiers.map(i => i.value.toLowerCase());

  // Find all participants matching any identifier value
  const participants = await prisma.participant.findMany({
    where: {
      OR: [
        { email: { in: values, mode: "insensitive" } },
        { name: { in: values, mode: "insensitive" } },
      ],
    },
    select: { sessionId: true, joinTime: true, leaveTime: true, duration: true },
  });

  let matched = 0;
  for (const p of participants) {
    const existing = await prisma.attendance.findUnique({
      where: { userId_sessionId: { userId, sessionId: p.sessionId } },
    });
    if (existing) continue;

    await prisma.attendance.create({
      data: {
        userId,
        sessionId: p.sessionId,
        joinTime: p.joinTime,
        leaveTime: p.leaveTime,
        duration: p.duration,
      },
    });

    // Lock ZoomIdentifiers after retroactive match
    for (const identifier of identifiers) {
      await prisma.zoomIdentifier.updateMany({
        where: { userId, value: identifier.value, locked: false },
        data: { locked: true },
      });
    }

    matched++;
  }

  console.log(`[AttendanceSync] Usuário ${userId}: ${matched} presenças retroativas registradas`);
  return matched;
}
