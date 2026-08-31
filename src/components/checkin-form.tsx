"use client";

import { useActionState, useState } from "react";

import { submitCheckin, type SubmitState } from "@/app/checkin/actions";
import { SubmitButton } from "@/components/submit-button";

type TeamMember = { id: string; name: string };

type CheckinFormProps = {
  hasCheckedInToday: boolean;
  initialData: {
    yesterdayUpdate: string;
    todayPlan: string;
    blockerNote: string | null;
    hasBlocker: boolean;
  } | null;
  teamMembers: TeamMember[];
};

export function CheckinForm({
  hasCheckedInToday,
  initialData,
  teamMembers,
}: CheckinFormProps) {
  const [state, formAction] = useActionState<SubmitState, FormData>(
    submitCheckin,
    {}
  );
  const [showBlocker, setShowBlocker] = useState(
    initialData?.hasBlocker ?? false
  );

  return (
    <form action={formAction} className="space-y-5">
      {hasCheckedInToday && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Anda sudah check-in hari ini. Mengirim ulang akan memperbarui
          check-in.
        </div>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div>
        <label
          htmlFor="yesterday"
          className="mb-1 block text-sm font-medium text-[#475569]"
        >
          Apa yang dikerjakan kemarin?
        </label>
        <textarea
          id="yesterday"
          name="yesterday"
          required
          rows={3}
          defaultValue={initialData?.yesterdayUpdate ?? ""}
          placeholder="Ringkas pekerjaan yang selesai kemarin..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
        />
      </div>

      <div>
        <label
          htmlFor="today"
          className="mb-1 block text-sm font-medium text-[#475569]"
        >
          Apa yang akan dikerjakan hari ini?
        </label>
        <textarea
          id="today"
          name="today"
          required
          rows={3}
          defaultValue={initialData?.todayPlan ?? ""}
          placeholder="Rencana pekerjaan hari ini..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="has_blocker"
            checked={showBlocker}
            onChange={(e) => setShowBlocker(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-amber-500"
          />
          <span className="text-sm font-medium text-[#475569]">
            Tandai sebagai Blocker
          </span>
        </label>

        {showBlocker && (
          <>
            <div className="mt-4">
              <label
                htmlFor="blocker_note"
                className="mb-1 block text-xs font-medium text-[#475569]"
              >
                Detail blocker
              </label>
              <textarea
                id="blocker_note"
                name="blocker_note"
                rows={2}
                defaultValue={initialData?.blockerNote ?? ""}
                placeholder="Jelaskan kendala yang menghambat..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              />
            </div>

            <div className="mt-3">
              <label
                htmlFor="tagged_to"
                className="mb-1 block text-xs font-medium text-[#475569]"
              >
                Tag ke (opsyonal)
              </label>
              <select
                id="tagged_to"
                name="tagged_to"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
              >
                <option value="">— Pilih anggota tim —</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
