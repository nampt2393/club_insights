import type { PrismaClient } from '../app/generated/prisma/client';
import { createPrismaClient } from './prisma';

// One client per process. Next dev reloads modules on every change; caching on globalThis stops
// each reload from opening another SQLite connection.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
