'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { SummaryResponse } from '../../lib/api-types';
import { useClubs, useSummary } from '../../lib/client/api';
import { todayLocal } from '../../lib/clock';
import { COPY, type MetricKey } from '../../lib/copy';
import { formatDelta, formatRate } from '../../lib/format';
import { presets as buildPresets } from '../../lib/ranges';
import type { DateRange } from '../../lib/time';
import { EmptyClubBanner } from './EmptyClubBanner';
import { ErrorState } from './ErrorState';
import { Header } from './Header';
import { MetricCard } from './MetricCard';
import { CardSkeleton, DashboardSkeleton } from './Skeleton';
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
  // missing range lets the API choose its default, which we then display.
  const club = clubs.data?.clubs.find((c) => c.id === params.get('club')) ?? clubs.data?.clubs[0];
  const q = { from: params.get('from') ?? undefined, to: params.get('to') ?? undefined };
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
  if (!club) return <DashboardSkeleton />;

  const today = todayLocal(club.timeZone);
  const s = summary.data && summary.data.club.id === club.id ? summary.data : undefined;

  return (
    <Shell>
      <Header
        clubs={clubs.data!.clubs}
        club={club}
        info={s}
        presets={buildPresets(club.createdAt, today)}
        today={today}
        onClubChange={(id) => navigate({ club: id })}
        onRangeChange={(range) => navigate({ club: club.id, range })}
      />

      {s && !s.hasData && <EmptyClubBanner />}
      {summary.error ? (
        <ErrorState message={summary.error.message} onRetry={() => summary.mutate()} resetHref={`/?club=${encodeURIComponent(club.id)}`} />
      ) : !s ? (
        <div className="grid gap-4 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <section aria-label="Key numbers" className={`grid gap-4 md:grid-cols-3 ${summary.isValidating ? 'opacity-70' : ''}`}>
          <Cards s={s} onOpen={setOpen} />
        </section>
      )}
      {!summary.error && <WeeklyChart clubId={club.id} timeZone={club.timeZone} q={q} empty={s ? !s.hasData : false} />}
      {s && (
        <DrillDownDialog
          open={open !== null}
          title={open ? TITLES[open] : ''}
          subtitle={`${s.club.name} · ${formatRange(s.range)}`}
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
  const hasPrev = s.previousRange !== null;
  const unknown = ns.value === null;
  return (
    <>
      <MetricCard
        label="Active players"
        value={String(ap.value)}
        delta={hasPrev ? formatDelta(ap.value, ap.previous) : undefined}
        goodWhen="up"
        definition={ap.definition}
        onOpen={() => onOpen('activePlayers')}
      />
      <MetricCard
        label="Sessions held"
        value={String(sh.value)}
        delta={hasPrev ? formatDelta(sh.value, sh.previous) : undefined}
        goodWhen="up"
        definition={sh.definition}
        extra={sh.cancelled > 0 && <span className="text-slate-500">+ {sh.cancelled} cancelled, not counted</span>}
        onOpen={() => onOpen('sessionsHeld')}
      />
      <MetricCard
        label="No-shows"
        value={unknown ? COPY.unknown : String(ns.value)}
        muted={unknown}
        delta={hasPrev && !unknown ? formatDelta(ns.value, ns.previous) : undefined}
        goodWhen="down"
        definition={ns.definition}
        extra={
          <>
            <span>
              Attendance taken at <strong className="font-semibold tabular-nums">{ns.recordedSessions} of {ns.totalSessions}</strong> sessions
              {ns.totalSessions - ns.recordedSessions > 0 && (
                <span className="text-slate-500"> · {ns.totalSessions - ns.recordedSessions} unknown</span>
              )}
            </span>
            {!unknown && (
              <span className="text-slate-600">
                No-show rate <strong className="font-semibold tabular-nums">{formatRate(ns.rate)}</strong>
                {hasPrev && ns.previousRate !== null && <> (was {formatRate(ns.previousRate)})</>}
              </span>
            )}
            {hasPrev && ns.previousTotalSessions !== null && (
              <span className="text-xs text-slate-500">
                Previous period: attendance taken at {ns.previousRecordedSessions} of {ns.previousTotalSessions}
              </span>
            )}
          </>
        }
        onOpen={() => onOpen('noShows')}
      />
    </>
  );
}

// A club that has never held a session: 0 sessions is a true zero; the other two can't be
// measured yet, so they say "Not yet" and what will make them appear.
function NewClubCards({ s }: { s: SummaryResponse }) {
  const m = s.metrics;
  const noop = () => {};
  return (
    <>
      <MetricCard label="Active players" value={COPY.notYet} muted goodWhen="up" definition={m.activePlayers.definition}
        extra={<span className="text-slate-500">Appears after your first session.</span>} onOpen={noop} disabled />
      <MetricCard label="Sessions held" value={String(m.sessionsHeld.value)} goodWhen="up" definition={m.sessionsHeld.definition}
        onOpen={noop} disabled />
      <MetricCard label="No-shows" value={COPY.notYet} muted goodWhen="down" definition={m.noShows.definition}
        extra={<span className="text-slate-500">Take attendance at your sessions to see this.</span>} onOpen={noop} disabled />
    </>
  );
}
