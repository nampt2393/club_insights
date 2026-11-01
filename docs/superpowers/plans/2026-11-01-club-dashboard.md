# Club Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-page dashboard where a club host picks a date range and sees active players, sessions held and no-shows versus the previous period, each with its definition, plus a weekly active-players chart and drill-downs. All data comes through a JSON API that the mobile app can reuse.

**Architecture:** Pure, tested modules do the work: `lib/time.ts` (club-local dates ↔ UTC, weeks), `lib/metrics/compute.ts` (metrics from in-memory rows) and `lib/copy.ts` (every definition string). A thin `lib/api/service.ts` loads rows via Prisma and builds the typed responses in `lib/api-types.ts`. Next.js route handlers under `app/api/clubs/...` only parse params and call the service. The page is a client component that fetches those routes with SWR, keeps club and range in the URL, and renders cards, a Recharts chart and `<dialog>` drill-downs with Tailwind.

**Tech Stack:** Next.js 16.4 App Router (`cacheComponents: true` is on), React 19, TypeScript, Prisma 7.10.1 + SQLite, Tailwind CSS 4, Recharts, SWR, Node 24 `node:test` via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-01-club-dashboard-design.md`

## Global Constraints

- **Read `node_modules/next/dist/docs/` before writing Next code.** In this version, route-handler `params` is a `Promise` (`ctx: RouteContext<'/api/clubs/[clubId]/summary'>`, then `await ctx.params`). `useSearchParams` must sit inside a `<Suspense>` boundary or `next build` fails.
- "Now" = `2026-10-05T02:00:00.000Z` (Mon 5 Oct 2026, 09:00 Asia/Ho_Chi_Minh). It lives only in `lib/clock.ts`; nothing else calls `new Date()` for "now".
- The time zone always comes from `club.timeZone`. Never hard-code `+07:00` or `7`.
- **Held session** = `status === 'scheduled'` and `startsAt` in `[window.start, window.end)` and `startsAt < NOW`.
- Unknown is `null` in the API and "Unknown" / "Not yet" on screen. Never `0`.
- Screens never import Prisma or `lib/api/service.ts`. They only `fetch('/api/...')` through SWR.
- UI copy is **English only**, and all copy lives in `lib/copy.ts`, including the definitions the API returns.
- UI = Tailwind + Recharts + native elements (`<dialog>`, `<select>`, `<input type="date">`). No component library.
- `lib/` and `tests/` use relative imports (the existing seed tests run under plain `tsx`). `app/` may use `@/`.
- Week = Monday–Sunday in club-local time.
- Must not break at 375px wide.

## Review Focus

1. **Hand-edited or stale URL** (`?from=2026-13-40`, `from > to`, `to` after 5 Oct, unknown `club`). Expected: the API returns 400/404 with `{ error }`, and the page shows a readable message with a "Reset to default" link instead of a blank screen. Pinned by `resolveRange rejects …` (Task 3) and `unknown club → 404` (Tasks 3–4); the UI half is in Task 6 step 5.
2. **A range with sessions but no attendance taken** (e.g. a one-day range on a day whose only session wasn't recorded). Expected: no-shows show "Unknown", not 0, and the coverage line reads "attendance taken at 0 of N sessions". Pinned by `noShows is null when nothing recorded` (Task 2).
3. **A range ending today, Mon 5 Oct.** The week 5–11 Oct is partial and in the future. Expected: it's drawn as partial with 0 active and 0 held, and the API doesn't reject the range. Pinned by `weeksOverlapping flags partial weeks` (Task 1) and `range ending today is allowed` (Task 3).
4. **A range before the club existed, or the "All time" preset.** Expected: comparison hidden with the reason "No earlier period: club created 1 Dec 2025", not "▼ −100%". Pinned by `previous range before creation is null` (Task 3).
5. **A one-day range.** Expected: the previous period is the single day before it, and the weekly chart shows one partial week. Pinned by `previousRange of one day` (Task 1).

---

## File Structure

```
lib/clock.ts                    NOW + todayLocal()
lib/time.ts                     LocalDate math, tz conversion, weeks, previousRange
lib/ranges.ts                   defaultRange(), presets()
lib/copy.ts                     all user-facing strings + definitions
lib/format.ts                   date/range/delta formatting for UI
lib/metrics/types.ts            SessionRow / BookingRow (input to compute)
lib/metrics/compute.ts          computeMetrics, weeklySeries, *Rows drill-downs
lib/db.ts                       Next-safe Prisma singleton
lib/api-types.ts                every JSON response type (shared server/client)
lib/api/params.ts               resolveRange() → DateRange | ApiError
lib/api/service.ts              load from Prisma + build responses
app/api/clubs/route.ts
app/api/clubs/[clubId]/{summary,weekly,players,sessions,no-shows}/route.ts
lib/client/api.ts               apiUrl(), fetcher, SWR hooks
app/page.tsx                    <Suspense><Dashboard/></Suspense>
app/_components/*.tsx           Dashboard, Header, ClubSwitcher, RangePicker, MetricCard,
                                WeeklyChart, DrillDownDialog, PlayersTable, SessionsTable,
                                NoShowsTable, EmptyClubBanner, ErrorState
tests/time.test.ts  tests/ranges.test.ts  tests/format.test.ts
tests/metrics/compute.test.ts   tests/api/service.test.ts   tests/api/routes.test.ts
tests/helpers/seeded-db.ts      temp DB, migrated + seeded (pattern from tests/seed/seed.test.ts)
```

---

### Task 1: Clock and club-local time

**Files:**
- Create: `lib/clock.ts`, `lib/time.ts`
- Test: `tests/time.test.ts`

**Interfaces:**
- Produces:
  - `type LocalDate = string` (`YYYY-MM-DD`), `type DateRange = { from: LocalDate; to: LocalDate }` (inclusive)
  - `NOW: Date`, `todayLocal(timeZone: string): LocalDate`
  - `isLocalDate(s: string): boolean`: format *and* real calendar date
  - `localMidnightUtc(date: LocalDate, timeZone: string): Date`
  - `toLocalDate(instant: Date, timeZone: string): LocalDate`
  - `addDays(date: LocalDate, n: number): LocalDate`, `daysInclusive(r: DateRange): number`
  - `mondayOf(date: LocalDate): LocalDate`
  - `rangeWindow(r: DateRange, timeZone: string): { start: Date; end: Date }`: `end` = local midnight of `to + 1` (exclusive)
  - `previousRange(r: DateRange): DateRange`
  - `weeksOverlapping(r: DateRange): { weekStart: LocalDate; weekEnd: LocalDate; partial: boolean }[]`
  - `dateOnlyToLocalDate(d: Date): LocalDate`: for `club.createdAt` (stored as `00:00Z` of the CSV date), returns `d.toISOString().slice(0,10)`

- [ ] **Step 1: Write the failing tests** in `tests/time.test.ts`:

```ts
const TZ = 'Asia/Ho_Chi_Minh';
test('todayLocal is 5 Oct', () => assert.equal(todayLocal(TZ), '2026-10-05'));
test('22:30Z Sunday is Monday locally', () =>
  assert.equal(toLocalDate(new Date('2026-01-04T22:30:00Z'), TZ), '2026-01-05'));
test('localMidnightUtc', () =>
  assert.equal(localMidnightUtc('2026-09-07', TZ).toISOString(), '2026-09-06T17:00:00.000Z'));
test('rangeWindow end is exclusive next local midnight', () =>
  assert.deepEqual(rangeWindow({ from: '2026-09-07', to: '2026-10-04' }, TZ),
    { start: new Date('2026-09-06T17:00:00Z'), end: new Date('2026-10-04T17:00:00Z') }));
test('mondayOf', () => { assert.equal(mondayOf('2026-10-04'), '2026-09-28'); assert.equal(mondayOf('2026-09-28'), '2026-09-28'); });
test('previousRange of 28 days', () =>
  assert.deepEqual(previousRange({ from: '2026-09-07', to: '2026-10-04' }), { from: '2026-08-10', to: '2026-09-06' }));
test('previousRange of one day', () =>
  assert.deepEqual(previousRange({ from: '2026-09-08', to: '2026-09-08' }), { from: '2026-09-07', to: '2026-09-07' }));
test('weeksOverlapping flags partial weeks', () =>
  assert.deepEqual(weeksOverlapping({ from: '2026-09-30', to: '2026-10-05' }), [
    { weekStart: '2026-09-28', weekEnd: '2026-10-04', partial: true },
    { weekStart: '2026-10-05', weekEnd: '2026-10-11', partial: true },
  ]));
test('isLocalDate', () => { assert.ok(isLocalDate('2026-02-28')); assert.ok(!isLocalDate('2026-02-30')); assert.ok(!isLocalDate('2026-9-1')); });
test('addDays crosses month', () => assert.equal(addDays('2026-09-28', 7), '2026-10-05'));
```

- [ ] **Step 2: Run** `pnpm tsx --test tests/time.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `lib/clock.ts` and `lib/time.ts`.** Do `LocalDate` arithmetic on `Date.UTC(y, m-1, d)` values so it doesn't depend on the host time zone. For `localMidnightUtc`, read the zone's offset at that instant with `Intl.DateTimeFormat(…, { timeZone, hourCycle: 'h23', year…second })`. Guess `Date.UTC(y,m-1,d) - offset(guess)`, then correct once with the offset at the result (this handles DST zones). No new dependency.
- [ ] **Step 4: Run** `pnpm tsx --test tests/time.test.ts`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(time): club-local dates, weeks and fixed now`.

---

### Task 2: Metric computation and definitions (pure)

**Files:**
- Create: `lib/metrics/types.ts`, `lib/metrics/compute.ts`, `lib/copy.ts`
- Test: `tests/metrics/compute.test.ts`

**Interfaces:**
- Consumes: Task 1 (`rangeWindow`, `weeksOverlapping`, `toLocalDate`, `NOW`).
- Produces:
  - `BookingRow = { id: string; playerId: string; playerName: string; status: 'booked' | 'cancelled'; attended: boolean | null }`
  - `SessionRow = { id: string; title: string; startsAt: Date; durationMinutes: number; places: number; status: 'scheduled' | 'cancelled'; attendanceRecorded: boolean; bookings: BookingRow[] }`
  - `type Window = { start: Date; end: Date }`
  - `isHeld(s: SessionRow, w: Window, now: Date): boolean`
  - `computeMetrics(sessions: SessionRow[], w: Window, now: Date): MetricValues`, where
    `MetricValues = { activePlayers: number; sessionsHeld: number; cancelledSessions: number; noShows: number | null; recordedSessions: number; bookingsAtRecorded: number; noShowRate: number | null }`.
    `noShowRate = noShows / bookingsAtRecorded` (a fraction 0–1). Both are `null` when `recordedSessions === 0`. `cancelledSessions` counts `status === 'cancelled'` with `startsAt` in the window.
  - `weeklySeries(sessions: SessionRow[], r: DateRange, timeZone: string, now: Date): WeekPoint[]` with `WeekPoint = { weekStart; weekEnd; partial; activePlayers: number; sessionsHeld: number }`. Each week is clipped to the range before counting.
  - `activePlayerRows(sessions, w, now, timeZone): { playerId; name; sessionsPlayed: number; lastPlayed: LocalDate }[]`, sorted by `sessionsPlayed` desc, then name.
  - `sessionRows(sessions, w, now): { held: SessionListItem[]; cancelled: SessionListItem[] }`, where `SessionListItem = { id; title; startsAt: string /*ISO*/; booked: number; places: number; attendanceRecorded: boolean; absent: number | null }`, newest first.
  - `noShowRows(sessions, w, now): { playerId; name; noShows: number; recordedBooked: number; missed: { sessionId; title; startsAt: string }[] }[]`, sorted by `noShows` desc, then name.
  - `lib/copy.ts`: `DEFINITIONS: Record<'activePlayers' | 'sessionsHeld' | 'noShows', string>`, using exactly the "On-screen definition" texts from the spec's metric table (no-shows **without** the "(11 of 20)" part, since coverage is a separate field). Also the UI strings used in later tasks: `COPY.newClubBanner`, `COPY.noEarlierPeriod(created: string)`, `COPY.weeklyNote`, `COPY.dataAsOf`, `COPY.unknown = 'Unknown'`, `COPY.notYet = 'Not yet'`.

- [ ] **Step 1: Write the failing tests** with a hand-built fixture: 4 sessions in one week (TZ Ho Chi Minh). (a) Recorded, bookings P1 attended, P2 absent, P3 cancelled booking. (b) Unrecorded, bookings P1, P4 (`attended: null`). (c) Cancelled session. (d) Scheduled but `startsAt` after `NOW`. Assertions:

```ts
test('computeMetrics on fixture', () => assert.deepEqual(computeMetrics(rows, w, NOW), {
  activePlayers: 2 /* P1,P4; P2 absent; P3 cancelled */, sessionsHeld: 2, cancelledSessions: 1,
  noShows: 1, recordedSessions: 1, bookingsAtRecorded: 2, noShowRate: 0.5 }));
test('noShows is null when nothing recorded', () => {
  const m = computeMetrics([unrecordedOnly], w, NOW);
  assert.equal(m.noShows, null); assert.equal(m.noShowRate, null); assert.equal(m.recordedSessions, 0);
});
test('future session is not held', () => assert.equal(isHeld(futureSession, w, NOW), false));
test('weeklySeries counts distinct players per week, clipped to range', /* 2 weeks, P1 in both → week counts 1,1 */);
test('sessionRows lists cancelled separately, absent null when unrecorded', …);
test('noShowRows has missed sessions', () => assert.deepEqual(noShowRows(rows, w, NOW)[0],
  { playerId: 'P2', name: 'P2 name', noShows: 1, recordedBooked: 1, missed: [{ sessionId: 'a', title: 'A', startsAt: '…' }] }));
test('activePlayerRows excludes absent players', …);
```

- [ ] **Step 2: Run** `pnpm tsx --test tests/metrics/compute.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `types.ts`, `compute.ts` (plain loops/Maps; build every function on top of `isHeld`) and `copy.ts`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(metrics): pure metric computation and definitions`.

---

### Task 3: API types, range validation and service against the real seed

**Files:**
- Create: `lib/db.ts`, `lib/api-types.ts`, `lib/ranges.ts`, `lib/api/params.ts`, `lib/api/service.ts`, `tests/helpers/seeded-db.ts`
- Test: `tests/ranges.test.ts`, `tests/api/params.test.ts`, `tests/api/service.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2, `createPrismaClient` from `lib/prisma.ts`, `seed` from `prisma/seed/seed.ts`.
- Produces:
  - `lib/db.ts`: `prisma: PrismaClient` singleton cached on `globalThis` (survives Next dev reloads). It uses `databaseUrl()`, so `DATABASE_URL` overrides it in tests.
  - `lib/ranges.ts`: `defaultRange(clubCreated: LocalDate, today: LocalDate): DateRange` = the last 4 complete Mon–Sun weeks before `today`'s week (`from = mondayOf(today) − 28`, `to = mondayOf(today) − 1`). If `clubCreated > from`, it is `{ from: clubCreated, to: today }` instead. And `presets(clubCreated, today): { id: 'last4w' | 'last12w' | 'thisMonth' | 'lastMonth' | 'all'; label: string; range: DateRange }[]`, where `all` = `{ from: clubCreated, to: today }`.
  - `lib/api-types.ts` (exact shapes; client and server share them):

```ts
export type ClubDto = { id: string; name: string; timeZone: string; createdAt: LocalDate };
export type ClubsResponse = { clubs: ClubDto[]; now: string };
export type RangeInfo = { range: DateRange; previousRange: DateRange | null; previousClipped: boolean };
export type Metric = { value: number | null; previous: number | null; definition: string };
export type SummaryResponse = RangeInfo & {
  club: ClubDto; now: string; hasData: boolean;
  metrics: {
    activePlayers: Metric;
    sessionsHeld: Metric & { cancelled: number };
    noShows: Metric & { recordedSessions: number; totalSessions: number; rate: number | null;
      previousRecordedSessions: number | null; previousTotalSessions: number | null; previousRate: number | null };
  };
};
export type WeeklyResponse = RangeInfo & { weeks: WeekPoint[] };
export type PlayersResponse = RangeInfo & { definition: string; players: ActivePlayerRow[] };
export type SessionsResponse = RangeInfo & { definition: string; held: SessionListItem[]; cancelled: SessionListItem[] };
export type NoShowsResponse = RangeInfo & { definition: string; recordedSessions: number; totalSessions: number; players: NoShowRow[] };
export type ApiError = { error: string };
```

  - `lib/api/service.ts`: each function takes `(db: PrismaClient, clubId: string, query: { from?: string | null; to?: string | null })` and returns `Promise<{ status: 200; body: T } | { status: 400 | 404; body: ApiError }>`: `getSummary`, `getWeekly`, `getPlayers`, `getSessions`, `getNoShows`. Plus `listClubs(db): Promise<ClubsResponse>`. It loads sessions with `startsAt` in the union of the current and previous windows, including bookings and `player.name`, into `SessionRow[]`. Range resolution goes through `resolveRange` (below, `lib/api/params.ts`).
  - `hasData` = the club has ≥1 held session ever (before `NOW`). Previous metrics are all `null` when `previousRange` is `null`.
  - `resolveRange(q: { from?: string | null; to?: string | null }, clubCreated: LocalDate, today: LocalDate): { ok: true; info: RangeInfo } | { ok: false; error: string }`.
    Rules: both missing → `defaultRange`. Exactly one missing → error. Either not `isLocalDate` → error. `from > to` → error. `to > today` → error. `previousRange` is `null` when `previous.to < clubCreated`. `previousClipped` is true when `previous.from < clubCreated <= previous.to`, and then `previous.from` = `clubCreated`.
    Error strings, exactly: `'from and to must both be given, as YYYY-MM-DD'`, `'from must be on or before to'`, `'to cannot be after today (2026-10-05)'`.
  - `tests/helpers/seeded-db.ts`: `setupSeededDb(): Promise<{ url: string; db: PrismaClient; cleanup(): Promise<void> }>`, using the same tmp-dir + `prisma migrate deploy` + `seed()` steps as `tests/seed/seed.test.ts`.

- [ ] **Step 1: Write the failing tests.** `tests/ranges.test.ts`:

```ts
test('default range = last 4 complete weeks', () =>
  assert.deepEqual(defaultRange('2025-12-01', '2026-10-05'), { from: '2026-09-07', to: '2026-10-04' }));
test('default range for new club starts at creation', () =>
  assert.deepEqual(defaultRange('2026-10-01', '2026-10-05'), { from: '2026-10-01', to: '2026-10-05' }));
```

`tests/api/params.test.ts`:

```ts
test('resolveRange rejects bad date', () => assert.deepEqual(resolveRange({ from: '2026-13-40', to: '2026-10-01' }, C, T), { ok: false, error: 'from and to must both be given, as YYYY-MM-DD' }));
test('resolveRange rejects from > to', …);  test('resolveRange rejects to after today', …);  test('resolveRange rejects only one given', …);
test('range ending today is allowed', () => assert.equal(resolveRange({ from: '2026-09-28', to: '2026-10-05' }, C, T).ok, true));
test('previous range before creation is null', () => /* C='2025-12-01', range 2025-12-01..2026-10-05 → previousRange null */);
test('previous range partly before creation is clipped', () => /* range 2025-12-10..2025-12-20 → previous {from:'2025-12-01', to:'2025-12-09'}, previousClipped true */);
```

`tests/api/service.test.ts` against the seeded DB (anchor values were computed from `data/*.csv`):

```ts
test('summary club-001 default range', async () => {
  const r = await getSummary(db, 'club-001', {}); assert.equal(r.status, 200);
  const b = r.body as SummaryResponse;
  assert.deepEqual(b.range, { from: '2026-09-07', to: '2026-10-04' });
  assert.deepEqual(b.previousRange, { from: '2026-08-10', to: '2026-09-06' });
  assert.equal(b.metrics.activePlayers.value, 89); assert.equal(b.metrics.activePlayers.previous, 88);
  assert.equal(b.metrics.sessionsHeld.value, 20); assert.equal(b.metrics.sessionsHeld.previous, 20);
  assert.equal(b.metrics.noShows.value, 15); assert.equal(b.metrics.noShows.previous, 14);
  assert.equal(b.metrics.noShows.recordedSessions, 11); assert.equal(b.metrics.noShows.previousRecordedSessions, 12);
  assert.equal(b.metrics.noShows.rate, 15 / 151);
  assert.equal(b.hasData, true); assert.equal(b.metrics.activePlayers.definition, DEFINITIONS.activePlayers);
});
test('summary all-time totals', /* from 2025-12-01 to 2026-10-05: active 209, held 186, cancelled 9, noShows 86, recorded 104, previousRange null */);
test('weekly last week', /* getWeekly default → 4 weeks, last = { weekStart:'2026-09-28', activePlayers:44, sessionsHeld:5, partial:false }, week of 09-21 has 45 */);
test('no-shows top player', /* default range → players[0].playerId === 'p046', noShows 2 */);
test('sessions drill-down count matches card', /* held.length === 20, cancelled.length === 0 */);
test('new club', async () => {
  const b = (await getSummary(db, 'club-002', {})).body as SummaryResponse;
  assert.equal(b.hasData, false); assert.deepEqual(b.range, { from: '2026-10-01', to: '2026-10-05' });
  assert.equal(b.previousRange, null); assert.equal(b.metrics.sessionsHeld.value, 0);
  assert.equal(b.metrics.activePlayers.value, 0); assert.equal(b.metrics.noShows.value, null);
});
test('unknown club → 404', async () => assert.equal((await getSummary(db, 'nope', {})).status, 404));
test('listClubs', /* 2 clubs, club-002 createdAt '2026-10-01', now '2026-10-05T02:00:00.000Z' */);
```

Note: `activePlayers.value` is a true `0` for the new club, because there are no sessions. The UI decides to show "Not yet" from `hasData: false`. The API keeps `null` only for unknown.

- [ ] **Step 2: Run** `pnpm tsx --test tests/ranges.test.ts tests/api/params.test.ts tests/api/service.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `lib/db.ts`, `lib/api-types.ts`, `lib/ranges.ts`, `lib/api/params.ts`, `lib/api/service.ts`, `tests/helpers/seeded-db.ts`.
- [ ] **Step 4: Run** the same tests and `pnpm test`. Expected: all PASS (seed tests still green).
- [ ] **Step 5: Commit** `feat(api): typed responses and metrics service`.

---

### Task 4: Route handlers

**Files:**
- Create: `app/api/clubs/route.ts`, `app/api/clubs/[clubId]/summary/route.ts`, `…/weekly/route.ts`, `…/players/route.ts`, `…/sessions/route.ts`, `…/no-shows/route.ts`
- Test: `tests/api/routes.test.ts`

**Interfaces:**
- Consumes: Task 3 service functions (which call `resolveRange`), `prisma` from `lib/db.ts`.
- Produces:
  - Each route: `export async function GET(req: NextRequest, ctx: RouteContext<'/api/clubs/[clubId]/summary'>)`. Read `req.nextUrl.searchParams`, call the service, `return Response.json(body, { status })`. No other logic. Reading the request makes the route dynamic under `cacheComponents`; don't add `use cache`.

- [ ] **Step 1: Write the failing tests.** `tests/api/routes.test.ts`: set `process.env.DATABASE_URL` from `setupSeededDb()` **before** dynamically importing the route modules, then:

```ts
test('GET summary 200 json', /* GET(new NextRequest('http://x/api/clubs/club-001/summary'), { params: Promise.resolve({ clubId: 'club-001' }) }) → status 200, body.metrics.sessionsHeld.value 20 */);
test('GET summary 400', /* ?from=2026-10-04&to=2026-09-01 → 400, body.error 'from must be on or before to' */);
test('unknown club → 404', …);  test('GET clubs lists two', …);
```

- [ ] **Step 2: Run** `pnpm tsx --test tests/api/routes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the six route files.
- [ ] **Step 4: Run** `pnpm test`. Expected: PASS. Then `pnpm db:seed && pnpm dev` and `curl -s 'localhost:3000/api/clubs/club-001/summary' | head -c 400`. Expected: JSON with `"sessionsHeld":{"value":20`.
- [ ] **Step 5: Commit** `feat(api): route handlers with range validation`.

---

### Task 5: Client data layer and formatting

**Files:**
- Modify: `package.json` (add `swr`, `recharts`, current stable versions)
- Create: `lib/client/api.ts`, `lib/format.ts`
- Test: `tests/format.test.ts`

**Interfaces:**
- Consumes: `lib/api-types.ts`, `lib/copy.ts`.
- Produces:
  - `lib/format.ts`:
    - `formatRange(r: DateRange): string`: `'7 Sep – 4 Oct'`, with years on both ends only when they differ in year: `'1 Dec 2025 – 5 Oct 2026'`.
    - `formatSessionTime(iso: string, timeZone: string): string`: `'Mon 28 Sep, 19:00'`.
    - `formatWeek(weekStart, weekEnd): string`: `'Mon 28 Sep – Sun 4 Oct'`.
    - `formatDelta(current: number | null, previous: number | null): { text: string; direction: 'up' | 'down' | 'flat' | 'none' }`.
    - `formatRate(rate: number | null): string`: `'10%'` / `'Unknown'`.
    - `formatLocalDate(d: LocalDate): string`: `'1 Oct 2026'`.
  - `lib/client/api.ts`: `apiUrl(path: string, q?: Partial<DateRange>): string` (omits empty params), `fetcher` (throws `Error(body.error)` on non-2xx), and `useClubs()`, `useSummary(clubId, q)`, `useWeekly(clubId, q)`, `usePlayers(clubId, q, enabled)`, `useSessions(…)`, `useNoShows(…)`. Each returns SWR's `{ data, error, isLoading, mutate }`. Pass a `null` key when `!enabled`, so drill-downs fetch only when opened.

- [ ] **Step 1: Write the failing tests:**

```ts
test('formatDelta up with pct', () => assert.deepEqual(formatDelta(89, 88), { text: '▲ +1 (1%)', direction: 'up' }));
test('formatDelta flat', () => assert.deepEqual(formatDelta(20, 20), { text: 'No change', direction: 'flat' }));
test('formatDelta from zero has no pct', () => assert.deepEqual(formatDelta(3, 0), { text: '▲ +3', direction: 'up' }));
test('formatDelta unknown', () => assert.deepEqual(formatDelta(15, null), { text: '—', direction: 'none' }));
test('formatSessionTime is club-local', () => assert.equal(formatSessionTime('2026-01-04T22:30:00Z', 'Asia/Ho_Chi_Minh'), 'Mon 5 Jan, 05:30'));
test('formatRange same year', () => assert.equal(formatRange({ from: '2026-09-07', to: '2026-10-04' }), '7 Sep – 4 Oct'));
test('formatRange cross year', () => assert.equal(formatRange({ from: '2025-12-01', to: '2026-10-05' }), '1 Dec 2025 – 5 Oct 2026'));
test('apiUrl omits empty', () => assert.equal(apiUrl('/api/clubs/club-001/summary', {}), '/api/clubs/club-001/summary'));
```

- [ ] **Step 2: Run** `pnpm tsx --test tests/format.test.ts`. Expected: FAIL.
- [ ] **Step 3:** `pnpm add swr recharts`, then implement both files (`Intl.DateTimeFormat('en-GB', { timeZone, … })`, `Math.round` for %).
- [ ] **Step 4: Run** `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(client): swr hooks and formatters`.

---

### Task 6: Page shell: header, URL state, metric cards

**Files:**
- Modify: `app/page.tsx` (replace the starter), `app/layout.tsx` (title "Club Insights", body background), `app/globals.css` (only if needed)
- Create: `app/_components/Dashboard.tsx`, `Header.tsx`, `ClubSwitcher.tsx`, `RangePicker.tsx`, `MetricCard.tsx`, `ErrorState.tsx`

**Interfaces:**
- Consumes: Task 5 hooks and formatters, `presets` from `lib/ranges.ts`, `COPY`.
- Produces: `Dashboard` holds `{ clubId, range?: DateRange, open: 'activePlayers' | 'sessionsHeld' | 'noShows' | null }`. Club and range come from the URL (`?club=&from=&to=`, read via `useSearchParams`, written via `router.replace`). `MetricCard` props: `{ label; value: string; delta?: { text; direction }; goodWhen: 'up' | 'down'; definition: string; extra?: ReactNode; onOpen(): void; disabled?: boolean }`.

- [ ] **Step 1:** Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` and `use-router.md`. `app/page.tsx` stays a server component that renders `<Suspense fallback={<skeleton/>}><Dashboard/></Suspense>`.
- [ ] **Step 2: Header.** `ClubSwitcher` is a `<select>` from `useClubs()`. Changing club sets `club` and drops `from`/`to`. A missing or unknown `club` falls back to the first club. `RangePicker` is a preset `<select>` plus two `<input type="date" max="2026-10-05">`; "Custom" is selected when the range matches no preset. Under them goes the line `vs {formatRange(previousRange)}`, or `COPY.noEarlierPeriod(...)`, plus "(previous period starts at club creation)" when `previousClipped`. Then `COPY.dataAsOf`: "Data as of Mon 5 Oct 2026, 09:00 (Ho Chi Minh City)". The range shown always comes from `summary.range`, so the default range comes from the API.
- [ ] **Step 3: Cards** (3-column grid on `md:`, stacked below it). The whole card is a `<button>`.
  - *Active players*: value plus `formatDelta`.
  - *Sessions held*: value, delta, and extra "+ N cancelled, not counted" when `cancelled > 0`.
  - *No-shows*: value or "Unknown". Extra lines: "Attendance taken at 11 of 20 sessions · 9 unknown", "Rate 10% (was 9%)", and the previous period's coverage "Previous period: 12 of 20".
  - Delta colour: green when the direction matches `goodWhen`, red when it's the opposite, grey otherwise.
- [ ] **Step 4: Loading and error.** Skeleton cards while `isLoading`. `ErrorState` shows the API's `error` text, a "Try again" button (`mutate()`) and a "Reset to default" link (`/?club=<id>`).
- [ ] **Step 5: Verify in a browser** (`pnpm dev`): default view shows 89 / 20 / 15 with deltas ▲ +1 (1%), No change, ▲ +1 (7%), and a no-show rate of 10% (was 9%). Then `/?club=club-001&from=2026-10-04&to=2026-09-01` shows the error message and the reset link, and `/?club=nope` falls back to club-001. Check at 375px wide: no horizontal scroll.
- [ ] **Step 6: Commit** `feat(ui): dashboard shell, range picker and metric cards`.

---

### Task 7: Weekly active-players chart

**Files:**
- Create: `app/_components/WeeklyChart.tsx`
- Modify: `app/_components/Dashboard.tsx`

**Interfaces:**
- Consumes: `useWeekly`, `formatWeek`, `COPY.weeklyNote`.

- [ ] **Step 1: Implement.** Recharts `ResponsiveContainer` > `BarChart` of `activePlayers`. Partial weeks get a lighter fill via `<Cell>`, plus a legend chip "Partial week". X ticks use `weekStart` as '28 Sep'. The custom tooltip shows `formatWeek`, "44 active players", "5 sessions held", and "Partial week: only {clipped dates} in range" when partial. Below the chart goes `COPY.weeklyNote`. Title: "Active players per week (Mon–Sun, Ho Chi Minh City time)", with the zone name derived from `club.timeZone`.
- [ ] **Step 2: Verify in a browser.** Default range shows 4 bars, the last at 44. Range `2026-09-30 → 2026-10-05` shows 2 partial bars. Check at 375px: the chart fits and ticks don't overlap (thin them with `interval="preserveStartEnd"` when there are many weeks).
- [ ] **Step 3: Commit** `feat(ui): weekly active players chart`.

---

### Task 8: Drill-down dialog

**Files:**
- Create: `app/_components/DrillDownDialog.tsx`, `PlayersTable.tsx`, `SessionsTable.tsx`, `NoShowsTable.tsx`
- Modify: `app/_components/Dashboard.tsx`

**Interfaces:**
- Consumes: `usePlayers` / `useSessions` / `useNoShows` with `enabled = open === key`, plus `formatSessionTime`.
- `DrillDownDialog` props: `{ open: boolean; title: string; subtitle: string /* range */; definition: string; onClose(): void; children }`. It uses the native `<dialog>` with `showModal()`/`close()`, syncs the `close` event to `onClose` (so Esc works), returns focus to the card that opened it, and shows a visible ✕ button. Laptop: fixed right panel `max-w-xl h-full`. Below `md:`: full screen.

- [ ] **Step 1: Implement the tables.**
  - **Players**: Name | Sessions played | Last played (`formatLocalDate`), with a footer "89 players".
  - **Sessions**: Date & time (club-local) | Session | Booked (`12/12`) | Attendance ("Taken · 1 absent" / "Not taken"). Then a "Cancelled (not counted)" section, shown only when non-empty.
  - **No-shows**: header "Only the 11 sessions with attendance taken are included." Rows are Name | "Absent 2 of 3 recorded sessions"; clicking a row expands its missed sessions (a `<details>`/`<summary>` element is fine).
  - Every table scrolls horizontally inside the dialog on phones, never the page.
- [ ] **Step 2: Verify in a browser.** On the default range, each panel's row count or sum matches its card (89 rows; 20 held; the absent counts sum to 15, top row p046 with 2). Check that Esc closes the panel and focus returns to the card, then repeat at 375px.
- [ ] **Step 3: Commit** `feat(ui): drill-down panels behind each number`.

---

### Task 9: New club state, README, final verification

**Files:**
- Create: `app/_components/EmptyClubBanner.tsx`
- Modify: `app/_components/Dashboard.tsx`, `MetricCard.tsx` usage, `WeeklyChart.tsx`, `README.md`

- [ ] **Step 1: New club.** When `summary.hasData === false`:
  - Show `EmptyClubBanner` with `COPY.newClubBanner`: "This club is just getting started: no sessions yet. Numbers will appear here after your first session. Create sessions in the Reclub app, and take attendance to get no-show numbers."
  - Cards: Sessions held shows `0`; Active players and No-shows show `COPY.notYet` with their definitions, plus the hints "Appears after your first session" and "Take attendance to see this". Cards are `disabled`, with no delta.
  - The chart shows empty axes with "Your first week will show here" and no bars.
  - The comparison line shows `COPY.noEarlierPeriod('1 Oct 2026')`.
- [ ] **Step 2: README.** Cover setup (`pnpm install`, `pnpm db:seed`, `pnpm dev`, `pnpm test`), the fixed "now", the endpoint list with query params and error codes, and the three definitions, copied from `lib/copy.ts`.
- [ ] **Step 3: Verify.** `pnpm test`, `pnpm lint` and `pnpm build` all succeed. In the browser, switch to Thảo Điền Tennis Club and check the banner, the `0` and "Not yet" values, and the empty chart at laptop width and at 375px. Grep shows no Prisma import under `app/` except `app/api/`: `grep -rn "lib/db\|generated/prisma" app --include=*.tsx` → no output.
- [ ] **Step 4: Commit** `feat(ui): new club page; docs: README`.
