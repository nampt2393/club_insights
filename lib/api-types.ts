// JSON shapes of every API response. Shared by the route handlers and the web client; the mobile
// app reads the same shapes. Unknown values are null, never 0.

import type { ActivePlayerRow, NoShowRow, SessionListItem, WeekPoint } from './metrics/compute';
import type { DateRange, LocalDate } from './time';

export type { ActivePlayerRow, NoShowRow, SessionListItem, WeekPoint, DateRange, LocalDate };

export type ClubDto = { id: string; name: string; timeZone: string; createdAt: LocalDate };
export type ClubsResponse = { clubs: ClubDto[] };

// Every endpoint except /api/clubs requires ?from&to, so responses don't echo the range back.
// Summary adds the comparison period the server worked out from it.
export type PreviousPeriod = {
  previousRange: DateRange | null; // null when the club didn't exist yet
  previousClipped: boolean; // previous period was cut at club creation
};
export type RangeInfo = { range: DateRange } & PreviousPeriod;

// Definitions aren't in the API: the web prints them from METRICS in app/_components/Dashboard.tsx
// (README.md has the same words).
export type Metric = { value: number | null; previous: number | null };

export type SummaryResponse = PreviousPeriod & {
  club: ClubDto;
  hasData: boolean; // false when the club has never held a session
  metrics: {
    activePlayers: Metric;
    sessionsHeld: Metric & { cancelled: number };
    noShows: Metric;
  };
};
export type MetricKey = keyof SummaryResponse['metrics'];

export type WeeklyResponse = { weeks: WeekPoint[] };
export type PlayersResponse = { players: ActivePlayerRow[] };
export type SessionsResponse = { held: SessionListItem[]; cancelled: SessionListItem[] };
export type NoShowsResponse = {
  recordedSessions: number;
  totalSessions: number;
  players: NoShowRow[];
};

export type ApiError = { error: string };
