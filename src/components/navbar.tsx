import Link from "next/link";

import type { CurrentUser } from "@/lib/dal";

export function Navbar({ user }: { user: CurrentUser }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/checkin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1E3A5F] text-sm font-bold text-white">
            A
          </span>
          <span className="font-semibold text-[#1E3A5F]">AsyncStandup</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#475569] hover:text-[#1E3A5F]"
          >
            Lihat Tim
          </Link>
          <span className="text-sm text-[#475569]">{user.name}</span>
        </nav>
      </div>
    </header>
  );
}
