import type { NextRequest } from 'next/server';
import { getNoShows } from '@/lib/server/api/service';
import { prisma } from '@/lib/server/db';

// GET /api/clubs/:clubId/no-shows?from=YYYY-MM-DD&to=YYYY-MM-DD (club-local dates; both required, else 400)
export async function GET(req: NextRequest, ctx: RouteContext<'/api/clubs/[clubId]/no-shows'>) {
  const { clubId } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const { status, body } = await getNoShows(prisma, clubId, { from: sp.get('from'), to: sp.get('to') });
  return Response.json(body, { status });
}
