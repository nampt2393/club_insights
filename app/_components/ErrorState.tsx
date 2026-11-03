'use client';

export function ErrorState({ message, onRetry, resetHref }: { message: string; onRetry(): void; resetHref: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
      <p className="font-medium">We couldn’t load these numbers.</p>
      <p className="mt-1 text-rose-800">{message}</p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-accent px-4 py-2 font-semibold text-white hover:bg-accent/90"
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
