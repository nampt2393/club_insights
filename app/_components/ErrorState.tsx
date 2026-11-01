'use client';

export function ErrorState({ message, onRetry, resetHref }: { message: string; onRetry(): void; resetHref: string }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
      <p className="font-medium">We couldn’t load these numbers.</p>
      <p className="mt-1 text-rose-800">{message}</p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-white px-3 py-1.5 font-medium text-rose-900 shadow-sm ring-1 ring-rose-200 hover:bg-rose-100"
        >
          Try again
        </button>
        <a href={resetHref} className="px-1 py-1.5 font-medium underline underline-offset-2">
          Reset to default
        </a>
      </div>
    </div>
  );
}
