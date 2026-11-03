export function EmptyClubBanner() {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-950 sm:p-5">
      <p className="font-semibold">This club is just getting started: no sessions yet.</p>
      <p className="mt-1 text-brand-900">Numbers will appear here after your first session. No-show numbers will show once attendance is taken.</p>
    </div>
  );
}
