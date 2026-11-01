import { Suspense } from 'react';
import { Dashboard } from './_components/Dashboard';
import { DashboardSkeleton } from './_components/Skeleton';

// The dashboard is a client component that reads club + range from the URL and fetches
// everything from /api. useSearchParams needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
