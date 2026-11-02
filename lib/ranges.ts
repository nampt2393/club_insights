import { addDays, mondayOf, type DateRange, type LocalDate } from './time';

/** The last 4 complete Mon–Sun weeks before today's week, or club creation → today for a newer club. */
export function defaultRange(clubCreated: LocalDate, today: LocalDate): DateRange {
  const thisMonday = mondayOf(today);
  const from = addDays(thisMonday, -28);
  if (clubCreated > from) return { from: clubCreated, to: today };
  return { from, to: addDays(thisMonday, -1) };
}

export type PresetId = 'last1w' | 'last2w' | 'last3w' | 'last4w' | 'last12w' | 'all';
export type Preset = { id: PresetId; label: string; range: DateRange };

export function presets(clubCreated: LocalDate, today: LocalDate): Preset[] {
  const thisMonday = mondayOf(today);
  // "Last N weeks" = the N complete Mon–Sun weeks before this one.
  const lastWeeks = (n: number, id: PresetId, label: string): Preset => ({
    id,
    label,
    range: { from: addDays(thisMonday, -7 * n), to: addDays(thisMonday, -1) },
  });
  return [
    lastWeeks(1, 'last1w', 'Last week'),
    lastWeeks(2, 'last2w', 'Last 2 weeks'),
    lastWeeks(3, 'last3w', 'Last 3 weeks'),
    lastWeeks(4, 'last4w', 'Last 4 weeks'),
    lastWeeks(12, 'last12w', 'Last 12 weeks'),
    { id: 'all', label: 'All time', range: { from: clubCreated, to: today } },
  ];
}
