import type { Metadata } from "next";

import { Navbar } from "@/components/navbar";
import { DateFilter } from "@/components/dashboard/date-filter";
import { TeamTimeline } from "@/components/dashboard/team-timeline";
import { ActiveBlockers } from "@/components/dashboard/active-blockers";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { utcTodayDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Ringkasan Tim",
};

function toUTCDate(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const user = await requireUser();
  const { date: dateParam } = await searchParams;

  const todayUTC = utcTodayDate();

  let selected: Date;
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [y, m, d] = dateParam.split("-").map(Number);
    selected = toUTCDate(y, m, d);
  } else {
    selected = todayUTC;
  }

  const [members, checkins, openBlockers] = await Promise.all([
    prisma.user.findMany({
      where: { teamId: user.teamId },
      select: { id: true, name: true, role: true },
    }),
    prisma.checkin.findMany({
      where: { teamId: user.teamId, checkinDate: selected },
      select: {
        id: true,
        userId: true,
        yesterdayUpdate: true,
        todayPlan: true,
        blockerNote: true,
        hasBlocker: true,
      },
    }),
    prisma.blocker.findMany({
      where: { status: "open", checkin: { teamId: user.teamId } },
      select: {
        id: true,
        reportedBy: true,
        taggedTo: true,
        checkin: {
          select: { blockerNote: true, checkinDate: true },
        },
        reporter: { select: { name: true } },
        taggedUser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const dateLabel = selected.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dateISO = selected.toISOString().slice(0, 10);

  return (
    <div className="flex flex-1 flex-col bg-[#F8FAFC]">
      <Navbar user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#1E3A5F]">
              Ringkasan Tim — {dateLabel}
            </h1>
            <p className="mt-1 text-sm text-[#475569]">
              {members.length} anggota tim
            </p>
          </div>
          <DateFilter defaultValue={dateISO} />
        </div>

        <ActiveBlockers blockers={openBlockers} />

        <div className="mt-8">
          <TeamTimeline members={members} checkins={checkins} date={selected} />
        </div>
      </main>
    </div>
  );
}
