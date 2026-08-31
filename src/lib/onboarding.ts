import "server-only";

import { prisma } from "@/lib/prisma";

// Temukan atau buat "default team" utk user baru. Hingga flow onboarding
// (create/join team) dibangun, semua user baru masuk ke satu default team.
export async function getOrCreateDefaultTeamId(): Promise<string> {
  const defaultName = "Tim Default";
  const existing = await prisma.team.findFirst({
    where: { name: defaultName },
    select: { id: true },
  });
  if (existing) return existing.id;

  return prisma.team.create({
    data: { name: defaultName },
    select: { id: true },
  }).then((t) => t.id);
}
