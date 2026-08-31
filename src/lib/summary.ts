import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { addDays, utcTodayDate } from "@/lib/dates";

export type SummaryType = "daily" | "weekly";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function summaryHtml(
  type: SummaryType,
  teamName: string,
  members: { name: string; checkins: { checkinDate: Date; yesterdayUpdate: string; todayPlan: string; blockerNote: string | null; hasBlocker: boolean }[] }[],
  blockedCount: number
): string {
  const rows = members
    .map((m) => {
      if (m.checkins.length === 0) {
        return `<tr><td><strong>${esc(m.name)}</strong></td><td colspan="2" style="color:#94a3b8">Belum check-in</td></tr>`;
      }
      const latest = m.checkins[m.checkins.length - 1];
      return `<tr>
        <td><strong>${esc(m.name)}</strong>${latest.hasBlocker ? ' <span style="color:#F59E0B">[BLOCKER]</span>' : ""}</td>
        <td>${esc(latest.yesterdayUpdate)}</td>
        <td>${esc(latest.todayPlan)}</td>
      </tr>`;
    })
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
      <h2 style="color:#1E3A5F;">Rekap ${type === "daily" ? "Harian" : "Mingguan"} — ${esc(teamName)}</h2>
      <p style="color:#475569">${blockedCount > 0 ? `⚠ ${blockedCount} blocker aktif perlu perhatian.` : "Tidak ada blocker aktif."}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="text-align:left;border-bottom:2px solid #1E3A5F">
            <th style="padding:6px">Anggota</th>
            <th style="padding:6px">Kemarin</th>
            <th style="padding:6px">Hari Ini</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Dikirim otomatis oleh AsyncStandup.</p>
    </div>
  `;
}

// Rekap harian/mingguan utk tiap team → dikirim ke lead + dicatat di
// SummaryReport & Notification. periodStart = kemarin (daily) / 7 hari (weekly).
export async function runSummaryReports(
  type: SummaryType,
  baseUrl: string
): Promise<number> {
  const today = utcTodayDate();
  const periodStart = type === "daily" ? addDays(today, -1) : addDays(today, -7);

  const teams = await prisma.team.findMany({
    include: {
      users: { select: { id: true, name: true, role: true, email: true } },
      checkins: {
        where: { checkinDate: { gte: periodStart, lt: today } },
        include: { user: { select: { name: true } } },
        orderBy: { checkinDate: "asc" },
      },
    },
  });

  let sent = 0;
  for (const team of teams) {
    const leads = team.users.filter((u) => u.role === "lead");
    if (leads.length === 0) continue;

    const members = team.users
      .filter((u) => u.role !== "lead")
      .map((u) => ({
        name: u.name,
        checkins: team.checkins.filter((c) => c.userId === u.id),
      }));

    const blockedCount = team.checkins.filter((c) => c.hasBlocker).length;

    for (const lead of leads) {
      const html = summaryHtml(type, team.name, members, blockedCount);

      const dashboardUrl = `${baseUrl}/dashboard`;
      const htmlWithLink = html.replace(
        "</div>",
        `<p style="margin-top:4px"><a href="${dashboardUrl}" style="color:#1E3A5F">Buka dashboard tim →</a></p></div>`
      );

      await sendEmail({
        to: lead.email,
        subject: `Rekap ${type === "daily" ? "Harian" : "Mingguan"} Tim — ${team.name}`,
        html: htmlWithLink,
      });

      await prisma.summaryReport.create({
        data: {
          teamId: team.id,
          recipientId: lead.id,
          reportType: type,
          periodStart,
          periodEnd: today,
          content: html,
        },
      });
      await prisma.notification.create({
        data: {
          recipientId: lead.id,
          type: "summary_report",
          relatedCheckinId: null,
          relatedBlockerId: null,
          message: `${type} summary untuk ${team.name} terkirim`,
        },
      });
      sent++;
    }
  }

  return sent;
}
