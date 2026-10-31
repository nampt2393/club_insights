-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinedClubAt" DATETIME NOT NULL,
    CONSTRAINT "players_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "places" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "attendanceRecorded" BOOLEAN NOT NULL,
    CONSTRAINT "sessions_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "bookedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "cancelledAt" DATETIME,
    "attended" BOOLEAN,
    CONSTRAINT "bookings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bookings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "players_clubId_idx" ON "players"("clubId");

-- CreateIndex
CREATE INDEX "sessions_clubId_startsAt_idx" ON "sessions"("clubId", "startsAt");

-- CreateIndex
CREATE INDEX "bookings_sessionId_idx" ON "bookings"("sessionId");

-- CreateIndex
CREATE INDEX "bookings_playerId_idx" ON "bookings"("playerId");
