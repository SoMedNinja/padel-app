# Web match mutation queue inventory (`src/services/matchService.ts`)

## Queue lifecycle

1. The queue is persisted in browser `localStorage` under `match-mutation-queue-v1`.
2. Every queued item tracks `queueId`, `createdAt`, `attempts`, and the match payload array.
3. Queue processing runs when:
   - `matchService.initMutationQueue()` is called,
   - a user comes back online (window `online` listener), or
   - the 12s retry timer fires.

## Status model used by UI (`MatchSyncStatusBanner`)

- `synced`: no pending rows and no failed rows.
- `pending`: one or more queued writes with retry attempts below the failure threshold.
- `failed`: one or more queued writes with `attempts >= 3`.

The snapshot also exposes:

- `pendingCount`
- `failedCount`
- `lastError`
- `lastSyncedAt`

## Retry and failure semantics

- Offline detection is based on `navigator.onLine`.
- Retryable network signatures include text like `failed to fetch`, `network`, `offline`, `timeout`.
- On retryable errors, match writes are queued instead of being dropped.
- Queue processing is FIFO and stops on first error (to preserve write order).

## Conflict metadata and idempotency

- Each submitted match payload is enriched with:
  - `client_submission_id` (idempotency key)
  - `client_payload_hash` (deterministic payload fingerprint)
- On insert `23505` conflicts, the service fetches existing rows by `(created_by, client_submission_id)`.
- If payload hash differs, status is `conflict` and the queue entry is marked as failed for manual handling.
- If payload hash matches, it is treated as an already-synced duplicate retry.

## Note for non-coders

This queue means users can save matches without internet. The app keeps the write safely on the device, retries automatically, and warns only when a genuine data conflict or repeated sync failure needs human action.
