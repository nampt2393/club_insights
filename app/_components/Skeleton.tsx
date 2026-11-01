export function CardSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white p-5" aria-hidden>
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
      <div className="mt-6 h-3 w-full rounded bg-slate-100" />
      <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="h-24 animate-pulse rounded-xl bg-white" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </main>
  );
}
