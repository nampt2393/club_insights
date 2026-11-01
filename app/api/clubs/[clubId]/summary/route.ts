import type { NextRequest } from 'next/server';
import { getSummary } from '../../../../../lib/api/service';
import { prisma } from '../../../../../lib/db';

// GET /api/clubs/:clubId/summary?from=YYYY-MM-DD&to=YYYY-MM-DD (club-local dates; both optional)
export async function GET(req: NextRequest, ctx: RouteContext<'/api/clubs/[clubId]/summary'>) {
  const { clubId } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const { status, body } = await getSummary(prisma, clubId, { from: sp.get('from'), to: sp.get('to') });
  return Response.json(body, { status });
}
