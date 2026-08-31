"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { utcTodayDate } from "@/lib/dates";

export type SubmitState = { error?: string };

// Coba ulang query — koneksi serverless Neon driver kadang flaky (intermiten).
const MAX_RETRY = 2;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRY) await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw lastErr;
}

function todayDate(): Date {
  return utcTodayDate();
}

export async function submitCheckin(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const user = await requireUser();

  const yesterdayUpdate = String(formData.get("yesterday") ?? "").trim();
  const todayPlan = String(formData.get("today") ?? "").trim();
  const hasBlocker = formData.get("has_blocker") === "on";
  const blockerNote = hasBlocker
    ? String(formData.get("blocker_note") ?? "").trim()
    : "";
  const taggedTo = String(formData.get("tagged_to") ?? "") || undefined;

  if (!yesterdayUpdate || !todayPlan) {
    return { error: "Kolom 'kemarin' dan 'hari ini' wajib diisi." };
  }
  if (hasBlocker && !blockerNote) {
    return { error: "Tuliskan blocker Anda atau matikan toggle blocker." };
  }

  const checkinDate = todayDate();

  await withRetry(async () => {
    const existing = await prisma.checkin.findUnique({
      where: { userId_checkinDate: { userId: user.id, checkinDate } },
      select: { id: true },
    });

    if (existing) {
      await prisma.checkin.update({
        where: { id: existing.id },
        data: {
          yesterdayUpdate,
          todayPlan,
          blockerNote,
          hasBlocker,
        },
      });
      return;
    }

    await prisma.checkin.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        checkinDate,
        yesterdayUpdate,
        todayPlan,
        blockerNote,
        hasBlocker,
      },
    });
  });

  if (hasBlocker && blockerNote) {
    await withRetry(async () => {
      const checkin = await prisma.checkin.findUnique({
        where: { userId_checkinDate: { userId: user.id, checkinDate } },
        select: { id: true },
      });
      if (!checkin) return;

      await prisma.blocker.create({
        data: {
          checkinId: checkin.id,
          reportedBy: user.id,
          taggedTo: taggedTo ?? null,
          status: "open",
        },
      });
    });
  }

  redirect("/checkin/success");
}
