import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/dal";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun AsyncStandup Anda.",
};

export default async function LoginPage() {
  // Kalau sudah login, langsung arahkan ke halaman check-in.
  const user = await getCurrentUser();
  if (user) redirect("/checkin");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 bg-[#F8FAFC]">
      <div className="w-full max-w-md">
        {/* Header / Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A5F] text-2xl font-bold text-white">
            A
          </div>
          <h1 className="text-2xl font-semibold text-[#1E3A5F]">AsyncStandup</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Masuk ke akun Anda
          </h2>
          <p className="mt-1 text-sm text-[#475569]">
            Masukkan email Anda untuk menerima link login.
          </p>

          <div className="mt-6">
            <LoginForm />
          </div>

          <p className="mt-5 text-center text-sm text-[#64748B]">
            Link login akan dikirim ke email Anda.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} AsyncStandup
        </p>
      </div>
    </div>
  );
}
