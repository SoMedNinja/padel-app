-- Add idempotency and conflict-detection metadata for offline match submissions.
alter table public.matches
  add column if not exists client_submission_id text,
  add column if not exists client_payload_hash text;

-- We only enforce uniqueness when a client_submission_id exists.
create unique index if not exists matches_created_by_submission_uidx
  on public.matches (created_by, client_submission_id)
  where client_submission_id is not null;

comment on column public.matches.client_submission_id is
  'Client-generated idempotency key for mutation queue retries.';

comment on column public.matches.client_payload_hash is
  'Deterministic hash of submitted payload used to detect overwrite conflicts.';
