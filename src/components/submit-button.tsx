"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[#1E3A5F] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#152c49] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Menyimpan..." : "Submit Check-in"}
    </button>
  );
}
