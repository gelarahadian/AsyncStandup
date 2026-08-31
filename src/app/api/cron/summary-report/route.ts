import { NextRequest, NextResponse } from "next/server";

import { isCronAuthorized, unauthorized } from "@/lib/cron";
import { runSummaryReports, type SummaryType } from "@/lib/summary";

// Endpoint dipanggil cron-job.org utk rekap. 2 job terpisah:
//  - ?type=daily  (tiap hari pagi)
//  - ?type=weekly (mingguan, mis. Senin pagi)
const BASE_URL = process.env.AUTH_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return unauthorized();

  const typeParam = new URL(req.url).searchParams.get("type");
  const type: SummaryType = typeParam === "weekly" ? "weekly" : "daily";

  try {
    const sent = await runSummaryReports(type, BASE_URL);
    return NextResponse.json({ ok: true, type, sent });
  } catch (err) {
    console.error("[summary-report] error:", err);
    return NextResponse.json(
      { ok: false, type, error: "Internal error" },
      { status: 500 }
    );
  }
}

export const POST = GET;
