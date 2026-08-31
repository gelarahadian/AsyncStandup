"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DateFilter({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleChange(next: string) {
    setValue(next);
    // Navigasi tanpa reload penuh — server component merender ulang dgn tanggal baru.
    router.push(`/dashboard?date=${next}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="date"
        className="text-sm font-medium text-[#475569]"
      >
        Tanggal
      </label>
      <input
        id="date"
        type="date"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
      />
    </div>
  );
}
