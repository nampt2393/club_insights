// JSON shapes of every API response. Shared by the route handlers and the web client; the mobile
// app reads the same shapes. Unknown values are null, never 0.

import type { ActivePlayerRow, NoShowRow, SessionListItem, WeekPoint } from './metrics/compute';
import type { DateRange, LocalDate } from './time';

export type { ActivePlayerRow, NoShowRow, SessionListItem, WeekPoint, DateRange, LocalDate };

export type ClubDto = { id: string; name: string; timeZone: string; createdAt: LocalDate };
export type ClubsResponse = { clubs: ClubDto[]; now: string };

export type RangeInfo = {
  range: DateRange;
  previousRange: DateRange | null; // null when the club didn't exist yet
  previousClipped: boolean; // previous period was cut at club creation
};

export type Metric = { value: number | null; previous: number | null; definition: string };

export type SummaryResponse = RangeInfo & {
  club: ClubDto;
  now: string;
  hasData: boolean; // false when the club has never held a session
  metrics: {
    activePlayers: Metric;
    sessionsHeld: Metric & { cancelled: number };
    noShows: Metric & {
      recordedSessions: number;
      totalSessions: number;
      rate: number | null;
      previousRecordedSessions: number | null;
      previousTotalSessions: number | null;
      previousRate: number | null;
    };
  };
};

export type WeeklyResponse = RangeInfo & { weeks: WeekPoint[] };
// Drill-downs: just the range they cover. The comparison period and definitions live in summary.
export type DrillDownRange = { range: DateRange };
export type PlayersResponse = DrillDownRange & { players: ActivePlayerRow[] };
export type SessionsResponse = DrillDownRange & { held: SessionListItem[]; cancelled: SessionListItem[] };
export type NoShowsResponse = DrillDownRange & {
  recordedSessions: number;
  totalSessions: number;
  players: NoShowRow[];
};

export type ApiError = { error: string };
