# CSV → SQLite seed (Prisma 7) — design

## Intent

The Club Insights dashboard (see `Requirement.md`) reads one club's nine months of
activity from SQLite through a JSON API. This piece loads the four CSV files in
`data/` into that database.

The person this serves is a reviewer who has just cloned the repo. Success means:

```
pnpm install
pnpm db:seed
```

and they have a complete, correct database. No `.env` to create, no manual
migration step, no extra commands.

Trust matters more than cleverness: the host-facing numbers are computed later from
this data, and every on-screen definition must be checkable against the source rows.
So the seed is a faithful mirror of the CSVs.

## Goals

- One command (`pnpm db:seed`) takes a fresh clone to a fully loaded database.
- Re-running it gives the same result (idempotent).
- It is all-or-nothing: a failure leaves no half-loaded data.
- Data is stored exactly as the CSVs say, with correct types and correct handling of
  "unknown" values.

## Non-goals

- Defining metrics (active players, sessions held, no-shows), the API, or the screens.
- Precomputing or denormalising anything (weekly buckets, no-show flags, counts).
- Validating or "repairing" the data.

## Anti-goals (failure even if it technically runs)

- Turning an unknown attendance into `false`. A blank `attended` must become `NULL`.
- Altering, dropping or flagging rows the source contains (see "Known data facts").
- Requiring the reviewer to do anything beyond the one command after `pnpm install`.

## Constraints

- TypeScript, Next.js 16 (`node_modules/next/dist/docs/` is the reference — this is
  not the Next.js in training data), pnpm 10, Node 24.
- Prisma **7.10.1** for CLI, `@prisma/client` and `@prisma/adapter-better-sqlite3`
  (all pinned to 7 by the user). Prisma 7 conventions apply: `prisma-client`
  generator with explicit `output`, datasource URL configured in `prisma.config.ts`,
  driver adapter passed to `PrismaClient`.
- SQLite via `better-sqlite3` (already allowed in `pnpm-workspace.yaml`
  `onlyBuiltDependencies`).
- `.env*` is gitignored, so the seed must work with **no env file**: the database URL
  needs a working default (e.g. `file:./prisma/dev.db`), optionally overridable by
  `DATABASE_URL`.

## Source data (in `data/`)

| File | Rows | Columns |
|---|---|---|
| `clubs.csv` | 2 | club_id, name, time_zone, created_at |
| `players.csv` | 260 | player_id, club_id, name, joined_club_at |
| `sessions.csv` | 195 | session_id, club_id, title, starts_at, duration_minutes, places, status, attendance_recorded |
| `bookings.csv` | 1,893 | booking_id, session_id, player_id, booked_at, status, cancelled_at, attended |

Formats: timestamps are ISO-8601 UTC with `Z` (`2026-01-04T22:30:00Z`); `created_at`
and `joined_club_at` are date-only (`2025-12-01`); booleans are `true`/`false`;
`cancelled_at` and `attended` may be empty. Names contain Vietnamese diacritics
(UTF-8).

## Schema (decided with the user)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

enum SessionStatus {
  scheduled
  cancelled
}

enum BookingStatus {
  booked
  cancelled
}

model Club {
  id        String    @id          // "club-001"
  name      String
  timeZone  String                 // "Asia/Ho_Chi_Minh"
  createdAt DateTime               // date-only in CSV → 00:00 UTC
  players   Player[]
  sessions  Session[]
  @@map("clubs")
}

model Player {
  id           String    @id       // "p180"
  clubId       String
  name         String
  joinedClubAt DateTime            // date-only in CSV → 00:00 UTC
  club         Club      @relation(fields: [clubId], references: [id])
  bookings     Booking[]
  @@index([clubId])
  @@map("players")
}

model Session {
  id                 String        @id   // "s0001"
  clubId             String
  title              String
  startsAt           DateTime            // UTC
  durationMinutes    Int
  places             Int
  status             SessionStatus
  attendanceRecorded Boolean
  club               Club          @relation(fields: [clubId], references: [id])
  bookings           Booking[]
  @@index([clubId, startsAt])
  @@map("sessions")
}

model Booking {
  id          String        @id      // "b00001"
  sessionId   String
  playerId    String
  bookedAt    DateTime               // UTC
  status      BookingStatus
  cancelledAt DateTime?              // present only when status = cancelled
  attended    Boolean?               // NULL = unknown, never coerced to false
  session     Session       @relation(fields: [sessionId], references: [id])
  player      Player        @relation(fields: [playerId], references: [id])
  @@index([sessionId])
  @@index([playerId])
  @@map("bookings")
}
```

Relations: Club 1–n Player, Club 1–n Session, Session 1–n Booking, Player 1–n
Booking. A player belongs to exactly one club, as in the CSV.

Decided by the user:
- Primary keys are the CSV IDs as-is.
- Date-only fields (`created_at`, `joined_club_at`) are stored as `DateTime` at
  00:00 UTC.
- All timestamps stored in UTC; week bucketing in the club's time zone is a
  query-time concern, not a seed concern.

My calls (the user saw these in the proposed schema and did not object):
- No unique constraint on (sessionId, playerId) — cancel-then-rebook is plausible.
- No `onDelete: Cascade`; the seed deletes children before parents.
- Enums for the two `status` columns. If Prisma 7's SQLite connector rejects enums,
  fall back to `String` and note it.
- camelCase fields, snake_case plural table names via `@@map`; column names left
  camelCase (no per-field `@map`).

## Field mapping rules

- `true`/`false` → boolean. Empty `attended` → `NULL`. Empty `cancelled_at` → `NULL`.
- ISO UTC timestamps → `DateTime` unchanged.
- `YYYY-MM-DD` → `DateTime` at `YYYY-MM-DDT00:00:00Z`.
- `duration_minutes`, `places` → integers.
- `status` values → enum members of the same name.
- Strings copied verbatim (no trimming needed; the data has no stray whitespace).

## Seed behaviour

`pnpm db:seed` must, in order:

1. Ensure the database file and schema exist and match `schema.prisma`, using a
   **committed migration + `prisma migrate deploy`** (my call). Unlike `db push`,
   it never wipes existing data before the transaction, so the "previous data
   intact on failure" guarantee holds.
2. Ensure the Prisma client is generated.
3. In **one transaction**: delete all rows (bookings → sessions → players → clubs),
   then insert clubs → players → sessions → bookings.
4. Print one summary of row counts per table, e.g.
   `Seeded: 2 clubs, 260 players, 195 sessions, 1893 bookings`.

On any error, exit non-zero with a clear message and leave the previous data intact
(the transaction rolls back).

The seed prints **nothing about data quirks** — no warnings line (user's explicit
request).

## Known data facts (keep as-is — do not fix, drop, or warn)

Verified by profiling the CSVs on 2026-10-31. The seed loads all of these unchanged:

- 36 bookings (27 players) have `booked_at` 1–5 days before the player's
  `joined_club_at` (e.g. `b00021`, p072 joined 2026-01-10, booked 2026-01-05).
  Same count whether compared in UTC or local time. Kept unchanged, no warning.
- `attended` is blank for 894 bookings: 734 at sessions with
  `attendance_recorded = false`, and all 160 cancelled bookings. Only 86 recorded
  no-shows (`attended = false`) exist.
- 9 sessions are `cancelled`, none have bookings; six fall 14–21 Feb 2026 (Tết).
- "Early Bird Monday" starts 05:30 Monday local = 22:30 **Sunday** UTC. Relevant to
  later week bucketing, not to the seed.
- Two name collisions between distinct players: Trần Văn Nhi (p042, p072),
  Hoàng Văn Linh (p121, p183).
- 44 players have no bookings. `club-002` has no players, sessions or bookings.
- No session starts after "now" (Mon 5 Oct 2026 09:00 Asia/Ho_Chi_Minh);
  the last is 2026-10-04T11:00:00Z.
- Structurally clean: no duplicate IDs, no dangling foreign keys, no session
  overbooked, `cancelled_at` present iff `status = cancelled`.

## Acceptance checks

After `pnpm db:seed` on a fresh clone (no `.env`, no existing DB):

- Counts: 2 clubs, 260 players, 195 sessions, 1,893 bookings.
- `attended`: 913 true, 86 false, 894 NULL.
- `cancelledAt` non-null on exactly 160 bookings.
- `club-002` exists with zero related rows.
- `b00021.bookedAt` < its player's `joinedClubAt` (kept as-is).
- Running `pnpm db:seed` a second time yields identical counts.
- A player name with diacritics round-trips exactly (e.g. `p001` = `Trần Hữu Tú`).

## Left to the builder

- Where the seed script lives (e.g. `prisma/seed.ts`) and how it runs (Node 24
  type-stripping, `tsx`, or Prisma's `migrations.seed` in `prisma.config.ts`).
- CSV parsing library or hand-written parser (must handle UTF-8 and quoted fields
  correctly).
- Whether to insert with `createMany` or raw batched statements.
- Database file location and whether it's gitignored (it should not be committed).
- A shared `lib/prisma.ts` client singleton for the app is useful but optional here.
