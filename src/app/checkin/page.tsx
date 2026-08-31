import type { Metadata } from "next";

import { Navbar } from "@/components/navbar";
import { CheckinForm } from "@/components/checkin-form";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { utcTodayDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Check-in Hari Ini",
};

export default async function CheckinPage() {
  const user = await requireUser();

  const today = new Date();
  const checkinDate = utcTodayDate();

  const [todayCheckin, lastCheckin, teamMembers] = await Promise.all([
    prisma.checkin.findUnique({
      where: {
        userId_checkinDate: { userId: user.id, checkinDate },
      },
      select: {
        yesterdayUpdate: true,
        todayPlan: true,
        blockerNote: true,
        hasBlocker: true,
      },
    }),
    prisma.checkin.findFirst({
      where: { userId: user.id, checkinDate: { lt: checkinDate } },
      orderBy: { checkinDate: "desc" },
      select: { createdAt: true },
    }),
    user.teamId
      ? prisma.user.findMany({
          where: { teamId: user.teamId, id: { not: user.id } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const dateLabel = today.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let lastLabel: string | null = null;
  if (lastCheckin) {
    lastLabel = lastCheckin.createdAt.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-[#F8FAFC]">
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold text-[#1E3A5F]">
          Check-in Hari Ini — {dateLabel}
        </h1>

        <div className="mt-6">
          <CheckinForm
            hasCheckedInToday={Boolean(todayCheckin)}
            initialData={todayCheckin}
            teamMembers={teamMembers}
          />
        </div>

        {lastLabel && (
          <p className="mt-6 text-sm text-[#475569]">
            Terakhir check-in: {lastLabel}
          </p>
        )}
      </main>
    </div>
  );
}
