# Club dashboard (API + screens): design

## Intent

A club host opens this on a Monday morning and wants two answers:

1. **Is the club growing?** How many people played in this period compared with the one before.
2. **Who books and doesn't turn up?** Not just a count: the names.

They use the no-show information to stay informed. They don't act on it from here: there
are no message, warn or block actions.

The task brief (`Requirement.md`) says the screens are what gets judged hardest,
**especially whether a host understands the numbers and trusts them**, and that *a small app
that feels finished beats a big one that does not*. So this design deliberately stays inside
the brief's scope and spends the effort on clarity, honest handling of unknowns, and polish.

The CSV → SQLite seed is already done (`docs/superpowers/specs/2026-10-31-csv-seed-design.md`,
`pnpm db:seed`). This document covers everything else: metrics, JSON API, and screens.

## Goals

- For a host-chosen date range, compared with the period before it, show **active players**,
  **sessions held**, and **no-shows**, each with its definition printed next to the number.
- A **week-by-week bar chart of active players** (weeks Monday–Sunday in the club's time zone).
- **Open any number** to see the sessions or players behind it.
- No-shows are **unknown, not zero**, wherever attendance wasn't recorded, and the screen says so.
- The **new club with no data** gets a useful page (see "New club page").
- A **switcher between the two clubs**, with no login.
- All screens get their data **only through a JSON API**, because the mobile app will use the same API.
- Built for a laptop; **doesn't break on a phone** (≈375px wide).

## Non-goals

- Late cancellations. They aren't counted as no-shows and aren't shown anywhere. *(Decided
  by the user: "no-show is only absences; the brief doesn't mention late cancels.")*
- "New players" or any other metric beyond the three in the brief. *(Decided by the user.)*
- Any host actions (messaging, blocking, editing sessions). The dashboard is read-only.
- Auth, multi-tenant access control, real-time updates.
- Charts for sessions held or no-shows. Only active players gets a chart.

## Anti-goals (failure even if it technically works)

- Showing `0` no-shows for sessions where attendance wasn't recorded, or letting unrecorded
  sessions silently lower a no-show figure without saying so.
- A number on screen whose definition isn't visible next to it, or a definition that doesn't
  match the code that computes it.
- Bucketing by UTC dates. A session at `2026-01-04T22:30:00Z` is Monday 5 Jan in Ho Chi Minh City.
- Screens that read the database directly (React Server Components calling Prisma) and skip
  the JSON API.
- A blank, broken or all-zeros page for the new club.
- Fake data or placeholder bars in an empty chart.

## Constraints

- TypeScript, Next.js 16 (App Router), as already in the repo. **This Next.js has breaking
  changes versus older versions. Read the relevant guide in `node_modules/next/dist/docs/`
  before writing route handlers, pages or config** (see `AGENTS.md`).
- SQLite through Prisma 7 (already set up: `lib/prisma.ts`, `prisma/schema.prisma`).
- API via **Next.js route handlers** under `app/api/...`.
- UI: **Tailwind CSS 4 + Recharts**, no component library. *(Decided by the user.)* Components
  are written by hand; use native elements where they do the job (`<dialog>`, `<input type="date">`,
  `<select>`).
- Tests use the existing runner: `pnpm test` (`tsx --test 'tests/**/*.test.ts'`).
- **"Now" is fixed at Monday 5 October 2026, 09:00 Asia/Ho_Chi_Minh (= 2026-10-05T02:00:00Z).**
  Put it in one module (e.g. `lib/clock.ts`); nothing else may call `new Date()` for "now".
- The club's time zone comes from `clubs.time_zone`. Don't hard-code `+07:00`.
- Every part must be explainable by its author. Prefer plain code over clever code.

## Data facts (checked against `data/*.csv`)

- club-001 *Saigon Smash Pickleball*: sessions from 2026-01-04 to 2026-10-04 (UTC), 195 sessions
  (186 scheduled, 9 cancelled), 104 with attendance recorded and 91 without. 260 players, 44 of
  whom never booked.
- club-002 *Thảo Điền Tennis Club*: created 2026-10-01, **zero** players, sessions and bookings.
- At sessions with `attendance_recorded = true`, every booked (non-cancelled) booking has
  `attended` true/false. At sessions without it, `attended` is always NULL. Cancelled sessions
  have no bookings. No duplicate active bookings, no overbooked sessions, no bookings after the
  session started.
- 36 bookings are dated before the player's `joined_club_at`. Irrelevant now that "new players"
  is out of scope, but don't add logic that depends on `joined_club_at`.
- No sessions start after "now".

## Metric definitions

All three metrics are about **held sessions in the range**:

> **Held session** = `status = scheduled` (not cancelled), and `startsAt` falls inside the
> selected range (club-local dates, inclusive), and `startsAt` is before "now".

The definition text shown on screen comes from the API (see API) so web and mobile print the same
words. Suggested wording:

| Metric | Computation | On-screen definition |
|---|---|---|
| **Active players** | Distinct players with ≥1 booking where `status = booked` on a held session in the range and `attended` is not `false` (true or unknown). | "Players with at least one booking (not cancelled) at a session held in this period. Players marked absent don't count." |
| **Sessions held** | Count of held sessions. A secondary line shows cancelled sessions in the range ("+ 2 cancelled, not counted"). | "Sessions that took place in this period. Cancelled sessions aren't counted." |
| **No-shows** | Count of bookings with `status = booked` and `attended = false`, on held sessions with `attendanceRecorded = true`. | "Bookings marked absent. Only sessions where attendance was taken (11 of 20) count; for the other 9, no-shows are unknown." |

No-show details:

- The **coverage line** ("attendance taken at 11 of 20 sessions") is always shown with the
  no-show number, for both the current and the previous period.
- Also show the **no-show rate** = no-shows ÷ booked bookings at recorded sessions, as a secondary
  figure. It is comparable across periods with different coverage, but the raw count isn't.
- **No-show delta** *(our call)*: the card shows the change in the count *and* the change in the
  rate, with each period's coverage ("11 of 20" vs "9 of 20"), because the count alone is not
  comparable when coverage differs.
- If **no** held session in the range has attendance recorded, the no-show value is
  **"Unknown"** (API: `null`), never `0`.

## UI language

**English only.** *(Decided by the user.)* No language switcher. Dates use English formats
("Mon 28 Sep, 19:00"). Keep all user-facing copy, including the definition strings the API returns,
in one module, so it is easy to review and to translate later.

## Date range and comparison

- The host picks a range of **club-local calendar dates**, `from`–`to` inclusive.
  The API takes `from`/`to` as `YYYY-MM-DD` and converts them to UTC instants using the club's
  time zone: `[from 00:00 local, (to + 1 day) 00:00 local)`.
- **Default range: the last 4 complete weeks** before "now", i.e. Mon 7 Sep – Sun 4 Oct 2026.
- Presets: *Last 4 weeks*, *Last 12 weeks*, *This month*, *Last month*, *All time*
  (from club creation). Plus custom from/to date inputs. Dates after "now" (5 Oct 2026) can't be
  picked. *All time* has no previous period, so the comparison is hidden.
- **Previous period** = the same number of days immediately before `from`. Shown on screen as
  "vs 10 Aug – 6 Sep".
- **Deltas**: show the absolute change and the % change ("▲ +9 (15%)"). If the previous value is
  0 or unknown, show the absolute change only, or "—". Colour is neutral-to-informative: green for
  up and red for down on active players and sessions; for no-shows, up is shown as bad.
- If the previous period falls **entirely before the club existed** (`createdAt`), hide the
  comparison and say why ("No earlier period: club created 1 Oct 2026"). If it falls partly
  before, show it with a note "previous period starts at club creation".

## Weekly chart

- Bars = **active players per week** (same definition, applied per week: distinct players in
  that week). Weeks are Monday–Sunday in the club's time zone.
- Covers every week that overlaps the selected range. A week cut by the range edge is a
  **partial week**: draw it visually distinct (e.g. hatched/lighter) and label it in the tooltip
  ("partial week: 1–4 Oct only").
- Tooltip: week label ("Mon 28 Sep – Sun 4 Oct"), active players, sessions held that week.
- Small note under the chart: "Weekly counts don't add up to the period total: a player who
  played in 3 weeks counts once in the total."
- Weeks with zero held sessions show a 0 bar (that's a true zero), not a gap.
- *(Builder's call:)* clicking a bar may open the active-players list for that week. Nice to
  have, not required.

## Drill-downs ("open a number")

Clicking a metric card opens a **side panel** (native `<dialog>`, right side on laptop,
full-screen on phone; Esc and a close button dismiss it; focus is managed). Its title repeats
the metric, range and definition. Lists are sorted as noted, and are plain tables (no pagination
needed at this data size: ≤260 players, ≤~200 sessions).

- **Active players** → one row per player: name, sessions played in range, last session date.
  Sorted by sessions played, descending.
- **Sessions held** → one row per held session: local date/time (e.g. "Mon 28 Sep, 19:00"), title,
  booked / places, attendance status ("Attendance taken: 1 absent" or "Attendance not taken").
  Sorted by date, newest first. Cancelled sessions in the range are listed below, under their own
  heading, so the "+ N cancelled" line is checkable.
- **No-shows** → one row per player with ≥1 no-show: name, "absent 3 of 5 recorded sessions",
  and expanding the row lists the sessions they missed (date, title). Sorted by no-show count,
  descending. A header line repeats the coverage ("Only the 11 sessions with attendance taken are
  included").

The aim is that every number on the main page can be **reproduced by counting rows in its panel**.

## Main page layout (layout A, chosen by the user)

Top to bottom:

1. **Header bar**: club switcher (`<select>` of clubs), date range control (preset +
   from/to), and the line "vs 10 Aug – 6 Sep". A small "Data as of Mon 5 Oct 2026, 09:00
   (Ho Chi Minh City)" so "now" is never a mystery.
2. **Three metric cards** in a row (stacked on phone): label, big number, delta vs previous,
   definition text directly below the number, and the coverage line on the no-show card. The whole
   card is a button that opens its drill-down.
3. **Weekly active players chart**, full width.

Club and range live in the **URL** (`/?club=club-001&from=2026-09-07&to=2026-10-04`), so reload
and sharing keep state. Show loading skeletons while fetching, and a readable error state with
retry if the API fails.

## New club page (option A, chosen by the user)

Same layout as a club with data, so the host sees what the dashboard will look like. Each empty
spot explains itself:

- Banner: "This club is just getting started: no sessions yet. Numbers will appear here after your
  first session." Plus a hint: create sessions in the Reclub app, and take attendance to get
  no-show numbers. *(The "Reclub app" wording is our assumption. The dashboard itself is read-only.)*
- Default range for a new club: from club creation to now (1 Oct – 5 Oct).
- Cards: **Sessions held = 0** (a true zero). **Active players** and **No-shows** show
  **"Not yet"**, with their definitions still visible and a "what makes this appear" line.
- Comparison hidden ("No earlier period: club created 1 Oct 2026").
- Chart: empty axes with the text "Your first week will show here". No fake bars.
- Drill-downs: either disabled or open with a friendly empty state (builder's call).

The API signals this with a flag (e.g. `hasData`, which is `false` when the club has never had a held
session), so mobile can render the same state.

## JSON API

Route handlers under `app/api/`. All responses are JSON. Dates in responses: UTC ISO instants
for timestamps, plus club-local `YYYY-MM-DD` for range/week boundaries. Errors:
`400 { error }` for invalid/missing params (bad date, `from > to`, `to` after now),
`404` for an unknown club.

- `GET /api/clubs` → `[{ id, name, timeZone, createdAt }]`
- `GET /api/clubs/:clubId/summary?from&to` →
  `{ club, now, range: {from,to}, previousRange: {from,to} | null, hasData, metrics: { activePlayers, sessionsHeld, noShows } }`,
  where each metric carries `{ value, previous, definition }`. `sessionsHeld` also has
  `cancelled`, and `noShows` has `recordedSessions`, `totalSessions`, `rate` and the same for
  previous. `value` is `null` for unknown.
- `GET /api/clubs/:clubId/weekly?from&to` →
  `{ weeks: [{ weekStart, weekEnd, partial, activePlayers, sessionsHeld }] }`
- `GET /api/clubs/:clubId/players?from&to` → active-players drill-down rows.
- `GET /api/clubs/:clubId/sessions?from&to` → held + cancelled session rows.
- `GET /api/clubs/:clubId/no-shows?from&to` → per-player rows with their missed sessions.

Exact field names and nesting are the builder's call, as long as the definitions travel with the
numbers and unknown is `null`, never `0`.

## Code structure

- `lib/clock.ts`: the fixed "now".
- `lib/time/`: club-local date ↔ UTC instant conversion, week bucketing (Monday start). Pure functions.
- `lib/metrics/`: queries + computation for each metric, its drill-down, and the weekly series.
  The definition strings live next to the computations. Route handlers are thin: parse params,
  call `lib/metrics`, return JSON.
- `app/api/...`: route handlers.
- `app/page.tsx` + `app/_components/...`: client UI (`"use client"`) that fetches from `/api/...`
  with **SWR** *(decided by the user)*, using the request URL as the cache key. SWR handles
  stale responses when the range changes quickly, caches reopened drill-downs, and provides
  retry via `mutate()`. Don't have a server component fetch its own API, and don't use Prisma in
  pages.
- `lib/api-types.ts`: response types shared by the route handlers and the client.

Prefer fetching all bookings/sessions for the club in the range and computing in TypeScript over
clever SQL. The data is small and TS is easier to test and explain. *(Builder's call.)*

## Testing

TDD for `lib/time` and `lib/metrics`, using a small hand-built fixture DB or in-memory data, plus
at least one check against the real seed. Must cover:

- A session at 22:30 UTC Sunday lands in the next local day/week.
- Range boundaries inclusive in local time; partial weeks flagged.
- Unrecorded sessions excluded from no-shows; all-unrecorded → `null`.
- Absent players excluded from active players.
- Cancelled sessions excluded from held; cancelled bookings ignored.
- Previous-period computation, including before club creation.
- New club: `hasData: false`, sessions 0, others `null`.
- API: 400/404 cases, and the response shape.

Then manual verification in the browser at laptop width and ~375px, for both clubs.

## README

Update `README.md`: setup (`pnpm install`, `pnpm db:seed`, `pnpm dev`), the API endpoints, the
fixed "now", and the metric definitions (the same text as on screen).

## Left to the builder

Visual styling details (colours, spacing, typography), the exact preset list, the time-zone
library choice (or plain `Intl`), the exact API field names, whether chart bars are clickable,
and the empty-state behaviour of drill-downs on the new club.
