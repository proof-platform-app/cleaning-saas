// mobile-cleaner/src/services/outbox.ts

import type { OutboxItem } from "../offline/types";

/**
 * OutboxService — thin abstraction over the offline outbox globals.
 *
 * Replaces direct `(global as any).outboxPeek / outboxShift` access in
 * JobDetailsScreen so the component is not coupled to runtime globals.
 *
 * The interface is intentionally minimal:
 * - peek() returns the next item without removing it.
 * - shift() removes the item that peek() last returned.
 *
 * ВАЖНО:
 * - Do not add retries or persistence here — that belongs in a future
 *   offline-queue phase.
 * - Never queue check-in / check-out items.
 */
export interface OutboxService {
  peek(): Promise<OutboxItem | null>;
  shift(): Promise<void>;
}

/**
 * defaultOutboxService wraps the current global outbox stubs.
 * It is a safe no-op when the globals have not been provided.
 */
export const defaultOutboxService: OutboxService = {
  peek: async () => {
    const fn = (global as any).outboxPeek;
    if (!fn) return null;
    return (await fn()) ?? null;
  },
  shift: async () => {
    const fn = (global as any).outboxShift;
    if (fn) await fn();
  },
};
