/**
 * syncQueue.ts — BIN1 operation-level offline sync.
 *
 * LOCAL OPERATION -> QUEUE (IndexedDB) -> UNIQUE OP ID -> SERVER ->
 * VALIDATION/AUTH -> TRANSACTION -> ACK -> RECONCILIATION.
 *
 * Guarantees:
 * - Every operation carries a stable client_operation_id (idempotency key).
 * - Retries reuse the same key: server returns the original ACK, no duplicates.
 * - UI states are truthful: pending | syncing | synced | failed | conflict | offline.
 */
import localforage from 'localforage';
import { foundationApi } from './foundationApi';

export type QueuedOpStatus = 'pending' | 'syncing' | 'acked' | 'failed' | 'conflict';

export interface QueuedOp {
  client_operation_id: string;
  petId: string;
  entity_type: string;
  payload: Record<string, unknown>;
  status: QueuedOpStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

const STORE_KEY = 'pawphile:v1:syncOps';

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadAll(): Promise<QueuedOp[]> {
  try {
    return (await localforage.getItem<QueuedOp[]>(STORE_KEY)) || [];
  } catch {
    return [];
  }
}

async function saveAll(ops: QueuedOp[]): Promise<void> {
  await localforage.setItem(STORE_KEY, ops);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(ops));
  } catch {
    /* quota — IndexedDB remains authoritative locally */
  }
}

export async function enqueueOperation(petId: string, entity_type: string, payload: Record<string, unknown>): Promise<QueuedOp> {
  const ops = await loadAll();
  const op: QueuedOp = {
    client_operation_id: uid(),
    petId,
    entity_type,
    payload,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  ops.push(op);
  await saveAll(ops);
  window.dispatchEvent(new CustomEvent('pawphile:sync-update'));
  // Best-effort immediate flush; caller must still render pending until ACK.
  void flushQueue().catch(() => undefined);
  return op;
}

export async function getPendingCount(): Promise<number> {
  const ops = await loadAll();
  return ops.filter((o) => o.status === 'pending' || o.status === 'failed' || o.status === 'syncing').length;
}

function backoffMs(attempts: number): number {
  return Math.min(30000, 1000 * 2 ** attempts);
}

/** Flush pending ops with exponential backoff. Returns ACKed count. */
export async function flushQueue(): Promise<{ acked: number; failed: number; conflicts: number }> {
  if (!navigator.onLine) return { acked: 0, failed: 0, conflicts: 0 };
  const ops = await loadAll();
  let acked = 0;
  let failed = 0;
  let conflicts = 0;
  let dirty = false;
  for (const op of ops) {
    if (op.status === 'acked' || op.status === 'conflict') continue;
    op.status = 'syncing';
    op.updatedAt = new Date().toISOString();
    try {
      const res = await foundationApi.syncOperation(op.petId, {
        client_operation_id: op.client_operation_id,
        entity_type: op.entity_type,
        payload: op.payload,
      });
      if (res.status === 'CONFLICT') {
        op.status = 'conflict';
        conflicts += 1;
      } else {
        op.status = 'acked';
        acked += 1;
      }
      dirty = true;
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      op.attempts += 1;
      op.lastError = err.message || 'Sync failed';
      if (err.status === 409) {
        op.status = 'conflict';
        conflicts += 1;
      } else {
        op.status = 'failed';
        failed += 1;
      }
      dirty = true;
      await new Promise((r) => setTimeout(r, backoffMs(op.attempts)));
    }
  }
  if (dirty) {
    await saveAll(ops);
    window.dispatchEvent(new CustomEvent('pawphile:sync-update'));
  }
  // Prune old ACKed ops to bound storage (keep last 100).
  const remaining = (await loadAll()).filter((o) => o.status !== 'acked');
  const ackedOps = (await loadAll()).filter((o) => o.status === 'acked').slice(-100);
  await saveAll([...remaining, ...ackedOps]);
  return { acked, failed, conflicts };
}

export async function getQueueSnapshot(): Promise<QueuedOp[]> {
  return loadAll();
}
