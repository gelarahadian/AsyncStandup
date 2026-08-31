import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { utcTodayDate } from "@/lib/dates";

// Ambil jam:menit lokal (HH:MM) & tanggal lokal (YYYY-MM-DD) utk timezone IANA.
function localParts(timezone: string, at: Date): { hm: string; dateStr: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    hm: `${get("hour")}:${get("minute")}`,
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function reminderEmailHtml(name: string, url: string) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="color:#1E3A5F;">AsyncStandup</h2>
      <p>Halo ${name}, sudah waktunya check-in harian!</p>
      <p style="margin:24px 0;">
        <a href="${url}" style="background:#1E3A5F;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
          Isi Check-in Sekarang
        </a>
      </p>
      <p style="color:#94a3b8;font-size:12px;">
        <a href="${url}">${url}</a>
      </p>
    </div>
  `;
}

// Jalankan logika reminder: utk tiap setting aktif, jika waktu lokal sudah
// melewati reminder_time & user belum check-in & belum diingatkan hari ini,
// kirim email + catat Notification (sebagai marker dedup).
export async function runCheckinReminders(baseUrl: string): Promise<number> {
  const today = utcTodayDate();

  const settings = await prisma.reminderSetting.findMany({
    where: { isActive: true },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const notifiedToday = await prisma.notification.findMany({
    where: { type: "checkin_reminder", sentAt: { gte: today } },
    select: { recipientId: true, message: true },
  });
  const already = new Set(
    notifiedToday.map((n) => `${n.recipientId}:${n.message}`)
  );

  let sent = 0;
  for (const s of settings) {
    const { hm, dateStr } = localParts(s.timezone, new Date());
    if (hm < s.reminderTime) continue;

    const key = `${s.userId}:${dateStr}`;
    if (already.has(key)) continue;

    const checkin = await prisma.checkin.findUnique({
      where: {
        userId_checkinDate: { userId: s.userId, checkinDate: today },
      },
      select: { id: true },
    });
    if (checkin) continue;

    const url = `${baseUrl}/checkin`;
    await sendEmail({
      to: s.user.email,
      subject: "Waktunya check-in!",
      html: reminderEmailHtml(s.user.name ?? "", url),
    });
    await prisma.notification.create({
      data: {
        recipientId: s.userId,
        type: "checkin_reminder",
        message: dateStr,
      },
    });
    already.add(key);
    sent++;
  }

  return sent;
}
