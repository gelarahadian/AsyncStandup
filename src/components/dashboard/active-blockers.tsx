type OpenBlocker = {
  id: string;
  reporter: { name: string };
  taggedUser: { name: string } | null;
  checkin: { blockerNote: string | null; checkinDate: Date };
};

export function ActiveBlockers({ blockers }: { blockers: OpenBlocker[] }) {
  if (blockers.length === 0) return null;

  return (
    <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
        Blocker Aktif ({blockers.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {blockers.map((b) => (
          <li
            key={b.id}
            className="rounded-lg border border-amber-200 bg-white p-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-900">
                {b.reporter.name}
              </span>
              <span className="text-slate-400">melaporkan</span>
              <span className="text-amber-700">blocker</span>
              {b.taggedUser && (
                <>
                  <span className="text-slate-400">→ tag ke</span>
                  <span className="font-medium text-[#1E3A5F]">
                    {b.taggedUser.name}
                  </span>
                </>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {b.checkin.checkinDate.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            {b.checkin.blockerNote && (
              <p className="mt-1.5 text-sm text-amber-900">
                {b.checkin.blockerNote}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
