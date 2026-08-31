"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type Status = "idle" | "sending" | "sent" | "error";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setError(null);

    try {
      const res = await signIn("nodemailer", {
        email: email.trim(),
        redirect: false,
      });

      if (res?.error) {
        setStatus("error");
        setError(res.error);
        return;
      }

      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-medium">Link login terkirim!</p>
        <p className="mt-1 text-emerald-700">
          Cek email <strong>{email}</strong> dan klik link untuk masuk ke
          AsyncStandup.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-[#475569]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@perusahaan.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]"
        />
      </div>

      {status === "error" && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending" || !email.trim()}
        className="w-full rounded-lg bg-[#1E3A5F] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#152c49] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "sending" ? "Mengirim..." : "Kirim Magic Link"}
      </button>
    </form>
  );
}
