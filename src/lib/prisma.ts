import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

<<<<<<< HEAD
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
=======
// Optimized Prisma client with connection pool limits for lower memory usage
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Note: Connection pool is configured via DATABASE_URL query params:
  // ?connection_limit=10&pool_timeout=10
  // Or set in schema.prisma datasource block
});

// Always cache in globalThis to prevent connection pool exhaustion
globalForPrisma.prisma = prisma;
>>>>>>> ca51ac36

export default prisma; 
