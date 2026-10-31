import path from 'node:path';
import type { PrismaClient } from '../../app/generated/prisma/client';
import { readCsv } from './csv';
import { toBooking, toClub, toPlayer, toSession } from './map';

export type SeedCounts = { clubs: number; players: number; sessions: number; bookings: number };

export async function seed(prisma: PrismaClient, dataDir: string): Promise<SeedCounts> {
  // Parse everything before touching the DB, so a bad file never starts a write.
  const load = (name: string) => readCsv(path.join(dataDir, `${name}.csv`));
  const clubs = load('clubs').map(toClub);
  const players = load('players').map(toPlayer);
  const sessions = load('sessions').map(toSession);
  const bookings = load('bookings').map(toBooking);

  return prisma.$transaction(
    async (tx) => {
      await tx.booking.deleteMany();
      await tx.session.deleteMany();
      await tx.player.deleteMany();
      await tx.club.deleteMany();

      await tx.club.createMany({ data: clubs });
      await tx.player.createMany({ data: players });
      await tx.session.createMany({ data: sessions });
      await tx.booking.createMany({ data: bookings });

      return {
        clubs: await tx.club.count(),
        players: await tx.player.count(),
        sessions: await tx.session.count(),
        bookings: await tx.booking.count(),
      };
    },
    { timeout: 30_000 },
  );
}
