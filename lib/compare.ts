// The "this period vs previous" card: one row per metric, in the order the host asked for.

import type { SummaryResponse } from './api-types';
import type { MetricKey } from './copy';
import { deltaTone, formatDelta } from './format';

type Metrics = SummaryResponse['metrics'];

export type ComparisonRow = {
  key: MetricKey;
  label: string;
  current: number | null; // null = unknown (no attendance taken)
  previous: number | null;
  change: string;
  tone: 'good' | 'bad' | 'neutral';
};

const ORDER: { key: MetricKey; label: string; goodWhen: 'up' | 'down' }[] = [
  { key: 'activePlayers', label: 'Active players', goodWhen: 'up' },
  { key: 'noShows', label: 'No-shows', goodWhen: 'down' },
  { key: 'sessionsHeld', label: 'Sessions held', goodWhen: 'up' },
];

export function comparisonRows(m: Metrics): ComparisonRow[] {
  // A no-show count is only comparable when attendance was taken at the same number of sessions.
  const sameCoverage = m.noShows.recordedSessions === m.noShows.previousRecordedSessions;
  return ORDER.map(({ key, label, goodWhen }) => {
    const { value, previous } = m[key];
    const delta = formatDelta(value, previous);
    const comparable = key !== 'noShows' || sameCoverage;
    return { key, label, current: value, previous, change: delta.text, tone: deltaTone(delta.direction, goodWhen, comparable) };
  });
}
