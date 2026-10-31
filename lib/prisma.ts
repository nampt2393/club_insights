import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../app/generated/prisma/client';
import { databaseUrl } from './db-url';

export function createPrismaClient(url?: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: url ?? databaseUrl() }) });
}
