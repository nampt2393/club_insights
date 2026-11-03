// Builds each API response: find the club, resolve the range, load its sessions, compute.
// Route handlers only parse the request and call these.

import 'server-only';

import type { PrismaClient } from '@/generated/prisma/client';
import type {
  ApiError,
  ClubDto,
  ClubsResponse,
  NoShowsResponse,
  PlayersResponse,
  RangeInfo,
  SessionsResponse,
  SummaryResponse,
  WeeklyResponse,
} from '@/lib/api-types';
import { NOW, todayLocal } from '@/lib/clock';
import {
  activePlayerRows,
  computeMetrics,
  noShowRows,
  sessionRows,
  weeklySeries,
  type MetricValues,
} from '@/lib/metrics/compute';
import type { SessionRow } from '@/lib/metrics/types';
import { dateOnlyToLocalDate, rangeWindow, type Window } from '@/lib/time';
import { resolveRange, type RangeQuery } from './params';

export type Result<T> = { status: 200; body: T } | { status: 400 | 404; body: ApiError };

type Context = {
  club: ClubDto;
  info: RangeInfo;
  window: Window;
  prevWindow: Window | null; // null when not asked for (withPrevious) or there is no previous period
  sessions: SessionRow[];
};

const toDto = (c: { id: string; name: string; timeZone: string; createdAt: Date }): ClubDto => ({
  id: c.id,
  name: c.name,
  timeZone: c.timeZone,
  createdAt: dateOnlyToLocalDate(c.createdAt),
});

export async function listClubs(db: PrismaClient): Promise<ClubsResponse> {
  const clubs = await db.club.findMany({ orderBy: { createdAt: 'asc' } });
  return { clubs: clubs.map(toDto) };
}

/**
 * One club's sessions starting in [start, end), with their bookings. Only active bookings are
 * loaded: every metric ignores cancelled bookings, and cancelled sessions have none anyway.
 * Only the columns the metrics and drill-downs read are selected.
 */
async function loadSessions(db: PrismaClient, clubId: string, start: Date, end: Date): Promise<SessionRow[]> {
  const rows = await db.session.findMany({
    where: { clubId, startsAt: { gte: start, lt: end } },
    select: {
      id: true,
      title: true,
      startsAt: true,
      places: true,
      status: true,
      attendanceRecorded: true,
      bookings: {
        where: { status: 'booked' },
        select: { id: true, playerId: true, status: true, attended: true, player: { select: { name: true } } },
      },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    startsAt: s.startsAt,
    places: s.places,
    status: s.status,
    attendanceRecorded: s.attendanceRecorded,
    bookings: s.bookings.map((b) => ({
      id: b.id,
      playerId: b.playerId,
      playerName: b.player.name,
      status: b.status,
      attended: b.attended,
    })),
  }));
}

/**
 * Finds the club, validates the range and loads its sessions. Only the summary compares with the
 * previous period, so only it asks for withPrevious; the other endpoints load just the chosen range.
 */
async function load(
  db: PrismaClient,
  clubId: string,
  q: RangeQuery,
  { withPrevious = false }: { withPrevious?: boolean } = {},
): Promise<Context | { status: 400 | 404; body: ApiError }> {
  const row = await db.club.findUnique({ where: { id: clubId } });
  if (!row) return { status: 404, body: { error: `Club not found: ${clubId}` } };
  const club = toDto(row);
  const resolved = resolveRange(q, club.createdAt, todayLocal(club.timeZone));
  if (!resolved.ok) return { status: 400, body: { error: resolved.error } };
  const { info } = resolved;
  const window = rangeWindow(info.range, club.timeZone);
  const prevWindow = withPrevious && info.previousRange ? rangeWindow(info.previousRange, club.timeZone) : null;
  const sessions = await loadSessions(db, clubId, prevWindow?.start ?? window.start, window.end);
  return { club, info, window, prevWindow, sessions };
}

const isError = (c: Context | { status: number }): c is { status: 400 | 404; body: ApiError } => 'status' in c;

export async function getSummary(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<SummaryResponse>> {
  const ctx = await load(db, clubId, q, { withPrevious: true });
  if (isError(ctx)) return ctx;
  const cur = computeMetrics(ctx.sessions, ctx.window, NOW);
  const prev: MetricValues | null = ctx.prevWindow ? computeMetrics(ctx.sessions, ctx.prevWindow, NOW) : null;
  const heldEver = await db.session.count({ where: { clubId, status: 'scheduled', startsAt: { lt: NOW } } });
  return {
    status: 200,
    body: {
      previousRange: ctx.info.previousRange,
      previousClipped: ctx.info.previousClipped,
      club: ctx.club,
      hasData: heldEver > 0,
      metrics: {
        activePlayers: { value: cur.activePlayers, previous: prev?.activePlayers ?? null },
        sessionsHeld: { value: cur.sessionsHeld, previous: prev?.sessionsHeld ?? null, cancelled: cur.cancelledSessions },
        noShows: { value: cur.noShows, previous: prev?.noShows ?? null },
      },
    },
  };
}

export async function getWeekly(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<WeeklyResponse>> {
  const ctx = await load(db, clubId, q);
  if (isError(ctx)) return ctx;
  return { status: 200, body: { weeks: weeklySeries(ctx.sessions, ctx.info.range, ctx.club.timeZone, NOW) } };
}

export async function getPlayers(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<PlayersResponse>> {
  const ctx = await load(db, clubId, q);
  if (isError(ctx)) return ctx;
  return {
    status: 200,
    body: { players: activePlayerRows(ctx.sessions, ctx.window, NOW, ctx.club.timeZone) },
  };
}

export async function getSessions(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<SessionsResponse>> {
  const ctx = await load(db, clubId, q);
  if (isError(ctx)) return ctx;
  return { status: 200, body: { ...sessionRows(ctx.sessions, ctx.window, NOW) } };
}

export async function getNoShows(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<NoShowsResponse>> {
  const ctx = await load(db, clubId, q);
  if (isError(ctx)) return ctx;
  const m = computeMetrics(ctx.sessions, ctx.window, NOW);
  return {
    status: 200,
    body: {
      recordedSessions: m.recordedSessions,
      totalSessions: m.sessionsHeld,
      players: noShowRows(ctx.sessions, ctx.window, NOW),
    },
  };
}
