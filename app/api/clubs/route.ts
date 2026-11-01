import { listClubs } from '../../../lib/api/service';
import { prisma } from '../../../lib/db';

export async function GET() {
  return Response.json(await listClubs(prisma));
}
