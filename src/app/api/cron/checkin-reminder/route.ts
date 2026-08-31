import { NextRequest, NextResponse } from "next/server";

import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { runCheckinReminders } from "@/lib/reminders";

// Endpoint dipanggil cron-job.org tiap 15–30 menit (header `x-cron-secret`).
// Handler menyaring user yg memang sudah waktunya reminder di timezone-nya.
const BASE_URL = process.env.AUTH_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return unauthorized();

  try {
    const sent = await runCheckinReminders(BASE_URL);
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("[checkin-reminder] error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}

export const POST = GET;
