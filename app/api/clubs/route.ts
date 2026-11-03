import { connection } from 'next/server';
import { listClubs } from '@/lib/server/api/service';
import { prisma } from '@/lib/server/db';

export async function GET() {
  // better-sqlite3 is synchronous, so without this the query would run at build time and the
  // club list would be frozen into a static response.
  await connection();
  return Response.json(await listClubs(prisma));
}
