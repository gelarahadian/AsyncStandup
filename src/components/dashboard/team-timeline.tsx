type Member = { id: string; name: string; role: string };
type Checkin = {
  id: string;
  userId: string;
  yesterdayUpdate: string;
  todayPlan: string;
  blockerNote: string | null;
  hasBlocker: boolean;
};

type TeamTimelineProps = {
  members: Member[];
  checkins: Checkin[];
  date: Date;
};

export function TeamTimeline({ members, checkins, date }: TeamTimelineProps) {
  const checkinByUser = new Map(checkins.map((c) => [c.userId, c]));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#475569]">
          Timeline Anggota Tim
        </h2>
      </div>

      <ul className="space-y-3">
        {members.map((m) => {
          const c = checkinByUser.get(m.id);
          return (
            <li
              key={m.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E3A5F]/10 text-sm font-semibold text-[#1E3A5F]">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {m.name}
                    {m.role === "lead" && (
                      <span className="ml-2 rounded bg-[#1E3A5F]/10 px-1.5 py-0.5 text-xs text-[#1E3A5F]">
                        lead
                      </span>
                    )}
                  </p>
                </div>
                {c?.hasBlocker ? (
                  <span className="ml-auto rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                    Blocker
                  </span>
                ) : (
                  <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    Check-in ✓
                  </span>
                )}
              </div>

              {c ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-slate-700">
                    <span className="font-medium text-[#475569]">Kemarin: </span>
                    {c.yesterdayUpdate}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-medium text-[#475569]">Hari ini: </span>
                    {c.todayPlan}
                  </p>
                  {c.hasBlocker && c.blockerNote && (
                    <p className="rounded bg-amber-50 px-2 py-1 text-amber-800">
                      <span className="font-medium">Blocker: </span>
                      {c.blockerNote}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  Belum check-in pada {date.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
