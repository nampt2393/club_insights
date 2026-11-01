// Every host-facing string in one place. The API returns DEFINITIONS so web and mobile print the
// same words, and README.md repeats them. Change a definition here and in the code that computes it.

export const DEFINITIONS = {
  activePlayers:
    "Players with at least one booking (not cancelled) at a session held in this period. Players marked absent don't count.",
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
  weeklyNote: "Weekly counts don't add up to the period total: a player who played in 3 weeks counts once in the total.",
  emptyChart: 'Your first week will show here',
} as const;
