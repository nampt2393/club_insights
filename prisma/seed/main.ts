import path from 'node:path';
import { createPrismaClient } from '../../lib/prisma';
import { seed } from './seed';

const DATA_DIR = path.resolve(import.meta.dirname, '../../data');

// No top-level await: package.json has no "type": "module", so tsx emits CJS.
async function main() {
  const prisma = createPrismaClient();
  try {
    const c = await seed(prisma, DATA_DIR);
    console.log(`Seeded: ${c.clubs} clubs, ${c.players} players, ${c.sessions} sessions, ${c.bookings} bookings`);
  } catch (err) {
    console.error(`Seed failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
