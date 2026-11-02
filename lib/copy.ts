// Every host-facing string in one place. The API doesn't carry DEFINITIONS: web prints them from
// here, mobile copies them (README.md repeats them). Change a definition here and in the code that computes it.

export const DEFINITIONS = {
  activePlayers:
    "Players with at least one booking (not cancelled) at a session held in this period. A booking marked absent doesn't count as playing.",
  sessionsHeld: "Sessions that took place in this period. Cancelled sessions aren't counted.",
  noShows:
    'Bookings marked absent. Only sessions where attendance was taken count; for the others, no-shows are unknown.',
} as const;

export type MetricKey = keyof typeof DEFINITIONS;

export const COPY = {
  unknown: 'Unknown',
  notYet: 'Not yet',
  dataAsOf: 'Data as of Mon 5 Oct 2026, 09:00 (Ho Chi Minh City)',
  newClubBanner: {
    title: 'This club is just getting started: no sessions yet.',
    body: 'Numbers will appear here after your first session. Create sessions in the Reclub app, and take attendance to get no-show numbers.',
  },
  noEarlierPeriod: (created: string) => `No earlier period: club created ${created}`,
  previousClipped: '(previous period starts at club creation)',
  weekNoShowsUnknown: 'No yellow bar: attendance wasn\'t taken that week, so no-shows are unknown.',
  emptyChart: 'Your first week will show here',
} as const;
