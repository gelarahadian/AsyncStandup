import type { Metadata } from "next";
import Link from "next/link";

import { Navbar } from "@/components/navbar";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { utcTodayDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Check-in tersimpan",
};

export default async function CheckinSuccessPage() {
  const user = await requireUser();

  const checkinDate = utcTodayDate();

  const checkin = await prisma.checkin.findUnique({
    where: { userId_checkinDate: { userId: user.id, checkinDate } },
    select: {
      yesterdayUpdate: true,
      todayPlan: true,
      blockerNote: true,
      hasBlocker: true,
    },
  });

  return (
    <div className="flex flex-1 flex-col bg-[#F8FAFC]">
      <Navbar user={user} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            ✓
          </div>
          <h1 className="text-2xl font-semibold text-[#1E3A5F]">
            Check-in tersimpan
          </h1>
          <p className="mt-1 text-sm text-[#475569]">
            Check-in Anda untuk hari ini telah disimpan.
          </p>

          {checkin ? (
            <div className="mt-6 space-y-4 rounded-lg bg-[#F8FAFC] p-4 text-left">
              <div>
                <p className="text-xs font-medium text-[#475569]">
                  KEMARIN
                </p>
                <p className="mt-1 text-sm text-slate-800">
                  {checkin.yesterdayUpdate}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#475569]">
                  HARI INI
                </p>
                <p className="mt-1 text-sm text-slate-800">
                  {checkin.todayPlan}
                </p>
              </div>
              {checkin.hasBlocker && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-700">BLOCKER</p>
                  <p className="mt-1 text-sm text-amber-900">
                    {checkin.blockerNote}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-[#475569]">
              Belum ada check-in yang tersimpan hari ini.
            </p>
          )}

          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-block w-full rounded-lg bg-[#1E3A5F] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#152c49]"
            >
              Lihat Tim
            </Link>
          </div>
          <div className="mt-3">
            <Link
              href="/checkin"
              className="inline-block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-[#475569] transition hover:bg-slate-50"
            >
              Kembali
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
