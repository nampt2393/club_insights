// Input rows for the metric computations: one club's sessions with their bookings, as loaded
// from the database. Kept free of Prisma types so the computations are plain, testable functions.

export type BookingRow = {
  id: string;
  playerId: string;
  playerName: string;
  status: 'booked' | 'cancelled';
  attended: boolean | null; // null = attendance unknown
};

export type SessionRow = {
  id: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  places: number;
  status: 'scheduled' | 'cancelled';
  attendanceRecorded: boolean;
  bookings: BookingRow[];
};

export type { Window } from '../time';
