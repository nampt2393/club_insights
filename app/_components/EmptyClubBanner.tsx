import { COPY } from '../../lib/copy';

export function EmptyClubBanner() {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950 sm:p-5">
      <p className="font-semibold">{COPY.newClubBanner.title}</p>
      <p className="mt-1 text-indigo-900">{COPY.newClubBanner.body}</p>
    </div>
  );
}
