# Club Insights

A dashboard that shows a club host how their club is doing: **active players**, **sessions held**
and **no-shows** for a date range they choose, compared with the period before it, plus a weekly
chart and the sessions or players behind every number.

The screens get all their data from a JSON API (Next.js route handlers), so the mobile app can show
the same dashboard from the same endpoints.

## Run it

```bash
pnpm install
pnpm db:seed   # generate the Prisma client, migrate, load data/*.csv into prisma/dev.db
pnpm dev       # http://localhost:3000
pnpm test      # unit + API tests (a throwaway seeded DB per test file)
```

`db:seed` reloads the CSVs in one transaction, so it's safe to re-run. No `.env` is needed; set
`DATABASE_URL` to use another SQLite file.

**"Now" is fixed** at Monday 5 October 2026, 09:00 in Ho Chi Minh City (`2026-10-05T02:00:00Z`), as
the brief asks. It lives in `lib/clock.ts`. Sessions that start after it are never counted.

## The numbers

All three are about **sessions held** in the chosen period: sessions that weren't cancelled, start
within the period (club-local dates, inclusive), and have already started.

| Number | Definition (as shown on screen, from `lib/copy.ts`) |
|---|---|
| Active players | Players with at least one booking (not cancelled) at a session held in this period. A booking marked absent doesn't count as playing. |
| Sessions held | Sessions that took place in this period. Cancelled sessions aren't counted. |
| No-shows | Bookings marked absent. Only sessions where attendance was taken count; for the others, no-shows are unknown. |

- Attendance was only taken at some sessions. No-shows count those sessions only, and the screen always
  says how many ("attendance taken at 11 of 20 sessions"). If none were recorded, the value is
  **Unknown** (`null` in the API), never 0. The **no-show rate** (no-shows ÷ bookings at recorded
  sessions) is shown too, because it stays comparable when coverage differs between periods.
- The **previous period** has the same number of days, immediately before the chosen one. If the club
  didn't exist yet, there is no comparison, and the screen says why.
- **Weeks** run Monday–Sunday in the club's time zone (`clubs.time_zone`). A week cut by the period's
  edge is drawn as a partial week.
- A club that has **never held a session** gets the same page: sessions held is 0, and the other two
  say "Not yet" with what makes them appear.

## API

All endpoints are `GET`, return JSON and take optional `from` / `to` as club-local `YYYY-MM-DD`
(both or neither; with neither, the default is the last 4 complete weeks, or club creation → today
for a newer club). Each response carries `range`, `previousRange` (or `null`) and `previousClipped`.

| Endpoint | Returns |
|---|---|
| `/api/clubs` | `{ clubs: [{ id, name, timeZone, createdAt }], now }` |
| `/api/clubs/:clubId/summary` | the three metrics: `{ value, previous, definition }` each, plus `sessionsHeld.cancelled` and the no-show coverage/rate fields, `hasData` |
| `/api/clubs/:clubId/weekly` | `weeks: [{ weekStart, weekEnd, partial, activePlayers, sessionsHeld }]` |
| `/api/clubs/:clubId/players` | active players: `{ playerId, name, sessionsPlayed, lastPlayed }` |
| `/api/clubs/:clubId/sessions` | `held` and `cancelled` sessions with booked/places and absences (`null` = not taken) |
| `/api/clubs/:clubId/no-shows` | players with ≥1 no-show and the sessions they missed |

Errors: `400 { error }` for a bad range (not `YYYY-MM-DD`, only one of the two, `from` after `to`,
`to` after today) and `404 { error }` for an unknown club. Types for every response are in
`lib/api-types.ts`.

## Code map

- `lib/time.ts`: club-local dates ↔ UTC (plain `Intl`, no date library), weeks, previous period
- `lib/metrics/compute.ts`: the metric definitions as code; pure functions over loaded rows
- `lib/api/`: range validation (`params.ts`) and building responses from the DB (`service.ts`)
- `app/api/clubs/...`: thin route handlers
- `app/_components/`: the client UI (Tailwind, Recharts, native `<dialog>`), fetching through SWR
  (`lib/client/api.ts`)
- `docs/superpowers/specs/`: design documents
