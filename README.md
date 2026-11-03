# Club Insights

A dashboard that shows a club host how their club is doing: **active players**, **sessions held** and
**no-shows** for a date range they pick, compared with the period before it. It also has a weekly chart,
and you can open any number to see the sessions or players behind it. The screens get all their data
from a JSON API (Next.js route handlers), which the mobile app can reuse.

## How to run it

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm db:seed   # generate the Prisma client, run migrations, load data/*.csv into prisma/dev.db
pnpm dev       # http://localhost:3000
pnpm test      # unit + API tests (each test file gets its own throwaway seeded DB)
```

- `db:seed` reloads the CSVs in one transaction, so you can run it again safely.
- No `.env` is needed. Set `DATABASE_URL` to use another SQLite file.
- **"Now" is fixed** at Mon 5 Oct 2026, 09:00 in Ho Chi Minh City (`lib/clock.ts`). Nothing else calls
  `new Date()` for "now".

API (all `GET`; every club endpoint needs `from` and `to` as club-local `YYYY-MM-DD`, or it returns a
400):

- `/api/clubs`
- `/api/clubs/:clubId/summary`
- `/api/clubs/:clubId/weekly`
- `/api/clubs/:clubId/players`
- `/api/clubs/:clubId/sessions`
- `/api/clubs/:clubId/no-shows`

Response types are in `lib/api-types.ts`.

## What I decided where the brief was silent

**The numbers.** All three only count *held* sessions: not cancelled, starting inside the range
(club-local dates, both ends included), and already started before "now".

- **Active players**: players with at least one non-cancelled booking at a held session.
  - A player marked absent doesn't count.
  - A player at a session where attendance wasn't taken *does* count, because they booked and nothing
    says they didn't come.
- **Sessions held**: cancelled sessions aren't counted. The screen shows them on a separate line
  ("+ 2 cancelled, not counted") so they don't silently disappear.
- **No-shows**: bookings marked absent, at sessions where attendance was taken.
  - If no session in the range had attendance taken, the value is **Unknown** (`null` in the API),
    never 0.
  - The no-shows details say how many sessions had attendance taken ("attendance taken at 11 of 20
    sessions").

**Dates and comparison.**

- The **previous period** has the same number of days and ends the day before the chosen range starts.
  - If it starts before the club was created, it is cut at the creation date and the screen says so.
  - If the club didn't exist at all in that period, there is no comparison, and the screen says why.
- **Default range**: the last 4 complete Mon–Sun weeks. For a club younger than that, it runs from the
  club's creation to today.
- **Presets**: last 1, 2, 3, 4 or 12 weeks, or all time. You can also pick custom dates, but not dates
  after "now".
- **Weeks** run Mon–Sun in the club's time zone (`clubs.time_zone`, never hard-coded +07:00). A week
  cut by the range edge is drawn and labelled as a partial week.

**Chart.** The chart shows weekly **active players**, the clearest answer to "are more people playing?",
with weekly no-shows beside them. A week with no attendance taken has no no-show bar, rather than a bar
at 0.

**Definitions** are printed next to each number and repeated in its drill-down. The wording lives in
`METRICS` in `app/_components/Dashboard.tsx`, and the code that computes the numbers is in `lib/metrics/compute.ts`. Both have to change
together.

**New club** (no sessions yet). It gets the same page:

- Sessions held shows a real 0.
- Active players and no-shows say "Not yet", with what will make them appear.
- A banner explains the club is just getting started.

## What I would do next

- **Paginate the drill-downs when needed.** `players`, `sessions` and `no-shows` return every row in the
  range. That is fine for one club over nine months. For a big club over "All time", I would page the
  lists on the server with a cursor, and sort them on the server, so the phone doesn't download
  thousands of rows to show the first twenty.
- **Add a cache layer, or an analytics table.** Past data barely changes, so responses can be cached
  per `(club, from, to)`. At larger scale, keep a weekly summary table per club (active players,
  sessions held, no-shows, sessions with attendance taken), updated whenever a booking or attendance
  changes. The dashboard would then read a few small rows instead of scanning sessions and bookings
  on every request.
- **Move to a monorepo if the mobile app uses React Native.** Web and mobile could then share the
  logic that isn't UI, such as the API types, date handling and metric definitions, instead of each
  keeping its own copy.