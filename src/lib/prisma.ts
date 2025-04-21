import { PrismaClient } from '@prisma/client';

// Use a single instance of Prisma Client in development
// This prevents too many connections in development
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

// Add prisma to the NodeJS global type
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// If not in production, attach to global to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}