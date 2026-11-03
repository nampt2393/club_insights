import { MetricListSkeleton } from './MetricList';

export function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
      <div className="mt-6">
        <MetricListSkeleton />
      </div>
    </main>
  );
}
