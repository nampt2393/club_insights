import type { ClubDto } from '../api-types';

/** The club named in the URL, the first club when none is named, or notFound for a stale/typo'd id. */
export function pickClub(clubs: ClubDto[], requested: string | null): { club: ClubDto } | { notFound: string } {
  if (!requested) return { club: clubs[0] };
  const club = clubs.find((c) => c.id === requested);
  return club ? { club } : { notFound: requested };
}
