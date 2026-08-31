import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Data Access Layer (DAL) — centralisasi auth check + ambil data user.
// Pola ini direkomendasikan Next.js 16: verifikasi dilakukan sedekat mungkin
// dengan sumber data, bukan hanya di proxy/middleware.

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "member" | "lead";
  teamId: string;
};

// Ambil user yang sedang login (client-safe fields). Kembalikan null bila belum login.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, teamId: true },
  });

  if (!user) return null;
  return { ...user, role: user.role as "member" | "lead" };
});

// Wajib login: redirect ke /login bila tidak ada sesi.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
