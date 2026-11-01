import { addDays, mondayOf, type DateRange, type LocalDate } from './time';

/** The last 4 complete Mon–Sun weeks before today's week, or club creation → today for a newer club. */
export function defaultRange(clubCreated: LocalDate, today: LocalDate): DateRange {
  const thisMonday = mondayOf(today);
  const from = addDays(thisMonday, -28);
  if (clubCreated > from) return { from: clubCreated, to: today };
  return { from, to: addDays(thisMonday, -1) };
}

export type PresetId = 'last4w' | 'last12w' | 'thisMonth' | 'lastMonth' | 'all';
export type Preset = { id: PresetId; label: string; range: DateRange };

export function presets(clubCreated: LocalDate, today: LocalDate): Preset[] {
  const thisMonday = mondayOf(today);
  const monthStart = `${today.slice(0, 8)}01`;
  const lastMonthEnd = addDays(monthStart, -1);
  return [
    { id: 'last4w', label: 'Last 4 weeks', range: { from: addDays(thisMonday, -28), to: addDays(thisMonday, -1) } },
    { id: 'last12w', label: 'Last 12 weeks', range: { from: addDays(thisMonday, -84), to: addDays(thisMonday, -1) } },
    { id: 'thisMonth', label: 'This month', range: { from: monthStart, to: today } },
    { id: 'lastMonth', label: 'Last month', range: { from: `${lastMonthEnd.slice(0, 8)}01`, to: lastMonthEnd } },
    { id: 'all', label: 'All time', range: { from: clubCreated, to: today } },
  ];
}
