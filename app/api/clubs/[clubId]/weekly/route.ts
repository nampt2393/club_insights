import type { NextRequest } from 'next/server';
import { getWeekly } from '../../../../../lib/api/service';
import { prisma } from '../../../../../lib/db';

// GET /api/clubs/:clubId/weekly?from=YYYY-MM-DD&to=YYYY-MM-DD (club-local dates; both optional)
export async function GET(req: NextRequest, ctx: RouteContext<'/api/clubs/[clubId]/weekly'>) {
  const { clubId } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const { status, body } = await getWeekly(prisma, clubId, { from: sp.get('from'), to: sp.get('to') });
  return Response.json(body, { status });
}
