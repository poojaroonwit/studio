import { PrismaClient } from '@prisma/client';
import { buildPrismaConnectionString } from './database-connection';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;
const prismaOptions = databaseUrl
  ? {
      datasources: {
        db: {
          url: buildPrismaConnectionString(databaseUrl),
        },
      },
    }
  : {};

// Optimized Prisma client with connection pool limits for lower memory usage
const prisma = globalForPrisma.prisma || new PrismaClient({
  ...prismaOptions,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Note: Connection pool is configured via DATABASE_URL query params:
  // ?connection_limit=10&pool_timeout=10
  // Or set in schema.prisma datasource block
});

// Always cache in globalThis to prevent connection pool exhaustion
globalForPrisma.prisma = prisma;

export default prisma; 
