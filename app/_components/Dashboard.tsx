'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { SummaryResponse } from '../../lib/api-types';
import { useClubs, useSummary } from '../../lib/client/api';
import { pickClub } from '../../lib/client/club';
import { requestedRange } from '../../lib/client/range';
import { todayLocal } from '../../lib/clock';
import { COPY, type MetricKey } from '../../lib/copy';
import { ComparisonCard } from './ComparisonCard';
import { presets as buildPresets } from '../../lib/ranges';
import type { DateRange } from '../../lib/time';
import { EmptyClubBanner } from './EmptyClubBanner';
import { ErrorState } from './ErrorState';
import { Header } from './Header';
import { MetricList, MetricListSkeleton, MetricRow } from './MetricList';
import { DashboardSkeleton } from './Skeleton';
import { WeeklyChart } from './WeeklyChart';
import { DrillDownDialog } from './DrillDownDialog';
import { NoShowsTable } from './NoShowsTable';
import { PlayersTable } from './PlayersTable';
import { SessionsTable } from './SessionsTable';
import { formatRange } from '../../lib/format';

export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const clubs = useClubs();
  const [open, setOpen] = useState<MetricKey | null>(null);

  // Club and range live in the URL. A missing or unknown club falls back to the first one; a
  // missing range becomes the default range (the API requires one).
  const picked = clubs.data ? pickClub(clubs.data.clubs, params.get('club')) : undefined;
  const club = picked && 'club' in picked ? picked.club : undefined;
  const q = club ? requestedRange(params.get('from'), params.get('to'), club.createdAt, todayLocal(club.timeZone)) : {};
  const range = q.from && q.to ? { from: q.from, to: q.to } : undefined;
  const summary = useSummary(club?.id, q);

  function navigate(next: { club: string; range?: DateRange }) {
    const sp = new URLSearchParams({ club: next.club });
    if (next.range) {
      sp.set('from', next.range.from);
      sp.set('to', next.range.to);
    }
    router.replace(`${pathname}?${sp}`, { scroll: false });
  }

  if (clubs.error) return <Shell><ErrorState message={clubs.error.message} onRetry={() => clubs.mutate()} resetHref="/" /></Shell>;
  if (picked && 'notFound' in picked)
    return (
      <Shell>
        <ErrorState message={`There's no club with the id “${picked.notFound}”. The link may be out of date.`} onRetry={() => clubs.mutate()} resetHref="/" />
      </Shell>
    );
  if (!club) return <DashboardSkeleton />;

  const today = todayLocal(club.timeZone);
  const s = summary.data && summary.data.club.id === club.id ? summary.data : undefined;

  return (
    <Shell>
      <Header
        clubs={clubs.data!.clubs}
        club={club}
        range={range}
        previous={s}
        presets={buildPresets(club.createdAt, today)}
        today={today}
        onClubChange={(id) => navigate({ club: id })}
        onRangeChange={(range) => navigate({ club: club.id, range })}
      />

      {s && !s.hasData && <EmptyClubBanner />}
      {summary.error ? (
        <ErrorState message={summary.error.message} onRetry={() => summary.mutate()} resetHref={`/?club=${encodeURIComponent(club.id)}`} />
      ) : !s ? (
        <MetricListSkeleton />
      ) : (
        <MetricList dimmed={summary.isValidating}>
          <Cards s={s} onOpen={setOpen} />
        </MetricList>
      )}
      {s && s.hasData && range && <ComparisonCard s={s} range={range} />}
      {!summary.error && <WeeklyChart clubId={club.id} timeZone={club.timeZone} q={q} empty={s ? !s.hasData : false} />}
      {s && range && (
        <DrillDownDialog
          open={open !== null}
          title={open ? TITLES[open] : ''}
          subtitle={`${s.club.name} · ${formatRange(range)}`}
          definition={open ? s.metrics[open].definition : ''}
          onClose={() => setOpen(null)}
        >
          {open === 'activePlayers' && <PlayersTable clubId={club.id} q={q} />}
          {open === 'sessionsHeld' && <SessionsTable clubId={club.id} timeZone={club.timeZone} q={q} />}
          {open === 'noShows' && <NoShowsTable clubId={club.id} timeZone={club.timeZone} q={q} />}
        </DrillDownDialog>
      )}
    </Shell>
  );
}

const TITLES: Record<MetricKey, string> = { activePlayers: 'Active players', sessionsHeld: 'Sessions held', noShows: 'No-shows' };

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">{children}</main>;
}

function Cards({ s, onOpen }: { s: SummaryResponse; onOpen(k: MetricKey): void }) {
  const { activePlayers: ap, sessionsHeld: sh, noShows: ns } = s.metrics;
  if (!s.hasData) return <NewClubCards s={s} />;
  const unknown = ns.value === null;
  return (
    <>
      <MetricRow label="Active players" definition={ap.definition} value={String(ap.value)} onOpen={() => onOpen('activePlayers')} />
      <MetricRow
        label="Sessions held"
        definition={sh.definition}
        value={String(sh.value)}
        note={sh.cancelled > 0 && `+ ${sh.cancelled} cancelled, not counted`}
        onOpen={() => onOpen('sessionsHeld')}
      />
      <MetricRow
        label="No-shows"
        definition={ns.definition}
        value={unknown ? COPY.unknown : String(ns.value)}
        muted={unknown}
        onOpen={() => onOpen('noShows')}
      />
    </>
  );
}

// A club that has never held a session: 0 sessions is a true zero; the other two can't be
// measured yet, so they say "Not yet" and what will make them appear. Nothing to drill into.
function NewClubCards({ s }: { s: SummaryResponse }) {
  const m = s.metrics;
  return (
    <>
      <MetricRow label="Active players" definition={m.activePlayers.definition} value={COPY.notYet} muted note="Appears after your first session." />
      <MetricRow label="Sessions held" definition={m.sessionsHeld.definition} value={String(m.sessionsHeld.value)} />
      <MetricRow label="No-shows" definition={m.noShows.definition} value={COPY.notYet} muted note="Take attendance at your sessions to see this." />
    </>
  );
}
