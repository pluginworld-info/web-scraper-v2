import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'], // Helpful logs during dev
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;