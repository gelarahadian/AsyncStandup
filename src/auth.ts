import NextAuth, { type DefaultSession } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getOrCreateDefaultTeamId } from "@/lib/onboarding";

const adapter = PrismaAdapter(prisma);

// Override createUser: saat sign-up pertama, NextAuth hanya menyediakan
// name/email/emailVerified/image. Kolom teamId & role di schema WAJIB (non-null,
// tanpa default), jadi beri fallback default team + role "member" agar signup berhasil.
adapter.createUser = async (user) => {
  const teamId = await getOrCreateDefaultTeamId();
  return prisma.user.create({
    data: {
      name: user.name ?? "",
      email: user.email ?? "",
      emailVerified: user.emailVerified,
      image: user.image,
      teamId,
      role: "member",
    },
  });
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Nodemailer({
      server: {
        host: "localhost",
        port: 587,
        auth: { user: "", pass: "" },
      },
      from: process.env.RESEND_FROM_EMAIL ?? "AsyncStandup <onboarding@resend.dev>",
      // Kirim magic link via Resend (mengabaikan SMTP `server` di atas)
      async sendVerificationRequest({ identifier: email, url }) {
        await sendEmail({
          to: email,
          subject: "Masuk ke AsyncStandup",
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
              <h2 style="color:#1E3A5F;">AsyncStandup</h2>
              <p>Halo! Klik tombol di bawah untuk masuk ke akun Anda.</p>
              <p style="margin:24px 0;">
                <a href="${url}" style="background:#1E3A5F;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
                  Masuk ke AsyncStandup
                </a>
              </p>
              <p style="color:#475569;font-size:14px;">
                Atau salin link ini: <a href="${url}">${url}</a>
              </p>
              <p style="color:#94a3b8;font-size:12px;">
                Jika Anda tidak meminta link ini, abaikan email ini. Link berlaku sementara.
              </p>
            </div>
          `,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Saat sign-in pertama, `user` dari adapter berisi data DB user.
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, teamId: true, name: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.teamId = dbUser.teamId;
          token.name = dbUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = ((token.role as string) ?? "member") as
          | "member"
          | "lead";
        session.user.teamId = (token.teamId as string) ?? "";
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "member" | "lead";
      teamId: string;
    } & DefaultSession["user"];
  }
}
