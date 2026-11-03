import { BookingStatus, SessionStatus } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';

type Row = Record<string, string>;

// Every parser fails loudly: an unexpected value must never quietly become false or Invalid Date.
function fail(column: string, expected: string, raw: string): never {
  throw new Error(`${column}: expected ${expected}, got ${JSON.stringify(raw)}`);
}

export function parseBool(v: string, column = 'value'): boolean {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fail(column, '"true" | "false"', v);
}

export function parseOptionalBool(v: string, column = 'value'): boolean | null {
  return v === '' ? null : parseBool(v, column);
}

export function parseUtc(v: string, column = 'value'): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v)) fail(column, 'YYYY-MM-DDTHH:MM:SSZ', v);
  const d = new Date(v);
  // Round-trip rejects impossible values like 2026-02-30T25:00:00Z.
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 19) + 'Z' !== v) fail(column, 'a valid UTC timestamp', v);
  return d;
}

export function parseOptionalUtc(v: string, column = 'value'): Date | null {
  return v === '' ? null : parseUtc(v, column);
}

export function parseDateOnly(v: string, column = 'value'): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(column, 'YYYY-MM-DD', v);
  return parseUtc(`${v}T00:00:00Z`, column);
}

export function parseIntStrict(v: string, column = 'value'): number {
  if (!/^\d+$/.test(v)) fail(column, 'a non-negative integer', v);
  return Number(v);
}

function parseEnum<T extends string>(values: Record<string, T>, v: string, column: string): T {
  const allowed = Object.values(values);
  if (!allowed.includes(v as T)) fail(column, allowed.map((a) => `"${a}"`).join(' | '), v);
  return v as T;
}

export function toClub(row: Row): Prisma.ClubCreateManyInput {
  return {
    id: row.club_id,
    name: row.name,
    timeZone: row.time_zone,
    createdAt: parseDateOnly(row.created_at, 'created_at'),
  };
}

export function toPlayer(row: Row): Prisma.PlayerCreateManyInput {
  return {
    id: row.player_id,
    clubId: row.club_id,
    name: row.name,
    joinedClubAt: parseDateOnly(row.joined_club_at, 'joined_club_at'),
  };
}

export function toSession(row: Row): Prisma.SessionCreateManyInput {
  return {
    id: row.session_id,
    clubId: row.club_id,
    title: row.title,
    startsAt: parseUtc(row.starts_at, 'starts_at'),
    durationMinutes: parseIntStrict(row.duration_minutes, 'duration_minutes'),
    places: parseIntStrict(row.places, 'places'),
    status: parseEnum(SessionStatus, row.status, 'status'),
    attendanceRecorded: parseBool(row.attendance_recorded, 'attendance_recorded'),
  };
}

export function toBooking(row: Row): Prisma.BookingCreateManyInput {
  return {
    id: row.booking_id,
    sessionId: row.session_id,
    playerId: row.player_id,
    bookedAt: parseUtc(row.booked_at, 'booked_at'),
    status: parseEnum(BookingStatus, row.status, 'status'),
    cancelledAt: parseOptionalUtc(row.cancelled_at, 'cancelled_at'),
    attended: parseOptionalBool(row.attended, 'attended'),
  };
}
