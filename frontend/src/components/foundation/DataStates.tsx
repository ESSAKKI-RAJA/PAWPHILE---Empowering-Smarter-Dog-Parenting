/** DataStates.tsx — truthful loading/empty/error/offline/syncing states for BIN1. */
import React from 'react';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="rounded-lg border p-4 text-sm opacity-80">
      {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <p className="font-medium">{title}</p>
      {hint ? <p className="mt-1 text-sm opacity-70">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 opacity-80">{message}</p>
      {onRetry ? (
        <button onClick={onRetry} className="mt-2 rounded bg-red-600 px-3 py-1 text-white">
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function OfflineState({ pending }: { pending: number }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-medium">You are offline</p>
      <p className="mt-1 opacity-80">
        {pending > 0
          ? `${pending} change${pending === 1 ? '' : 's'} waiting to sync. They will be sent automatically when you reconnect — nothing is marked saved until the server confirms.`
          : 'Changes you make now will be queued and synced when you reconnect.'}
      </p>
    </div>
  );
}

export function SyncBadge({ state }: { state: 'synced' | 'pending' | 'syncing' | 'failed' | 'conflict' | 'offline' }) {
  const labels: Record<string, string> = {
    synced: 'Synced',
    pending: 'Pending sync',
    syncing: 'Syncing…',
    failed: 'Sync failed — will retry',
    conflict: 'Needs review — conflict',
    offline: 'Offline — queued',
  };
  return (
    <span className="inline-block rounded-full border px-2 py-0.5 text-xs" data-sync-state={state}>
      {labels[state]}
    </span>
  );
}

export const DataStates = { LoadingState, EmptyState, ErrorState, OfflineState, SyncBadge };
export default DataStates;
