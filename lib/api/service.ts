// Builds each API response: find the club, resolve the range, load its sessions, compute.
// Route handlers only parse the request and call these.

import type { PrismaClient } from '../../app/generated/prisma/client';
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
} from '../api-types';
import { NOW, todayLocal } from '../clock';
import { DEFINITIONS } from '../copy';
import {
  activePlayerRows,
  computeMetrics,
  noShowRows,
  sessionRows,
  weeklySeries,
  type MetricValues,
} from '../metrics/compute';
import type { SessionRow } from '../metrics/types';
import { dateOnlyToLocalDate, rangeWindow, type Window } from '../time';
import { resolveRange, type RangeQuery } from './params';

export type Result<T> = { status: 200; body: T } | { status: 400 | 404; body: ApiError };

type Context = { club: ClubDto; info: RangeInfo; window: Window; prevWindow: Window | null; sessions: SessionRow[] };

const toDto = (c: { id: string; name: string; timeZone: string; createdAt: Date }): ClubDto => ({
  id: c.id,
  name: c.name,
  timeZone: c.timeZone,
  createdAt: dateOnlyToLocalDate(c.createdAt),
});

export async function listClubs(db: PrismaClient): Promise<ClubsResponse> {
  const clubs = await db.club.findMany({ orderBy: { createdAt: 'asc' } });
  return { clubs: clubs.map(toDto), now: NOW.toISOString() };
}

async function loadSessions(db: PrismaClient, clubId: string, start: Date, end: Date): Promise<SessionRow[]> {
  const rows = await db.session.findMany({
    where: { clubId, startsAt: { gte: start, lt: end } },
    include: { bookings: { include: { player: { select: { name: true } } } } },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    startsAt: s.startsAt,
    durationMinutes: s.durationMinutes,
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

async function load(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Context | { status: 400 | 404; body: ApiError }> {
  const row = await db.club.findUnique({ where: { id: clubId } });
  if (!row) return { status: 404, body: { error: `Club not found: ${clubId}` } };
  const club = toDto(row);
  const resolved = resolveRange(q, club.createdAt, todayLocal(club.timeZone));
  if (!resolved.ok) return { status: 400, body: { error: resolved.error } };
  const { info } = resolved;
  const window = rangeWindow(info.range, club.timeZone);
  const prevWindow = info.previousRange ? rangeWindow(info.previousRange, club.timeZone) : null;
  const sessions = await loadSessions(db, clubId, prevWindow?.start ?? window.start, window.end);
  return { club, info, window, prevWindow, sessions };
}

const isError = (c: Context | { status: number }): c is { status: 400 | 404; body: ApiError } => 'status' in c;

export async function getSummary(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<SummaryResponse>> {
  const ctx = await load(db, clubId, q);
  if (isError(ctx)) return ctx;
  const cur = computeMetrics(ctx.sessions, ctx.window, NOW);
  const prev: MetricValues | null = ctx.prevWindow ? computeMetrics(ctx.sessions, ctx.prevWindow, NOW) : null;
  const heldEver = await db.session.count({ where: { clubId, status: 'scheduled', startsAt: { lt: NOW } } });
  return {
    status: 200,
    body: {
      ...ctx.info,
      club: ctx.club,
      now: NOW.toISOString(),
      hasData: heldEver > 0,
      metrics: {
        activePlayers: { value: cur.activePlayers, previous: prev?.activePlayers ?? null, definition: DEFINITIONS.activePlayers },
        sessionsHeld: {
          value: cur.sessionsHeld,
          previous: prev?.sessionsHeld ?? null,
          definition: DEFINITIONS.sessionsHeld,
          cancelled: cur.cancelledSessions,
        },
        noShows: {
          value: cur.noShows,
          previous: prev?.noShows ?? null,
          definition: DEFINITIONS.noShows,
          recordedSessions: cur.recordedSessions,
          totalSessions: cur.sessionsHeld,
          rate: cur.noShowRate,
          previousRecordedSessions: prev?.recordedSessions ?? null,
          previousTotalSessions: prev?.sessionsHeld ?? null,
          previousRate: prev?.noShowRate ?? null,
        },
      },
    },
  };
}

export async function getWeekly(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<WeeklyResponse>> {
  const ctx = await load(db, clubId, q);
  if (isError(ctx)) return ctx;
  return { status: 200, body: { ...ctx.info, weeks: weeklySeries(ctx.sessions, ctx.info.range, ctx.club.timeZone, NOW) } };
}

export async function getPlayers(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<PlayersResponse>> {
  const ctx = await load(db, clubId, q);
  if (isError(ctx)) return ctx;
  return {
    status: 200,
    body: { ...ctx.info, definition: DEFINITIONS.activePlayers, players: activePlayerRows(ctx.sessions, ctx.window, NOW, ctx.club.timeZone) },
  };
}

export async function getSessions(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<SessionsResponse>> {
  const ctx = await load(db, clubId, q);
  if (isError(ctx)) return ctx;
  return { status: 200, body: { ...ctx.info, definition: DEFINITIONS.sessionsHeld, ...sessionRows(ctx.sessions, ctx.window, NOW) } };
}

export async function getNoShows(db: PrismaClient, clubId: string, q: RangeQuery): Promise<Result<NoShowsResponse>> {
  const ctx = await load(db, clubId, q);
  if (isError(ctx)) return ctx;
  const m = computeMetrics(ctx.sessions, ctx.window, NOW);
  return {
    status: 200,
    body: {
      ...ctx.info,
      definition: DEFINITIONS.noShows,
      recordedSessions: m.recordedSessions,
      totalSessions: m.sessionsHeld,
      players: noShowRows(ctx.sessions, ctx.window, NOW),
    },
  };
}
