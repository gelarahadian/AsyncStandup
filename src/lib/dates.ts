// Seluruh app memakai "hari ini" berbasis UTC date (bukan local server),
// karena checkin_date disimpan sebagai DATE (UTC). Kesederhanaan MVP;
// zona waktu user utk reminder dihitung terpisah (lihat src/lib/reminders.ts).
export function utcTodayDate(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
