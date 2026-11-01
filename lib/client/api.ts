'use client';

// SWR hooks for the dashboard. The request URL is the cache key, so changing the range starts a
// new request and a late response for the old range can't overwrite the new one.

import useSWR from 'swr';
import type {
  ClubsResponse,
  NoShowsResponse,
  PlayersResponse,
  SessionsResponse,
  SummaryResponse,
  WeeklyResponse,
} from '../api-types';
import type { DateRange } from '../time';
import { apiUrl } from './url';

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiRequestError(body?.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

type Q = Partial<DateRange>;
const clubPath = (clubId: string, what: string) => `/api/clubs/${encodeURIComponent(clubId)}/${what}`;
const key = (clubId: string | undefined, what: string, q: Q, enabled = true) =>
  clubId && enabled ? apiUrl(clubPath(clubId, what), q) : null;

export const useClubs = () => useSWR<ClubsResponse, ApiRequestError>('/api/clubs', fetcher);
export const useSummary = (clubId: string | undefined, q: Q) =>
  useSWR<SummaryResponse, ApiRequestError>(key(clubId, 'summary', q), fetcher, { keepPreviousData: true });
export const useWeekly = (clubId: string | undefined, q: Q) =>
  useSWR<WeeklyResponse, ApiRequestError>(key(clubId, 'weekly', q), fetcher, { keepPreviousData: true });
export const usePlayers = (clubId: string | undefined, q: Q, enabled: boolean) =>
  useSWR<PlayersResponse, ApiRequestError>(key(clubId, 'players', q, enabled), fetcher);
export const useSessions = (clubId: string | undefined, q: Q, enabled: boolean) =>
  useSWR<SessionsResponse, ApiRequestError>(key(clubId, 'sessions', q, enabled), fetcher);
export const useNoShows = (clubId: string | undefined, q: Q, enabled: boolean) =>
  useSWR<NoShowsResponse, ApiRequestError>(key(clubId, 'no-shows', q, enabled), fetcher);
