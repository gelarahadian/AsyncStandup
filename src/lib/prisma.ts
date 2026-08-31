import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prisma Client singleton yang memakai Neon serverless driver adapter.
// Penting: `DATABASE_URL` harus berupa *pooled* connection (via Neon pooler)
// agar tidak kehabisan koneksi dari Vercel Functions (banyak koneksi short-lived).

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
