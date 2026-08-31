import "server-only";

// Helper pengiriman email via Resend — memakai fetch native (Node 18+/Vercel)
// alih-alih SDK `resend`, agar ringan & kompatibel lintas runtime.
// Endpoint & payload sama dgn API Resend.
// Dipakai oleh: NextAuth magic link, reminder cron, blocker alert, summary report.

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "AsyncStandup <onboarding@resend.dev>";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Di development tanpa API key, jangan gagalkan flow — log saja.
    console.warn(
      "[email] RESEND_API_KEY belum diset. Email tidak terkirim ke:",
      to,
      "| subject:",
      subject
    );
    return { id: "dev-skipped" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, text }),
  });

  const data = (await res.json()) as {
    id?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${data.error?.message ?? ""}`);
  }

  return { id: data.id ?? "" };
}
