import { NextResponse } from "next/server";

// Validasi header cron utk endpoint /api/cron/*.
// Siapa pun tanpa token ditolak 401; hanya cron-job.org (yg dikonfigurasi
// mengirim header `x-cron-secret`) yg bisa memicu. Pakai perbandingan
// timing-safe utk hindari side-channel.
export function isCronAuthorized(req: Request): boolean {
  const header = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !header) return false;

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  // constant-time compare
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
