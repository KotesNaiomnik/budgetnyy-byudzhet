import { PrismaClient } from '@/generated/prisma'

// Ensure DATABASE_URL is set — fallback for fresh clones without .env
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./db/custom.db'
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Keep logging silent to reduce memory churn in dev.
    // Set PRISMA_LOG=query to re-enable query logging.
    log: process.env.PRISMA_LOG ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
